
import React, { useEffect, useRef } from 'react';
import { MaterialIcon } from './Icons.tsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-[#020817]/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
            <div ref={modalRef} className="fade-in flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[rgba(15,23,42,0.94)] shadow-[0_28px_80px_rgba(15,23,42,0.08)] dark:shadow-[0_28px_80px_rgba(0,0,0,0.48)] backdrop-blur-[30px]">
                <header className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 p-4 md:p-5">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" aria-label="Close modal">
                        <MaterialIcon name="close" className="text-[20px]" />
                    </button>
                </header>
                <main className="overflow-y-auto p-4 md:p-6 text-slate-800 dark:text-slate-100">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Modal;
