import React from 'react';
import ThemeToggle from '../ui/ThemeToggle.tsx';
import { useAuth } from '../../hooks/useAuth.tsx';
import { APP_MONTH, APP_VERSION } from '../../constants.ts';

interface HeaderProps {
    toggleSidebar: () => void;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, theme, toggleTheme }) => {
    const { logout, workspace } = useAuth();

    return (
        <header 
            className="sticky top-0 z-20 flex items-center justify-between px-4"
            style={{
                height: 'calc(70px + env(safe-area-inset-top, 0px))', // Slightly increased height for mobile
                paddingTop: 'env(safe-area-inset-top, 0px)',
                background: 'var(--ios-thickMaterial)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderBottom: '0.5px solid var(--ios-separator)',
            }}
        >
            {/* Left Action (Sidebar Toggle on Mobile) */}
            <div className="flex flex-1 justify-start">
                <button
                    onClick={toggleSidebar}
                    className="flex items-center justify-center text-ios-blue md:hidden focus:outline-none"
                    aria-label="Toggle sidebar"
                >
                    <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'wght' 400" }}>menu</span>
                </button>
            </div>

            {/* Center Title & Subtitle */}
            <div className="flex-[2] flex flex-col items-center justify-center text-center">
                <div className="flex justify-center items-center w-full mb-0.5">
                    <img 
                        src="/elomanager_w.png" 
                        alt="Padel Elo Manager" 
                        className="h-8 md:h-10 w-auto object-contain block dark:hidden" 
                    />
                    <img 
                        src="/elomanager.png" 
                        alt="Padel Elo Manager" 
                        className="h-8 md:h-10 w-auto object-contain hidden dark:block" 
                    />
                </div>
                <div className="sf-caption2 text-ios-label-secondary truncate w-full mt-0.5" style={{ fontSize: '13px', lineHeight: '15px' }}>
                    v{APP_VERSION} / {APP_MONTH}{workspace ? ` • ${workspace.name}` : ''}
                </div>
            </div>

            {/* Right Actions */}
            <div className="flex flex-1 justify-end items-center flex-row gap-2 md:gap-3">
                <div className="scale-75 origin-right md:scale-100">
                    <ThemeToggle theme={theme} onToggle={toggleTheme} />
                </div>
                <button
                    onClick={() => {
                        if (window.confirm('Sei sicuro di voler uscire?')) {
                            logout();
                        }
                    }}
                    className="flex items-center justify-center text-ios-blue focus:outline-none pr-1 md:pr-0"
                    title="Esci"
                    aria-label="Logout"
                >
                    <span className="material-symbols-outlined text-[20px] md:text-[22px]">logout</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
