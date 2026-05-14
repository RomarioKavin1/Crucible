import { readFile } from "node:fs/promises";
import yaml from "js-yaml";
import { z } from "zod";

export const RecipeSchema = z.object({
  name: z.string().min(1),
  model: z.object({
    provider: z.enum(["anthropic"]),
    id: z.string().min(1),
    api_key_env: z.string().min(1),
  }),
  system_prompt: z.string().min(1),
  budgets: z.object({
    llm_completions_per_tick: z.number().int().positive(),
    tool_calls_per_tick: z.number().int().positive(),
  }),
});

export type Recipe = z.infer<typeof RecipeSchema>;

export async function loadRecipe(filePath: string): Promise<Recipe> {
  const raw = await readFile(filePath, "utf8");
  return RecipeSchema.parse(yaml.load(raw));
}
