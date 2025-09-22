import { BenchmarkType, PnLComponents } from './types';
import { calculateLPValue, calculateToken0Exposure } from './liquidity-math';
import { clamp } from '../utils/math-helpers';

/**
 * Calculate P&L components for concentrated liquidity position
 */
export function calculateConcentratedPnL(
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