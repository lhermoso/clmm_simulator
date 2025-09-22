# CLMM Simulator

A professional-grade simulator for Concentrated Liquidity Market Making (CLMM) strategies, designed for analyzing SOL/USDC liquidity positions with sophisticated hedging capabilities.

## Overview

The CLMM Simulator provides traders and liquidity providers with a comprehensive tool to model and analyze concentrated liquidity positions. It calculates real-time profit & loss metrics, impermanent loss, fee earnings, and hedge effectiveness across multiple position ranges.

## Key Features

### 📊 Multi-Position Portfolio Management
- Manage up to 12 concurrent liquidity positions
- Customize capital allocation across positions
- Set individual range widths for each position
- Real-time portfolio aggregation and performance metrics

### 💹 Advanced P&L Analytics
- **Token Exposure Tracking**: Monitor exact TOKEN0/TOKEN1 composition
- **Impermanent Loss Calculation**: Compare against 50/50 HODL strategy
- **Fee Earnings Estimation**: Dynamic fee calculation based on range and time
- **Hedge P&L Analysis**: Track short position performance for delta-neutral strategies

### 🎯 Position Range Management
- Visual range indicators (IN RANGE / OUT RANGE)
- Capital efficiency metrics for concentrated positions
- Automatic token composition updates as price moves
- Range boundary calculations with customizable widths

### 🛡️ Hedging Capabilities
- Adjustable hedge percentage (0-100%)
- Real-time hedge P&L calculation
- Net position tracking after hedge adjustment
- Support for partial and full hedging strategies

## How It Works

### 1. Global Controls
- **Price Change**: Simulate TOKEN0 price movements from -50% to +200%
- **Hedge Level**: Set short position size to offset TOKEN0 exposure
- **Hold Period**: Calculate time-dependent fees (in days)
- **Notional Value**: Set total portfolio size in USD

### 2. Position Configuration
Each position can be configured with:
- **Capital Allocation**: Percentage of total portfolio
- **Range Width**: ±X% from current price
- **Custom Naming**: Label positions for easy tracking

### 3. Real-Time Calculations
The simulator continuously calculates:
- LP value changes based on price movements
- Token rebalancing within ranges
- Fee accumulation (higher for narrower ranges)
- Hedge effectiveness and net P&L

### 4. Portfolio Performance
Aggregated metrics include:
- Total net P&L (percentage and absolute USD)
- Average capital efficiency across positions
- Positions in/out of range status
- Capital allocation warnings

## Use Cases

### For Liquidity Providers
- Optimize range selection for maximum fee generation
- Balance between capital efficiency and range coverage
- Understand impermanent loss risks at different price levels

### For Hedge Fund Managers
- Design delta-neutral strategies with precise hedging
- Model portfolio behavior under various market scenarios
- Calculate risk-adjusted returns for LP strategies

### For DeFi Researchers
- Analyze concentrated liquidity dynamics
- Study the relationship between range width and returns
- Benchmark different position sizing strategies

## Understanding the Metrics

### Capital Efficiency
- Measures how much more liquidity you provide vs. full-range positions
- Higher efficiency = more fees per dollar deployed
- Only active when position is in range

### Impermanent Loss (IL)
- Compares LP value to simply holding tokens
- Negative IL means underperforming HODL strategy
- Offset by fee earnings and hedging

### Token Exposure
- Shows current TOKEN0 percentage in position
- 100% TOKEN0 when below range (all in base token)
- 0% TOKEN0 when above range (all in quote token)
- Dynamic mix when actively providing liquidity

### Hedge P&L
- Profit/loss from short TOKEN0 position
- Offsets losses when TOKEN0 price increases
- Reduces gains when TOKEN0 price decreases

## Quick Start

1. **Set Market Conditions**: Adjust price change to simulate market movement
2. **Configure Positions**: Allocate capital and set range widths
3. **Apply Hedging**: Set hedge percentage for risk management
4. **Analyze Results**: Review individual and portfolio P&L

## Interface Guide

### Color Coding
- 🟢 **Green**: Positive P&L or in-range positions
- 🔴 **Red**: Negative P&L or out-of-range positions
- 🟡 **Amber**: Warnings or important information
- 🔵 **Blue**: Neutral information or hedge-related data

### Quick Actions
- **RESET PRICE**: Return to initial price (0% change)
- **NO HEDGE**: Remove all hedging
- **EQUAL WEIGHT**: Distribute capital equally across positions

## Advanced Strategies

### Conservative Approach
- Wide ranges (±15-20%)
- Lower capital efficiency but more stable
- Minimal rebalancing required

### Aggressive Approach
- Narrow ranges (±2-5%)
- High capital efficiency and fee generation
- Requires active management and rebalancing

### Balanced Portfolio
- Mix of narrow, medium, and wide ranges
- Diversified risk exposure
- Captures fees while maintaining coverage

## Tips for Optimal Use

1. **Start with 3-4 positions** to understand portfolio dynamics
2. **Use 100% capital allocation** to avoid calculation errors
3. **Experiment with hedge ratios** to find your risk tolerance
4. **Monitor token composition** to understand rebalancing costs
5. **Consider time horizons** when evaluating fee earnings

## Risk Considerations

- Concentrated liquidity amplifies both gains and losses
- Positions out of range earn no fees
- Rebalancing incurs impermanent loss
- Hedging reduces upside but protects downside
- Past performance doesn't predict future results

---

Built for professional traders, liquidity providers, and DeFi enthusiasts seeking to optimize concentrated liquidity strategies.