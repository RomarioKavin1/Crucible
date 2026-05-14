import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchBinanceKlines } from "./fetch-binance";

describe("fetchBinanceKlines", () => {
  beforeEach(() => { vi.stubGlobal("fetch", vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("paginates when window exceeds 1000 klines", async () => {
    const mockedFetch = vi.mocked(fetch);
    const row = (openTime: number) => [openTime, "1", "1.1", "0.9", "1.05", "1", openTime + 999, "0", 0, "0", "0", "0"];
    const page1 = Array.from({ length: 1000 }, (_, i) => row(1_000_000 + i * 1000));
    const page2 = Array.from({ length: 200 }, (_, i) => row(2_000_000 + i * 1000));
    mockedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify(page1)))
      .mockResolvedValueOnce(new Response(JSON.stringify(page2)));

    const rows = await fetchBinanceKlines({
      symbol: "ETHUSDT", interval: "1s",
      startMs: 1_000_000, endMs: 2_200_000,
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(1200);
  });

  it("stops paging when response is empty", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce(new Response(JSON.stringify([])));
    const rows = await fetchBinanceKlines({ symbol: "ETHUSDT", interval: "1s", startMs: 0, endMs: 1000 });
    expect(rows).toEqual([]);
  });

  it("throws on non-200 response", async () => {
    const mockedFetch = vi.mocked(fetch);
    mockedFetch.mockResolvedValueOnce(new Response("ratelimit", { status: 429 }));
    await expect(
      fetchBinanceKlines({ symbol: "ETHUSDT", interval: "1s", startMs: 0, endMs: 1000 })
    ).rejects.toThrow(/429/);
  });
});
