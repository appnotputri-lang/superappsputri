import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full max-w-full min-w-0 space-y-3.5 sm:space-y-4 px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
    >
      {children}
    </div>
  );
};

interface PageHeaderProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}>
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-normal">{title}</h1>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:self-center shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
};

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center flex flex-col items-center justify-center space-y-3 ${className}`}>
      {icon && (
        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-lg">
          {icon}
        </div>
      )}
      <div className="max-w-md">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
};
