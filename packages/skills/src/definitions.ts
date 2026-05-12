export interface SkillDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: false;
  };
}

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  {
    name: "get_price",
    description: "Returns the current mid/bid/ask/last price.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_orderbook",
    description: "Returns the top-N levels of the order book.",
    parameters: {
      type: "object",
      properties: { depth: { type: "integer", minimum: 1, maximum: 50, default: 10 } },
      additionalProperties: false,
    },
  },
  {
    name: "get_recent_trades",
    description: "Returns the most recent N trades.",
    parameters: {
      type: "object",
      properties: { n: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      additionalProperties: false,
    },
  },
  {
    name: "get_news_feed",
    description: "Returns news headlines published since a given timestamp.",
    parameters: {
      type: "object",
      properties: { since_ts: { type: "string" } },
      additionalProperties: false,
    },
  },
  {
    name: "market_buy",
    description: "Place a market buy order.",
    parameters: {
      type: "object",
      properties: { qty: { type: "number", exclusiveMinimum: 0 } },
      required: ["qty"],
      additionalProperties: false,
    },
  },
  {
    name: "market_sell",
    description: "Place a market sell order.",
    parameters: {
      type: "object",
      properties: { qty: { type: "number", exclusiveMinimum: 0 } },
      required: ["qty"],
      additionalProperties: false,
    },
  },
  {
    name: "limit_order",
    description: "Place a limit order.",
    parameters: {
      type: "object",
      properties: {
        side: { type: "string", enum: ["buy", "sell"] },
        qty: { type: "number", exclusiveMinimum: 0 },
        price: { type: "number", exclusiveMinimum: 0 },
        ttl_ticks: { type: "integer", minimum: 1 },
      },
      required: ["side", "qty", "price"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_order",
    description: "Cancel an open order by id.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_position",
    description: "Returns the current signed position size.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_balance",
    description: "Returns the current cash balance.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_pnl",
    description: "Returns realized and unrealized PnL.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "journal_read",
    description: "Read a value from the agent's journal.",
    parameters: {
      type: "object",
      properties: { key: { type: "string" } },
      required: ["key"],
      additionalProperties: false,
    },
  },
  {
    name: "journal_write",
    description: "Write a value to the agent's journal.",
    parameters: {
      type: "object",
      properties: { key: { type: "string" }, note: { type: "string" } },
      required: ["key", "note"],
      additionalProperties: false,
    },
  },
];
