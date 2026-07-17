import React from 'react';

interface PageCardProps {
  children: React.ReactNode;
  nested?: boolean;
  className?: string;
}

export const PageCard: React.FC<PageCardProps> = ({ children, nested = false, className = '' }) => {
  if (nested) {
    return (
      <div className={`bg-transparent shadow-none ring-0 border-0 overflow-hidden ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        background: 'var(--ios-secondarySystemGroupedBackground)',
        borderRadius: '10px',
        overflow: 'hidden',
        margin: '0 16px',
        boxShadow: '0 1px 1px rgba(0, 0, 0, 0.04)',
        border: '0.5px solid var(--ios-separator)',
      }}
    >
      {children}
    </div>
  );
};

export default PageCard;
