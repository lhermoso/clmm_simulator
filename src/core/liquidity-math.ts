/**
 * Core mathematical functions for concentrated liquidity calculations
 */

/**
 * Calculate the actual value of an LP position at a given price
 */
export function calculateLPValue(
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

/**
 * Calculate TOKEN0 exposure percentage for a concentrated position
 */
export function calculateToken0Exposure(
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

/**
 * Calculate capital efficiency for concentrated position
 */
export function calculateCapitalEfficiency(halfRangePct: number, priceRatio: number): number {
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