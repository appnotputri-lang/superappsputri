import React, { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`max-w-7xl mx-auto w-full space-y-3.5 sm:space-y-4 px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${className}`}>
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
    <div className={`bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          {icon && (
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-[#0c2444] text-white flex items-center justify-center shrink-0 shadow-sm">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {description && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 sm:self-center shrink-0">
            {actions}
          </div>
        )}
      </div>
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
