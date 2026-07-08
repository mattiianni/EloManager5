import React, { useState, useMemo } from 'react';
import { Player } from '../types.ts';
import Modal from './ui/Modal.tsx';
import Button from './ui/Button.tsx';

interface PlayerPrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: Player[];
    onPrintAll: () => void;
    onPrintSelected: (selectedIds: string[]) => void;
}

export default function PlayerPrintModal({
    isOpen,
    onClose,
    players,
    onPrintAll,
    onPrintSelected
}: PlayerPrintModalProps) {
    const [phase, setPhase] = useState<1 | 2>(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter and sort players identically to other parts of the app
    const filteredPlayers = useMemo(() => {
        return players
            .filter(p => `${p.name} ${p.surname}`.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => b.currentElo - a.currentElo);
    }, [players, searchTerm]);

    const handlePrintAllPhase1 = () => {
        onPrintAll();
        onClose();
    };

    const handleSelectAll = () => {
        const newSet = new Set(selectedIds);
        filteredPlayers.forEach(p => newSet.add(p.id));
        setSelectedIds(newSet);
    };

    const handleDeselectAll = () => {
        const newSet = new Set(selectedIds);
        filteredPlayers.forEach(p => newSet.delete(p.id));
        setSelectedIds(newSet);
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handlePrintSelected = () => {
        onPrintSelected(Array.from(selectedIds));
        onClose();
    };

    // Reset state when opening/closing
    React.useEffect(() => {
        if (isOpen) {
            setPhase(1);
            setSearchTerm('');
            setSelectedIds(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    if (phase === 1) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Stampa Giocatori">
                <div className="flex flex-col space-y-4 pt-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 text-center">
                        Cosa desideri stampare?
                    </p>
                    <Button onClick={handlePrintAllPhase1} variant="primary" fullWidth size="lg">
                        Tutti i Giocatori ({players.length})
                    </Button>
                    <Button onClick={() => setPhase(2)} variant="secondary" fullWidth size="lg">
                        Scegli Giocatori...
                    </Button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Scegli Giocatori">
            <div className="flex flex-col space-y-4 pt-2">
                <input
                    type="text"
                    placeholder="Cerca giocatori..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />

                <div className="flex justify-between items-center text-sm px-1">
                    <button onClick={handleSelectAll} className="text-sky-600 dark:text-sky-400 font-medium hover:underline">
                        Seleziona Tutti
                    </button>
                    <button onClick={handleDeselectAll} className="text-gray-500 dark:text-gray-400 hover:underline">
                        Deseleziona Tutti
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-y-2 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredPlayers.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nessun giocatore trovato.</p>
                    ) : (
                        filteredPlayers.map(p => (
                            <label key={p.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent dark:border-gray-800">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.has(p.id)} 
                                    onChange={() => toggleSelection(p.id)} 
                                    className="form-checkbox h-5 w-5 rounded text-sky-500 bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-sky-500" 
                                />
                                <span className="text-base text-gray-900 dark:text-gray-100">{p.name} {p.surname} <span className="text-sm text-gray-500 dark:text-gray-400">({p.currentElo.toFixed(0)})</span></span>
                            </label>
                        ))
                    )}
                </div>

                <div className="pt-2 flex flex-col space-y-3">
                    <Button 
                        onClick={handlePrintSelected} 
                        variant="primary" 
                        fullWidth 
                        size="lg"
                        disabled={selectedIds.size === 0}
                    >
                        Stampa Selezionati ({selectedIds.size})
                    </Button>
                    <Button onClick={() => setPhase(1)} variant="secondary" fullWidth>
                        Indietro
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
