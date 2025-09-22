import { usePositionCalculations } from '../../hooks/usePositionCalculations';

export function Header() {
  const { ratio } = usePositionCalculations();

  return (
    <header className="bb-header">
      <div className="flex items-center gap-4">
        <h1 className="bb-header-title">CLMM SIMULATOR</h1>
        <span className="bb-header-subtitle">SOL/USDC CONCENTRATED LIQUIDITY</span>
      </div>
      <div className="bb-header-info">
        <span className="bb-badge">
          P1/P0 = <span className="font-bold">{ratio.toFixed(3)}</span>
        </span>
      </div>
    </header>
  );
}