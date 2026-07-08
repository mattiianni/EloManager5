import React from 'react';
import { SimilarityResult } from '../hooks/usePlayerSimilarity';

interface PlayerSimilarityModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidates: SimilarityResult[];
    onSelect: (player: SimilarityResult['player']) => void;
    onCreateNew: () => void;
    inputName: string;
    inputSurname: string;
}

const PlayerSimilarityModal: React.FC<PlayerSimilarityModalProps> = ({
    isOpen,
    onClose,
    candidates,
    onSelect,
    onCreateNew,
    inputName,
    inputSurname
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-ios-bg dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-ios-separator dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-center">Giocatore Esistente Trovato</h3>
                </div>
                
                <div className="p-4 space-y-4">
                    <p className="text-sm text-ios-label-secondary text-center">
                        Hai inserito <strong>{inputName} {inputSurname}</strong>. Abbiamo trovato giocatori simili nel database. Vuoi collegare questo inserimento a un giocatore esistente?
                    </p>

                    <div className="space-y-2">
                        {candidates.map((c, i) => (
                            <button
                                key={i}
                                onClick={() => onSelect(c.player)}
                                className="w-full flex items-center justify-between p-3 bg-ios-fill dark:bg-gray-800 rounded-xl active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-left"
                            >
                                <div>
                                    <div className="font-medium text-ios-label">{c.player.name} {c.player.surname}</div>
                                    <div className="text-xs text-ios-label-secondary">ELO: {c.player.currentElo}</div>
                                </div>
                                <div className="text-xs font-semibold text-ios-blue bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                                    Simile al {Math.round(c.surnameSimilarity * 100)}%
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-ios-fill dark:bg-gray-800 space-y-2">
                    <button
                        onClick={onCreateNew}
                        className="w-full py-3 bg-ios-blue text-white font-semibold rounded-xl active:bg-blue-600 transition-colors"
                    >
                        Crea Nuovo Giocatore
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-ios-blue font-semibold rounded-xl active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
                    >
                        Annulla Inserimento
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlayerSimilarityModal;
