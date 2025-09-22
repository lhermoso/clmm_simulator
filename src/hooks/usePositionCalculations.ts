import { useMemo } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { PositionRow } from '../core/types';
import { calculateConcentratedPnL } from '../core/pnl-calculator';
import { calculateCapitalEfficiency } from '../core/liquidity-math';

export function usePositionCalculations() {
  const {
    positions,
    priceChangePct,
    hedgePct,
    holdDays,
    notional,
    benchmark
  } = useSimulatorStore();

  const ratio = useMemo(() => (100 + priceChangePct) / 100, [priceChangePct]);

  const positionRows: PositionRow[] = useMemo(() => {
    return positions.map((p, idx) => {
      const cap = Number(p.capitalPct) || 0;
      const hr = Math.max(0.1, Number(p.halfRangePct) || 0.1);

      const L = Math.max(1e-6, 1 - hr / 100);
      const U = 1 + hr / 100;
      const inside = ratio >= L && ratio <= U;

      // Calculate P&L components using core function
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
  }, [positions, ratio, holdDays, hedgePct, benchmark, notional]);

  const capitalSum = useMemo(
    () => positions.reduce((s, p) => s + (Number(p.capitalPct) || 0), 0),
    [positions]
  );

  const totalNetPct = useMemo(
    () => positionRows.reduce((s, r) => s + r.weightedNetPct, 0),
    [positionRows]
  );

  const totalNetAbs = useMemo(
    () => positionRows.reduce((s, r) => s + r.netAbs, 0),
    [positionRows]
  );

  return {
    positionRows,
    capitalSum,
    totalNetPct,
    totalNetAbs,
    ratio
  };
}