import { describe, it, expect } from "vitest";
import { loadRecipe, RecipeSchema } from "../src/recipe.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("recipe loader", () => {
  it("parses a valid recipe", async () => {
    const r = await loadRecipe(path.join(__dirname, "fixtures/baseline-recipe.yaml"));
    expect(r.name).toBe("baseline-claude");
    expect(r.model.provider).toBe("anthropic");
    expect(r.budgets.llm_completions_per_tick).toBe(3);
  });

  it("rejects an empty system prompt", () => {
    expect(() =>
      RecipeSchema.parse({
        name: "x",
        model: { provider: "anthropic", id: "x", api_key_env: "X" },
        system_prompt: "",
        budgets: { llm_completions_per_tick: 1, tool_calls_per_tick: 1 },
      })
    ).toThrow();
  });
});
