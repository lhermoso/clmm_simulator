import { ChangeEvent } from 'react';
import { PositionRow } from '../../core/types';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { clamp } from '../../utils/math-helpers';

interface PositionCardProps {
  row: PositionRow;
  index: number;
}

export function PositionCard({ row, index }: PositionCardProps) {
  const { updatePosition } = useSimulatorStore();

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    updatePosition(index, { name: e.target.value });
  };

  const handleCapitalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = clamp(parseFloat(e.target.value || "0"), 0, 100);
    updatePosition(index, { capitalPct: v });
  };

  const handleRangeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    updatePosition(index, { halfRangePct: v });
  };

  return (
    <div className="bb-panel">
      {/* Position Header with Bloomberg style */}
      <div className="bb-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <input
          className="bb-input"
          style={{ background: 'transparent', border: 'none', color: 'var(--bb-amber)', fontWeight: 'bold', fontSize: '12px', width: '150px' }}
          value={row.name}
          placeholder="Position name"
          onChange={handleNameChange}
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
                value={row.capitalPct}
                onChange={handleCapitalChange}
              />
              <span className="bb-data-value">%</span>
            </div>
          </div>

          <div className="bb-data-cell" style={{ flexDirection: 'column', padding: '8px' }}>
            <span className="bb-data-label">RANGE WIDTH ±{row.halfRangePct.toFixed(1)}%</span>
            <input
              type="range"
              min={0.1}
              max={15}
              step={0.1}
              className="bb-slider"
              style={{ marginTop: '8px' }}
              value={row.halfRangePct}
              onChange={handleRangeChange}
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
}