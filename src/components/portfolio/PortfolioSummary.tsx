import { useSimulatorStore } from '../../store/useSimulatorStore';
import { usePositionCalculations } from '../../hooks/usePositionCalculations';

export function PortfolioSummary() {
  const {
    resetPrice,
    clearHedge,
    equalWeightPositions
  } = useSimulatorStore();

  const {
    positionRows,
    totalNetPct,
    totalNetAbs,
    capitalSum
  } = usePositionCalculations();

  return (
    <div className="w-full h-fit sticky top-4">
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
                {positionRows.reduce((s, r) => s + r.pnl.lpValueChange * r.capitalPct / 100, 0).toFixed(2)}%
              </span>
            </div>
            <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
              <span className="bb-data-label">TOKEN0 P&L</span>
              <span className="bb-data-value" style={{ color: 'var(--bb-blue)', marginTop: '4px' }}>
                {positionRows.reduce((s, r) => s + r.pnl.token0PnL * r.capitalPct / 100, 0).toFixed(2)}%
              </span>
            </div>
            <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
              <span className="bb-data-label">FEES</span>
              <span className="bb-value-positive" style={{ marginTop: '4px' }}>
                +{positionRows.reduce((s, r) => s + r.pnl.feesEarned * r.capitalPct / 100, 0).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bb-data-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--bb-border)' }}>
            <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
              <span className="bb-data-label">AVG EFFICIENCY</span>
              <span className="bb-data-value" style={{ marginTop: '4px' }}>
                {positionRows.filter(r => r.capitalPct > 0).reduce((s, r, _, arr) =>
                  s + r.capitalEfficiency / arr.length, 0
                ).toFixed(1)}x
              </span>
            </div>
            <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
              <span className="bb-data-label">POSITIONS IN RANGE</span>
              <span className="bb-data-value" style={{ marginTop: '4px' }}>
                {positionRows.filter(r => r.inside && r.capitalPct > 0).length} / {positionRows.filter(r => r.capitalPct > 0).length}
              </span>
            </div>
            <div className="bb-data-cell" style={{ flexDirection: 'column' }}>
              <span className="bb-data-label">HEDGE IMPACT</span>
              <span className="bb-data-value" style={{ color: 'var(--bb-blue)', marginTop: '4px' }}>
                {positionRows.reduce((s, r) => s + r.pnl.hedgePnL * r.capitalPct / 100, 0).toFixed(3)}%
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
              onClick={resetPrice}
              className="bb-button flex-1"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              RESET PRICE
            </button>
            <button
              onClick={clearHedge}
              className="bb-button flex-1"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              NO HEDGE
            </button>
            <button
              onClick={equalWeightPositions}
              className="bb-button flex-1"
              style={{ fontSize: '11px', padding: '4px 8px' }}
            >
              EQUAL WEIGHT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}