// Thin re-export so existing callers keep working.
// The rail is now fully client-side (polls /api/recent-runs every 15s)
// so it always shows the freshest on-chain runs, not ISR-cached data.
export { RecentRunsRail as RecentRunsFeed } from "./RecentRunsRail";
