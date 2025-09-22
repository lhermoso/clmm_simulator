import React, { useMemo, useState, useEffect, ChangeEvent } from "react";

// ===================== Type Definitions =====================
interface Position {
  name: string;
  capitalPct: number;
  halfRangePct: number;
}

interface PnLComponents {
  // Core Position
  token0Exposure: number;        // % of position in TOKEN0 (0-100)
  token0PnL: number;            // P&L from TOKEN0 price change
  rebalancingCost: number;      // Cost from automatic rebalancing (IL)
  feesEarned: number;           // Trading fees collected

  // Hedge Impact
  hedgePnL: number;             // P&L from SHORT position

  // Totals
  lpPnL: number;                // token0PnL + rebalancingCost + fees
  netPnL: number;               // lpPnL + hedgePnL

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

interface PositionRow {
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


// interface TokenAmounts {
//   x: number;
//   y: number;
// }

interface CollapsedSections {
  globalControls: boolean;
  positions: boolean;
}

type BenchmarkType = 'hodl5050' | 'hodlOptimal' | 'hodlInitial';

// ===================== Helpers =====================
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}


// ===================== Core Math (FIXED) =====================

// Calculate the actual value of an LP position at a given price
function calculateLPValue(
  sqrtPrice: number,
  sqrtPriceMin: number,
  sqrtPriceMax: number,
  unitLiquidity: number = 1
): number {
  if (sqrtPrice <= sqrtPriceMin) {
    // All in token0
    const x = unitLiquidity * (sqrtPriceMax - sqrtPriceMin) / (sqrtPriceMin * sqrtPriceMax);
    const y = 0;
    return x * sqrtPrice * sqrtPrice + y; // Convert to token1 terms
  } else if (sqrtPrice >= sqrtPriceMax) {
    // All in token1
    const x = 0;
    const y = unitLiquidity * (sqrtPriceMax - sqrtPriceMin);
    return x * sqrtPrice * sqrtPrice + y;
  } else {
    // In range - actively providing liquidity
    const x = unitLiquidity * (sqrtPriceMax - sqrtPrice) / (sqrtPrice * sqrtPriceMax);
    const y = unitLiquidity * (sqrtPrice - sqrtPriceMin);
    return x * sqrtPrice * sqrtPrice + y;
  }
}

// Calculate TOKEN0 exposure percentage for a concentrated position
function calculateToken0Exposure(
  sqrtPrice: number,
  sqrtPriceMin: number,
  sqrtPriceMax: number,
  unitLiquidity: number = 1
): number {
  if (sqrtPrice <= sqrtPriceMin) {
    // Below range: 100% token0
    return 100;
  } else if (sqrtPrice >= sqrtPriceMax) {
    // Above range: 0% token0 (all token1)
    return 0;
  } else {
    // In range: calculate actual token0 percentage
    const x = unitLiquidity * (sqrtPriceMax - sqrtPrice) / (sqrtPrice * sqrtPriceMax);
    const y = unitLiquidity * (sqrtPrice - sqrtPriceMin);
    const totalValue = x * sqrtPrice * sqrtPrice + y;
    const token0Value = x * sqrtPrice * sqrtPrice;
    return 100 * (token0Value / totalValue);
  }
}

// Calculate P&L components for concentrated liquidity position
function calculateConcentratedPnL(
  halfRangePct: number,
  priceRatio: number,  // P1/P0
  days: number,
  hedgePct: number,
  _benchmark: BenchmarkType = 'hodl5050'  // Prefixed with _ as currently not fully utilized
): PnLComponents {
  // Price bounds
  const hr = Math.max(0.1, Number(halfRangePct) || 0.1);
  const priceMin = Math.max(1e-6, 1 - hr / 100);
  const priceMax = 1 + hr / 100;

  const sqrtPriceMin = Math.sqrt(priceMin);
  const sqrtPriceMax = Math.sqrt(priceMax);
  const sqrtP0 = Math.sqrt(1); // Initial price = 1
  const sqrtP1 = Math.sqrt(priceRatio);

  // Calculate TOKEN0 exposure at initial and current prices
  const initialToken0Exposure = calculateToken0Exposure(sqrtP0, sqrtPriceMin, sqrtPriceMax);
  const currentToken0Exposure = calculateToken0Exposure(sqrtP1, sqrtPriceMin, sqrtPriceMax);

  // Price change percentage
  const priceChangePercent = (priceRatio - 1) * 100;

  // Calculate TOKEN0 P&L
  // Use average exposure for simplicity (could be more sophisticated)
  const avgToken0Exposure = (initialToken0Exposure + currentToken0Exposure) / 2;
  const token0PnL = (avgToken0Exposure / 100) * priceChangePercent;

  // Calculate total LP value change
  const lpValue0 = calculateLPValue(sqrtP0, sqrtPriceMin, sqrtPriceMax);
  const lpValue1 = calculateLPValue(sqrtP1, sqrtPriceMin, sqrtPriceMax);
  const totalLPChange = (lpValue1 / lpValue0 - 1) * 100;

  // Rebalancing cost (IL) = Total LP change - TOKEN0 P&L
  const rebalancingCost = totalLPChange - token0PnL;

  // Position status
  const isInRange = priceRatio >= priceMin && priceRatio <= priceMax;
  let tokenComposition = "";

  if (priceRatio < priceMin) {
    tokenComposition = "100% TOKEN0";
  } else if (priceRatio > priceMax) {
    tokenComposition = "100% TOKEN1";
  } else {
    tokenComposition = `${currentToken0Exposure.toFixed(0)}% TOKEN0`;
  }

  // Calculate fees (simplified model - only earned while in range)
  let feesEarned = 0;
  if (isInRange) {
    const baselineDaily = 0.74;
    const scale = clamp(1 / (hr / 1), 0.1, 10);
    const timeScale = Math.max(0, days);
    feesEarned = baselineDaily * scale * timeScale;
  }

  // LP P&L (before hedge)
  const lpPnL = token0PnL + rebalancingCost + feesEarned;

  // Hedge P&L (SHORT position)
  // Hedge amount is based on initial TOKEN0 exposure, not full notional
  // E.g., if position starts with 50% SOL, we only hedge $50k of a $100k position
  const hedgeFactor = clamp(hedgePct / 100, 0, 1);
  const hedgePnL = -priceChangePercent * (initialToken0Exposure / 100) * hedgeFactor;

  // Net P&L
  const netPnL = lpPnL + hedgePnL;

  // Legacy calculations for backward compatibility
  const hodl5050Return = (0.5 * 1 + 0.5 * priceRatio - 1) * 100;
  const ilVsHodl5050 = totalLPChange - hodl5050Return;
  const ilVsOptimal = totalLPChange - ((Math.max(1, priceRatio) - 1) * 100);

  // Legacy status fields
  let isRebalancing = isInRange;
  let exitedAt: number | undefined;
  let staticExposure = 0;

  if (priceRatio < priceMin) {
    isRebalancing = false;
    exitedAt = priceMin;
    staticExposure = (priceRatio / priceMin - 1) * 100;
  } else if (priceRatio > priceMax) {
    isRebalancing = false;
    exitedAt = priceMax;
    staticExposure = 0;
  }

  return {
    // Core metrics
    token0Exposure: currentToken0Exposure,
    token0PnL,
    rebalancingCost,
    feesEarned,
    hedgePnL,
    lpPnL,
    netPnL,
    isInRange,
    tokenComposition,

    // Legacy fields for UI compatibility
    ilVsHodl5050,
    lpValueChange: totalLPChange,
    netBeforeHedge: lpPnL,
    hedgeAdjustment: hedgePnL,
    isRebalancing,
    exitedAt,
    staticExposure,
    ilVsOptimal
  };
}

// Calculate capital efficiency for concentrated position
function calculateCapitalEfficiency(halfRangePct: number, priceRatio: number): number {
  const hr = Math.max(0.1, Number(halfRangePct) || 0.1);
  const priceMin = Math.max(1e-6, 1 - hr / 100);
  const priceMax = 1 + hr / 100;

  // Check if in range
  if (priceRatio < priceMin || priceRatio > priceMax) {
    return 0; // No capital efficiency when out of range
  }

  // Capital efficiency vs full range (approximate)
  // Narrower range = higher capital efficiency
  const rangeWidth = priceMax - priceMin;
  const fullRangeWidth = 1000; // Approximate "infinite" range
  const efficiency = Math.sqrt(fullRangeWidth / rangeWidth);

  return Math.min(efficiency, 100); // Cap at 100x
}

// ===================== Collapsible Section Component =====================
interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}

