
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: React.ReactNode;
    bodyClassName?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, bodyClassName = '' }) => {
    return (
        <div className={`hig-list-section ${className}`} style={{ marginBottom: '20px' }}>
            {title && (
                typeof title === 'string' ? (
                    <div
                        style={{
                            font: '400 13px/18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                            color: 'var(--ios-secondaryLabel)',
                            textTransform: 'uppercase',
                            padding: '6px 20px 4px',
                            letterSpacing: '0.02em',
                        }}
                    >
                        {title}
                    </div>
                ) : (
                    <div className="px-5 py-2">
                        {title}
                    </div>
                )
            )}
            
            {children && (
                <div
                    className={bodyClassName}
                    style={{
                        background: 'var(--ios-secondarySystemGroupedBackground)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        margin: '0 16px',
                    }}
                >
                    <div className="p-3 md:p-4">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Card;
