import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}

export function CollapsibleSection({
  title,
  isCollapsed,
  onToggle,
  children,
  badge
}: CollapsibleSectionProps) {
  return (
    <div className="bb-panel">
      <button
        onClick={onToggle}
        className="w-full bb-panel-header flex items-center justify-between"
        style={{ padding: '8px 12px' }}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{title}</span>
          {badge && (
            <span className="bb-badge" style={{ marginLeft: '8px' }}>
              {badge}
            </span>
          )}
        </div>
      </button>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
        }`}
      >
        <div className="bb-panel-content">{children}</div>
      </div>
    </div>
  );
}