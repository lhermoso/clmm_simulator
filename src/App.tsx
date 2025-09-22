import React from 'react';
import { Header } from './components/layout/Header';
import { GlobalControls } from './components/controls/GlobalControls';
import { PositionList } from './components/positions/PositionList';
import { PortfolioSummary } from './components/portfolio/PortfolioSummary';

export default function ConcentratedLPSimulator(): React.ReactElement {
  return (
    <div className="bloomberg-terminal">
      <Header />

      {/* Main Content - Two Panel Layout */}
      <div className="flex gap-3 p-4" style={{ height: 'calc(100vh - 60px)' }}>

        {/* LEFT PANEL - Input Controls (Scrollable) */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ maxWidth: '60%' }}>
          <GlobalControls />
          <PositionList />
        </div>

        {/* RIGHT PANEL - Output (Sticky) */}
        <div className="w-[40%] h-fit sticky top-4">
          <PortfolioSummary />
        </div>
      </div>
    </div>
  );
}