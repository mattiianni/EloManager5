import React from 'react';

interface MobilePageProps {
  children: React.ReactNode;
  className?: string;
}

export const MobilePage: React.FC<MobilePageProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
};

export default MobilePage;
