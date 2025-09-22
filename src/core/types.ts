export interface Position {
  name: string;
  capitalPct: number;
  halfRangePct: number;
}

export interface PnLComponents {
  // Core Position
  token0Exposure: number;        // % of position in TOKEN0 (0-100)
  token0PnL: number;             // P&L from TOKEN0 price change
  rebalancingCost: number;       // Cost from automatic rebalancing (IL)
  feesEarned: number;            // Trading fees collected

  // Hedge Impact
  hedgePnL: number;              // P&L from SHORT position

  // Totals
  lpPnL: number;                 // token0PnL + rebalancingCost + fees
  netPnL: number;                // lpPnL + hedgePnL

  // Status
  isInRange: boolean;
  tokenComposition: string;

  // Legacy fields (for UI compatibility)
  ilVsHodl5050: number;
  lpValueChange: number;
  netBeforeHedge: number;
  hedgeAdjustment: number;
  isRebalancing: boolean;
  exitedAt?: number;
  staticExposure: number;
  ilVsOptimal: number;
}

export interface PositionRow {
  idx: number;
  name: string;
  capitalPct: number;
  halfRangePct: number;
  pnl: PnLComponents;
  inside: boolean;
  bounds: { L: number; U: number };
  capitalEfficiency: number;
  weightedNetPct: number;
  netAbs: number;
}

export type BenchmarkType = 'hodl5050' | 'hodlOptimal' | 'hodlInitial';

export interface SimulatorConfig {
  numPositions: number;
  priceChangePct: number;
  hedgePct: number;
  holdDays: number;
  notional: number;
  benchmark: BenchmarkType;
}

export interface CollapsedSections {
  globalControls: boolean;
  positions: boolean;
}