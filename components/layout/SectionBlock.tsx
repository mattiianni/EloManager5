import React from 'react';

interface SectionBlockProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionBlock: React.FC<SectionBlockProps> = ({ children, className = '' }) => {
  return <div className={`mb-6 last:mb-0 ${className}`}>{children}</div>;
};

export default SectionBlock;
