import { useSimulatorStore } from '../../store/useSimulatorStore';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { PositionCard } from './PositionCard';
import { usePositionCalculations } from '../../hooks/usePositionCalculations';

export function PositionList() {
  const { collapsed, toggleSection } = useSimulatorStore();
  const { positionRows, capitalSum } = usePositionCalculations();

  return (
    <CollapsibleSection
      title="Positions"
      isCollapsed={collapsed.positions}
      onToggle={() => toggleSection('positions')}
      badge={capitalSum !== 100 ? `⚠️ ${capitalSum}%` : '100%'}
    >
      <div className="space-y-3">
        {positionRows.map((row) => (
          <PositionCard key={row.idx} row={row} index={row.idx} />
        ))}
      </div>
    </CollapsibleSection>
  );
}