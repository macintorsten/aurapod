import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'fa-inbox',
  title, 
  description, 
  action 
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-800/40 rounded-3xl flex items-center justify-center mb-6">
        <i className={`fa-solid ${icon} text-3xl text-zinc-300 dark:text-zinc-700`}></i>
      </div>
      <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-6">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
