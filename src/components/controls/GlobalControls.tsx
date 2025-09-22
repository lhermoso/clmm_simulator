import { ChangeEvent } from 'react';
import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';

export function GlobalControls() {
  const {
    numPositions,
    priceChangePct,
    hedgePct,
    holdDays,
    notional,
    collapsed,
    setNumPositions,
    setPriceChangePct,
    setHedgePct,
    setHoldDays,
    setNotional,
    toggleSection
  } = useSimulatorStore();

  const handleNumPositionsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value || "1");
    setNumPositions(Math.min(12, Math.max(1, value)));
  };

  return (
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
              onChange={(e) => setPriceChangePct(parseFloat(e.target.value))}
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
              onChange={(e) => setHedgePct(parseFloat(e.target.value))}
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
                onChange={(e) => setHoldDays(parseInt(e.target.value || "0"))}
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
                onChange={(e) => setNotional(parseFloat(e.target.value || "0"))}
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
              onChange={handleNumPositionsChange}
            />
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}