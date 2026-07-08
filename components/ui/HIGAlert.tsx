import React, { useEffect, useState } from 'react';

export interface HIGAlertAction {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress: () => void;
}

export interface HIGAlertProps {
  isOpen: boolean;
  title: string;
  message?: string;
  actions: HIGAlertAction[];
}

export const HIGAlert: React.FC<HIGAlertProps> = ({ isOpen, title, message, actions }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      // Small delay to ensure we capture the active element before showing alert
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = () => {
    const cancelAction = actions.find(a => a.style === 'cancel');
    if (cancelAction) {
      cancelAction.onPress();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        const cancelAction = actions.find(a => a.style === 'cancel');
        if (cancelAction) {
          cancelAction.onPress();
        } else if (actions.length > 0) {
          actions[0].onPress();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actions]);

  if (!shouldRender) return null;

  // Ensure cancel is always at the bottom
  const sortedActions = [...actions].sort((a, b) => {
    if (a.style === 'cancel') return 1;
    if (b.style === 'cancel') return -1;
    return 0;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isAnimating ? 1 : 0,
        transition: 'opacity 200ms ease-out',
      }}
      onClick={handleBackdropClick}
    >
      <div
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the alert itself
        style={{
          width: 'min(270px, calc(100vw - 48px))',
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'var(--ios-thickMaterial)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          transform: isAnimating ? 'scale(1)' : 'scale(1.05)',
          transition: 'transform 200ms ease-out',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ padding: message ? '20px 16px 4px' : '20px 16px' }}>
          <div
            style={{
              font: '600 17px/22px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              color: 'var(--ios-label)',
              textAlign: 'center',
            }}
          >
            {title}
          </div>
        </div>

        {message && (
          <div
            style={{
              font: '400 13px/18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
              color: 'var(--ios-secondaryLabel)',
              textAlign: 'center',
              padding: '4px 16px 20px',
            }}
          >
            {message}
          </div>
        )}

        <div style={{ borderTop: '0.5px solid var(--ios-separator)' }}>
          {sortedActions.map((action, index) => {
            const isCancel = action.style === 'cancel';
            const isDestructive = action.style === 'destructive';
            
            return (
              <button
                key={index}
                onClick={action.onPress}
                className="hig-alert-button"
                style={{
                  width: '100%',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: `${isCancel ? '600' : '400'} 17px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif`,
                  color: isDestructive ? 'var(--ios-systemRed)' : 'var(--ios-systemBlue)',
                  background: 'transparent',
                  border: 'none',
                  borderTop: index > 0 ? '0.5px solid var(--ios-separator)' : 'none',
                  cursor: 'pointer',
                  padding: '11px 16px',
                }}
                onPointerDown={(e) => {
                  e.currentTarget.style.background = 'var(--ios-quaternarySystemFill)';
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onPointerLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
