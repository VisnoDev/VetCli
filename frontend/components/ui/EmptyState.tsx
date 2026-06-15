import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      {icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-canvas-sunken text-ink-faint mb-4" style={{ background: 'var(--canvas-sunken)' }}>
          {icon}
        </div>
      )}
      <p className="font-display font-bold text-ink">{title}</p>
      {description && <p className="text-sm text-ink-soft mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
