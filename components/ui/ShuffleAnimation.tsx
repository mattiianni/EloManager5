import React from 'react';

interface ShuffleAnimationProps {
    title?: string;
}

const ShuffleAnimation: React.FC<ShuffleAnimationProps> = ({ title = 'Generazione Coppie...' }) => {
    return (
        <>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loader-spinner {
                        border: 4px solid rgba(255, 255, 255, 0.2);
                        border-left-color: #38bdf8; /* sky-400 */
                        border-radius: 50%;
                        width: 80px;
                        height: 80px;
                        animation: spin 1.2s linear infinite;
                    }
                    
                    @keyframes progress-fill {
                        0% { width: 0%; }
                        100% { width: 100%; }
                    }

                    .progress-bar-inner {
                        height: 100%;
                        background-color: #0ea5e9; /* sky-500 */
                        border-radius: 2px;
                        animation: progress-fill 3s ease-out forwards;
                    }
                `}
            </style>
            <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
                <div className="loader-spinner mb-6"></div>
                <h2 className="text-2xl font-bold text-white mb-4 tracking-wider">{title}</h2>
                <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="progress-bar-inner"></div>
                </div>
            </div>
        </>
    );
};

export default ShuffleAnimation;