function CollapsibleSection({ title, isCollapsed, onToggle, children, badge }: CollapsibleSectionProps) {
  return (
    <div className="bb-panel">
      <button
        onClick={onToggle}
        className="w-full bb-panel-header flex items-center justify-between"
        style={{ padding: '8px 12px' }}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{title}</span>
          {badge && (
            <span className="bb-badge" style={{ marginLeft: '8px' }}>
              {badge}
            </span>
          )}
        </div>
      </button>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
        }`}
      >
        <div className="bb-panel-content">{children}</div>
      </div>
    </div>
  );
}

// ===================== Main Component =====================
export default function ConcentratedLPSimulator(): React.ReactElement {
  const [numPositions, setNumPositions] = useState<number>(3);
  const [positions, setPositions] = useState<Position[]>([
    { name: "Central", capitalPct: 50, halfRangePct: 7.5 },
    { name: "Coverage", capitalPct: 30, halfRangePct: 11.1 },
    { name: "Safe", capitalPct: 20, halfRangePct: 15.0 },
  ]);

  const [priceChangePct, setPriceChangePct] = useState<number>(0);
  const [hedgePct, setHedgePct] = useState<number>(65);
  const [holdDays, setHoldDays] = useState<number>(1);
  const [notional, setNotional] = useState<number>(100000);
  const [benchmark, setBenchmark] = useState<BenchmarkType>('hodl5050');

  const [collapsed, setCollapsed] = useState<CollapsedSections>({
    globalControls: false,
    positions: false,
  });

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
      try {
        setCollapsed(JSON.parse(saved));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save preferences
  const toggleSection = (section: keyof CollapsedSections) => {
    setCollapsed(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      localStorage.setItem('collapsedSections', JSON.stringify(newState));
      return newState;
    });
  };

  // Keep positions array length in sync with numPositions
  useEffect(() => {
    setPositions((prev) => {
      const next = [...prev];
      if (numPositions > prev.length) {
        for (let i = prev.length; i < numPositions; i++) {
          next.push({ name: `Position ${i + 1}`, capitalPct: 0, halfRangePct: 1 });
        }
      } else if (numPositions < prev.length) {
        next.length = numPositions;
      }
      return next;
    });
  }, [numPositions]);

  const capitalSum = positions.reduce((s, p) => s + (Number(p.capitalPct) || 0), 0);
  const ratio = useMemo<number>(() => (100 + priceChangePct) / 100, [priceChangePct]);

  const rows: PositionRow[] = positions.map((p, idx) => {
    const cap = Number(p.capitalPct) || 0;
    const hr = Math.max(0.1, Number(p.halfRangePct) || 0.1);

    const L = Math.max(1e-6, 1 - hr / 100);
    const U = 1 + hr / 100;
    const inside = ratio >= L && ratio <= U;

    // Calculate P&L components using new function
    const pnl = calculateConcentratedPnL(hr, ratio, holdDays, hedgePct, benchmark);
    const capitalEfficiency = calculateCapitalEfficiency(hr, ratio);

    const positionNotional = (cap / 100) * Math.max(0, Number(notional) || 0);
    const netAbs = positionNotional * (pnl.netPnL / 100);

    return {
      idx,
      name: p.name || `Position ${idx + 1}`,
      capitalPct: cap,
      halfRangePct: hr,
      pnl,
      inside,
      bounds: { L, U },
      capitalEfficiency,
      weightedNetPct: (cap / 100) * pnl.netPnL,
      netAbs
    };
  });

  const totalNetPct: number = rows.reduce((s, r) => s + r.weightedNetPct, 0);
  const totalNetAbs: number = rows.reduce((s, r) => s + r.netAbs, 0);

  return (
    <div className="bloomberg-terminal">
      {/* Header */}
      <header className="bb-header">
        <div className="flex items-center gap-4">
          <h1 className="bb-header-title">CLMM SIMULATOR</h1>
          <span className="bb-header-subtitle">SOL/USDC CONCENTRATED LIQUIDITY</span>
        </div>
        <div className="bb-header-info">
          <span className="bb-badge">
            P1/P0 = <span className="font-bold">{ratio.toFixed(3)}</span>
          </span>
          <select
            className="bb-select hidden"
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value as BenchmarkType)}
          >
            <option value="hodl5050">VS HODL 50/50</option>
            <option value="hodlOptimal">VS OPTIMAL</option>
            <option value="hodlInitial">VS INITIAL MIX</option>
          </select>
        </div>
      </header>

      {/* Main Content - Two Panel Layout */}
      <div className="flex gap-3 p-4" style={{ height: 'calc(100vh - 60px)' }}>

        {/* LEFT PANEL - Input Controls (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ maxWidth: '60%' }}>

          {/* Global Controls */}
          <CollapsibleSection
            title="Global Controls"
            isCollapsed={collapsed.globalControls}
            onToggle={() => toggleSection('globalControls')}
            badge={`${numPositions} positions`}
          >
            <div className="grid gap-4">
              {/* First Row: Price Change & Hedge */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Price Change: <span className="font-mono font-bold text-blue-600">{priceChangePct}%</span>
                  </label>
                  <input
                    type="range"
                    min={-50}
                    max={200}
                    step={1}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    value={priceChangePct}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPriceChangePct(parseFloat(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+200%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Hedge: <span className="font-mono font-bold text-purple-600">{hedgePct}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    value={hedgePct}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setHedgePct(parseFloat(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Second Row: Other Controls */}
              <div className="bb-data-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: '12px' }}>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">HOLD PERIOD</span>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      className="bb-input flex-1"
                      value={holdDays}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setHoldDays(Math.max(0, parseInt(e.target.value || "0")))}
                    />
                    <span style={{ color: 'var(--bb-gray)', fontSize: '11px' }}>DAYS</span>
                  </div>
                </div>

                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">NOTIONAL</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span style={{ color: 'var(--bb-gray)', fontSize: '11px' }}>$</span>
                    <input
                      type="number"
                      min={0}
                      className="bb-input flex-1"
                      value={notional}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setNotional(Math.max(0, Number(e.target.value) || 0))}
                    />
                  </div>
                </div>

                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label"># POSITIONS</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="bb-input mt-1"
                    value={numPositions}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNumPositions(clamp(parseInt(e.target.value || "1"), 1, 12))}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Positions */}
          <CollapsibleSection
            title="Positions"
            isCollapsed={collapsed.positions}
            onToggle={() => toggleSection('positions')}
            badge={capitalSum !== 100 ? `⚠️ ${capitalSum}%` : '100%'}
          >
            <div className="space-y-3">
              {positions.map((p, idx) => {
                const row = rows[idx];
                return (
                  <div key={idx} className="bb-panel">
                    {/* Position Header with Bloomberg style */}
                    <div className="bb-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <input
                        className="bb-input"
                        style={{ background: 'transparent', border: 'none', color: 'var(--bb-amber)', fontWeight: 'bold', fontSize: '12px', width: '150px' }}
                        value={p.name}
                        placeholder="Position name"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setPositions(prev => prev.map((pp, i) =>
                            i === idx ? { ...pp, name: e.target.value } : pp
                          ));
                        }}
                      />
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span className={row.inside ? 'bb-badge-success' : 'bb-badge-danger'}>
                          {row.inside ? 'IN RANGE' : 'OUT RANGE'}
                        </span>
                        {!row.pnl.isRebalancing && (
                          <span className="bb-badge-info" style={{ fontSize: '10px' }}>
                            {row.pnl.tokenComposition}
                          </span>
                        )}
                        <span className={row.pnl.netPnL >= 0 ? 'bb-value-positive' : 'bb-value-negative'}>
                          {row.pnl.netPnL >= 0 ? '+' : ''}{row.pnl.netPnL.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    <div className="bb-panel-content">
                      {/* Position Controls with Bloomberg data grid */}
                      <div className="bb-data-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '12px' }}>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '8px' }}>
                          <span className="bb-data-label">CAPITAL ALLOCATION</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="bb-input"
                              style={{ width: '80px' }}
                              value={p.capitalPct}
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const v = clamp(parseFloat(e.target.value || "0"), 0, 100);
                                setPositions(prev => prev.map((pp, i) =>
                                  i === idx ? { ...pp, capitalPct: v } : pp
                                ));
                              }}
                            />
                            <span className="bb-data-value">%</span>
                          </div>
                        </div>

                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '8px' }}>
                          <span className="bb-data-label">RANGE WIDTH ±{p.halfRangePct.toFixed(1)}%</span>
                          <input
                            type="range"
                            min={0.1}
                            max={15}
                            step={0.1}
                            className="bb-slider"
                            style={{ marginTop: '8px' }}
                            value={p.halfRangePct}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              const v = parseFloat(e.target.value);
                              setPositions(prev => prev.map((pp, i) =>
                                i === idx ? { ...pp, halfRangePct: v } : pp
                              ));
                            }}
                          />
                        </div>
                      </div>

                      {/* P&L Decomposition with Bloomberg grid */}
                      <div className="bb-data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '8px' }}>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">LP VALUE Δ</span>
                          <span className={row.pnl.lpValueChange >= 0 ? 'bb-value-positive' : 'bb-value-negative'}>
                            {row.pnl.lpValueChange >= 0 ? '+' : ''}{row.pnl.lpValueChange.toFixed(2)}%
                          </span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">IL VS HODL</span>
                          <span className={row.pnl.ilVsHodl5050 >= 0 ? 'bb-value-positive' : 'bb-value-negative'}>
                            {row.pnl.ilVsHodl5050 >= 0 ? '+' : ''}{row.pnl.ilVsHodl5050.toFixed(2)}%
                          </span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">FEES EARNED</span>
                          <span className="bb-value-positive">
                            +{row.pnl.feesEarned.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Additional Metrics */}
                      <div className="bb-data-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">EFFICIENCY</span>
                          <span className="bb-data-value">{row.capitalEfficiency.toFixed(1)}x</span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">RANGE</span>
                          <span className="bb-data-value" style={{ fontSize: '10px' }}>
                            {row.bounds.L.toFixed(3)}-{row.bounds.U.toFixed(3)}
                          </span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">HEDGE P&L</span>
                          <span className={row.pnl.hedgeAdjustment >= 0 ? 'bb-value-positive' : 'bb-value-negative'}>
                            {row.pnl.hedgeAdjustment >= 0 ? '+' : ''}{row.pnl.hedgeAdjustment.toFixed(2)}%
                          </span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">$ NET</span>
                          <span className={row.netAbs >= 0 ? 'bb-value-positive' : 'bb-value-negative'}>
                            ${Math.abs(row.netAbs).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '6px' }}>
                          <span className="bb-data-label">TOKEN0 EXP</span>
                          <span className="bb-data-value">{row.pnl.token0Exposure.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>

        {/* RIGHT PANEL - Output (Sticky) */}
        <div className="w-[40%] h-fit sticky top-4">
          <div className="bb-panel">
            <div className="bb-panel-header">PORTFOLIO PERFORMANCE</div>
            <div className="bb-panel-content">

              {/* Main P/L Display */}
              <div className="bb-data-grid" style={{ marginBottom: '16px' }}>
                <div className="bb-data-cell" style={{ padding: '16px', textAlign: 'center', flexDirection: 'column' }}>
                  <span className="bb-data-label" style={{ marginBottom: '8px' }}>NET P/L</span>
                  <div className={`${totalNetPct >= 0 ? 'bb-value-positive' : 'bb-value-negative'}`} style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {totalNetPct >= 0 ? '+' : ''}{totalNetPct.toFixed(3)}%
                  </div>
                  <div className={`${totalNetAbs >= 0 ? 'bb-value-positive' : 'bb-value-negative'}`} style={{ fontSize: '20px', marginTop: '4px' }}>
                    {totalNetAbs >= 0 ? '+' : '-'}${Math.abs(totalNetAbs).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>


              {/* P&L Components Breakdown */}
              <div className="bb-data-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '16px' }}>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">LP VALUE Δ</span>
                  <span className="bb-data-value" style={{ marginTop: '4px' }}>
                    {rows.reduce((s, r) => s + r.pnl.lpValueChange * r.capitalPct / 100, 0).toFixed(2)}%
                  </span>
                </div>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">TOKEN0 P&L</span>
                  <span className="bb-data-value" style={{ color: 'var(--bb-blue)', marginTop: '4px' }}>
                    {rows.reduce((s, r) => s + r.pnl.token0PnL * r.capitalPct / 100, 0).toFixed(2)}%
                  </span>
                </div>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">FEES</span>
                  <span className="bb-value-positive" style={{ marginTop: '4px' }}>
                    +{rows.reduce((s, r) => s + r.pnl.feesEarned * r.capitalPct / 100, 0).toFixed(2)}%
                  </span>
                </div>
              </div>



              {/* Summary Stats */}
              <div className="bb-data-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bb-border)' }}>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">AVG EFFICIENCY</span>
                  <span className="bb-data-value" style={{ marginTop: '4px' }}>
                    {rows.filter(r => r.capitalPct > 0).reduce((s, r, _, arr) =>
                      s + r.capitalEfficiency / arr.length, 0
                    ).toFixed(1)}x
                  </span>
                </div>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">POSITIONS IN RANGE</span>
                  <span className="bb-data-value" style={{ marginTop: '4px' }}>
                    {rows.filter(r => r.inside && r.capitalPct > 0).length} / {rows.filter(r => r.capitalPct > 0).length}
                  </span>
                </div>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">HEDGE IMPACT</span>
                  <span className="bb-data-value" style={{ color: 'var(--bb-blue)', marginTop: '4px' }}>
                    {rows.reduce((s, r) => s + r.pnl.hedgePnL * r.capitalPct / 100, 0).toFixed(3)}%
                  </span>
                </div>
                <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
                  <span className="bb-data-label">CAPITAL ALLOCATED</span>
                  <span className={`bb-data-value`} style={{
                    color: capitalSum !== 100 ? 'var(--bb-amber)' : 'var(--bb-green)',
                    marginTop: '4px'
                  }}>
                    {capitalSum}%
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bb-border)' }}>
                <button
                  onClick={() => setPriceChangePct(0)}
                  className="bb-button flex-1"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  RESET PRICE
                </button>
                <button
                  onClick={() => setHedgePct(0)}
                  className="bb-button flex-1"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  NO HEDGE
                </button>
                <button
                  onClick={() => {
                    const avgCapital = 100 / numPositions;
                    setPositions(prev => prev.map(p => ({ ...p, capitalPct: avgCapital })));
                  }}
                  className="bb-button flex-1"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                >
                  EQUAL WEIGHT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}