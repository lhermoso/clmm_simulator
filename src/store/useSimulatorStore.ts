import { create } from 'zustand';
import { Position, BenchmarkType, CollapsedSections } from '../core/types';

interface SimulatorStore {
  // State
  numPositions: number;
  positions: Position[];
  priceChangePct: number;
  hedgePct: number;
  holdDays: number;
  notional: number;
  benchmark: BenchmarkType;
  collapsed: CollapsedSections;

  // Actions
  setNumPositions: (num: number) => void;
  setPositions: (positions: Position[]) => void;
  updatePosition: (index: number, position: Partial<Position>) => void;
  setPriceChangePct: (pct: number) => void;
  setHedgePct: (pct: number) => void;
  setHoldDays: (days: number) => void;
  setNotional: (amount: number) => void;
  setBenchmark: (benchmark: BenchmarkType) => void;
  toggleSection: (section: keyof CollapsedSections) => void;
  resetPrice: () => void;
  clearHedge: () => void;
  equalWeightPositions: () => void;
}

const DEFAULT_POSITIONS: Position[] = [
  { name: "Central", capitalPct: 50, halfRangePct: 7.5 },
  { name: "Coverage", capitalPct: 30, halfRangePct: 11.1 },
  { name: "Safe", capitalPct: 20, halfRangePct: 15.0 },
];

// Load saved preferences from localStorage
const loadCollapsedState = (): CollapsedSections => {
  try {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return {
    globalControls: false,
    positions: false,
  };
};

export const useSimulatorStore = create<SimulatorStore>((set, get) => ({
  // Initial state
  numPositions: 3,
  positions: DEFAULT_POSITIONS,
  priceChangePct: 0,
  hedgePct: 65,
  holdDays: 1,
  notional: 100000,
  benchmark: 'hodl5050',
  collapsed: loadCollapsedState(),

  // Actions
  setNumPositions: (num) => {
    set((state) => {
      const positions = [...state.positions];

      if (num > positions.length) {
        // Add new positions
        for (let i = positions.length; i < num; i++) {
          positions.push({
            name: `Position ${i + 1}`,
            capitalPct: 0,
            halfRangePct: 1
          });
        }
      } else if (num < positions.length) {
        // Remove positions
        positions.length = num;
      }

      return { numPositions: num, positions };
    });
  },

  setPositions: (positions) => set({ positions }),

  updatePosition: (index, updates) => {
    set((state) => ({
      positions: state.positions.map((pos, i) =>
        i === index ? { ...pos, ...updates } : pos
      )
    }));
  },

  setPriceChangePct: (priceChangePct) => set({ priceChangePct }),

  setHedgePct: (hedgePct) => set({ hedgePct }),

  setHoldDays: (holdDays) => set({ holdDays: Math.max(0, holdDays) }),

  setNotional: (notional) => set({ notional: Math.max(0, notional) }),

  setBenchmark: (benchmark) => set({ benchmark }),

  toggleSection: (section) => {
    set((state) => {
      const newCollapsed = {
        ...state.collapsed,
        [section]: !state.collapsed[section]
      };

      // Save to localStorage
      localStorage.setItem('collapsedSections', JSON.stringify(newCollapsed));

      return { collapsed: newCollapsed };
    });
  },

  resetPrice: () => set({ priceChangePct: 0 }),

  clearHedge: () => set({ hedgePct: 0 }),

  equalWeightPositions: () => {
    const { numPositions } = get();
    const avgCapital = 100 / numPositions;

    set((state) => ({
      positions: state.positions.map(pos => ({
        ...pos,
        capitalPct: avgCapital
      }))
    }));
  }
}));