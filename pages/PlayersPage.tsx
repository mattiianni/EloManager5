import React, { useState, useEffect, useMemo } from 'react';
import { usePadelStore } from '../hooks/usePadelStore.tsx';
import { Player, FieldPosition } from '../types.ts';
import { HIGList, HIGListSection, HIGListRow } from '../components/ui/HIGList.tsx';
import { SFIcon } from '../components/ui/SFIcon.tsx';
import HIGButton from '../components/ui/HIGButton.tsx';
import { HIGSheet } from '../components/ui/HIGSheet.tsx';
import HIGSegmentedControl from '../components/ui/HIGSegmentedControl.tsx';
import PlayerProfileModal from '../components/PlayerProfileModal.tsx';
import { printPlayerProfiles } from '../services/printService.ts';
import EloPlaytomicInput from '../components/EloPlaytomicInput.tsx';

const PlayersPage: React.FC = () => {
    const { players, matches, tournaments, eloHistory, addPlayer, deletePlayer, updatePlayerAndElo, loading } = usePadelStore();
    
    // Sort State
    const [sortIndex, setSortIndex] = useState(0); // 0 = Name, 1 = Surname, 2 = ELO
    const sortOptions = ['Nome', 'Cognome', 'ELO'];

    // Add Player Sheet State
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [position, setPosition] = useState<FieldPosition>(FieldPosition.Indifferente);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit Player Sheet State
    const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);
    const [editName, setEditName] = useState('');
    const [editSurname, setEditSurname] = useState('');
    const [editPosition, setEditPosition] = useState<FieldPosition>(FieldPosition.Indifferente);
    const [editElo, setEditElo] = useState('');
    const [editTournamentId, setEditTournamentId] = useState<string>('');
    const [editSurnameError, setEditSurnameError] = useState<string | null>(null);

    // Profile State
    const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);

    useEffect(() => {
        if (playerToEdit) {
            setEditName(playerToEdit.name);
            setEditSurname(playerToEdit.surname);
            setEditPosition(playerToEdit.position);
            setEditElo(playerToEdit.currentElo.toFixed(2));
            setEditTournamentId('');
            setEditSurnameError(null);
        }
    }, [playerToEdit]);

    // Determine if the player being edited has played at least one match
    const playerHasMatches = playerToEdit
        ? matches.some(m =>
            m.team1.includes(playerToEdit.id) || m.team2.includes(playerToEdit.id)
          )
        : false;

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nName = name.trim();
        const nSurname = surname.trim();
        if (nName && nSurname) {
            const isDuplicate = players.some(p => 
                p.name.toLowerCase() === nName.toLowerCase() && 
                p.surname.toLowerCase() === nSurname.toLowerCase()
            );
            if (isDuplicate) {
                alert("Attenzione: Esiste già un giocatore con questo nome e cognome!");
                return;
            }
            setIsSubmitting(true);
            try {
                await addPlayer(nName, nSurname, position);
                setName('');
                setSurname('');
                setPosition(FieldPosition.Indifferente);
                setIsAddSheetOpen(false);
            } catch (error) {
                console.error("Failed to add player:", error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleDelete = async (playerId: string) => {
        if (window.confirm('Sei sicuro di voler eliminare questo giocatore? Verranno eliminate anche tutte le sue partite.')) {
           await deletePlayer(playerId);
        }
    };
    
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newElo = parseFloat(editElo);
        const eName = editName.trim();
        const eSurname = editSurname.trim();
        if (playerToEdit && eName && eSurname && !isNaN(newElo)) {
            const isDuplicate = players.some(p => 
                p.id !== playerToEdit.id &&
                p.name.toLowerCase() === eName.toLowerCase() && 
                p.surname.toLowerCase() === eSurname.toLowerCase()
            );
            if (isDuplicate) {
                alert("Attenzione: Esiste già un altro giocatore con questo nome e cognome!");
                return;
            }
            setEditSurnameError(null);
            setIsSubmitting(true);
            try {
                await updatePlayerAndElo(playerToEdit.id, {
                    name: eName,
                    surname: eSurname,
                    position: editPosition,
                }, newElo, editTournamentId || undefined);
                setPlayerToEdit(null);
            } catch (error: any) {
                // Show the server's Levenshtein error message inline instead of crashing
                const msg = error?.message || String(error);
                if (msg.includes('cognome') || msg.includes('20%') || msg.includes('limite')) {
                    setEditSurnameError(msg);
                } else {
                    console.error("Failed to update player:", error);
                }
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const sortedPlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            if (sortIndex === 0) return a.name.localeCompare(b.name);
            if (sortIndex === 1) return a.surname.localeCompare(b.surname);
            return b.currentElo - a.currentElo; // ELO descending
        });
    }, [players, sortIndex]);

    return (
        <HIGList className="py-4">
            
            {/* Header Actions */}
            <div style={{ padding: '0 16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }} className="sm:flex-row sm:justify-between sm:items-center">
                <HIGSegmentedControl 
                    segments={sortOptions}
                    selectedIndex={sortIndex}
                    onChange={setSortIndex}
                    className="w-full sm:w-[300px]"
                />
                <div className="flex w-full sm:w-auto gap-2">
                    <HIGButton 
                        variant="gray"
                        onClick={() => printPlayerProfiles(players.map(p => p.id), players, matches, eloHistory, tournaments)}
                        disabled={loading || players.length === 0}
                        className="flex-1 sm:flex-none"
                    >
                        <SFIcon name="printer" size={18} />
                    </HIGButton>
                    <HIGButton 
                        variant="filled"
                        onClick={() => setIsAddSheetOpen(true)}
                        className="flex-1 sm:flex-none"
                    >
                        <SFIcon name="plus" size={18} />
                        <span className="ml-1">Nuovo</span>
                    </HIGButton>
                </div>
            </div>

            {/* Players List */}
            {loading ? (
                <div className="px-4 text-center text-ios-label-secondary">Caricamento...</div>
            ) : (
                <HIGListSection header={`Roster (${players.length})`}>
                    {sortedPlayers.length === 0 ? (
                        <HIGListRow label="Nessun giocatore registrato" />
                    ) : (
                        sortedPlayers.map(player => (
                            <HIGListRow
                                key={player.id}
                                label={
                                    <div className="flex justify-between items-center w-full">
                                        <span className="truncate pr-2">{sortIndex === 1 ? `${player.surname} ${player.name}` : `${player.name} ${player.surname}`}</span>
                                        <span className="font-semibold text-ios-blue text-[17px] shrink-0">{player.currentElo.toFixed(2)}</span>
                                    </div>
                                }
                                subtitle={
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-ios-label-secondary text-[13px]">{player.position}</span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => { e.stopPropagation(); setProfilePlayer(player); }} className="text-ios-green" aria-label="Profilo"><SFIcon name="info.circle" size={16}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); setPlayerToEdit(player); }} className="text-ios-blue" aria-label="Modifica"><SFIcon name="pencil" size={16}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(player.id); }} className="text-ios-red" aria-label="Elimina"><SFIcon name="trash" size={16}/></button>
                                        </div>
                                    </div>
                                }
                                detail={null}
                                icon={
                                    <div className="flex h-full w-full items-center justify-center bg-ios-fill text-ios-label">
                                        <SFIcon name="person.fill" size={16} />
                                    </div>
                                }
                                accessory={null}
                            />
                        ))
                    )}
                </HIGListSection>
            )}

            {/* Add Player Sheet */}
            <HIGSheet 
                isOpen={isAddSheetOpen} 
                onClose={() => setIsAddSheetOpen(false)}
                title="Nuovo Giocatore"
            >
                <form onSubmit={handleAddSubmit} className="space-y-6 pt-4 pb-8">
                    <div className="bg-ios-bg-secondary rounded-xl overflow-hidden mx-4">
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">Nome</label>
                            <input
                                type="text"
                                placeholder="Inserisci il nome"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="sm:w-2/3 bg-transparent text-ios-label focus:outline-none"
                                required
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">Cognome</label>
                            <input
                                type="text"
                                placeholder="Inserisci il cognome"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                className="sm:w-2/3 bg-transparent text-ios-label focus:outline-none"
                                required
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">Posizione</label>
                            <select
                                value={position}
                                onChange={(e) => setPosition(e.target.value as FieldPosition)}
                                className="sm:w-2/3 bg-transparent text-ios-label focus:outline-none"
                            >
                                {Object.values(FieldPosition).map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="px-4">
                        <HIGButton type="submit" variant="filled" fullWidth disabled={isSubmitting || !name || !surname}>
                            {isSubmitting ? 'Salvataggio...' : 'Aggiungi Giocatore'}
                        </HIGButton>
                    </div>
                </form>
            </HIGSheet>

            {/* Edit Player Sheet */}
            <HIGSheet 
                isOpen={!!playerToEdit} 
                onClose={() => setPlayerToEdit(null)}
                title="Modifica Giocatore"
            >
                <form onSubmit={handleEditSubmit} className="space-y-6 pt-4 pb-8">
                    <div className="bg-ios-bg-secondary rounded-xl overflow-hidden mx-4">
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">Nome</label>
                            <input
                                type="text"
                                placeholder="Inserisci il nome"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="sm:w-2/3 bg-transparent text-ios-label focus:outline-none"
                                required
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">
                                Cognome
                                {playerHasMatches && (
                                    <span className="ml-2 text-[10px] font-semibold text-ios-orange bg-orange-50 border border-orange-200 rounded px-1 py-0.5" title="Modifiche al cognome sono limitate al 20% per proteggere lo storico ELO">
                                        🔒 protetto
                                    </span>
                                )}
                            </label>
                            <div className="sm:w-2/3 flex flex-col gap-1">
                                <input
                                    type="text"
                                    placeholder="Inserisci il cognome"
                                    value={editSurname}
                                    onChange={(e) => { setEditSurname(e.target.value); setEditSurnameError(null); }}
                                    className={`bg-transparent text-ios-label focus:outline-none w-full ${editSurnameError ? 'text-ios-red' : ''}`}
                                    required
                                />
                                {editSurnameError && (
                                    <p className="text-xs text-ios-red leading-snug">{editSurnameError}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center px-4 py-5">
                            <label className="sm:w-1/3 text-sm font-medium text-ios-label-secondary mb-1 sm:mb-0">Posizione</label>
                            <select
                                value={editPosition}
                                onChange={(e) => setEditPosition(e.target.value as FieldPosition)}
                                className="sm:w-2/3 bg-transparent text-ios-label focus:outline-none"
                            >
                                {Object.values(FieldPosition).map(pos => (
                                    <option key={pos} value={pos}>{pos}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <HIGListSection header="Impostazioni ELO">
                        <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--ios-separator)' }}>
                            <EloPlaytomicInput
                                elo={parseFloat(editElo) || 0}
                                onEloChange={(elo) => setEditElo(elo.toString())}
                            />
                        </div>
                        {parseFloat(editElo) !== playerToEdit?.currentElo && (
                            <div className="px-4 py-2">
                                <label className="text-xs text-ios-label-secondary mb-1 block">Aggiorna classifica in</label>
                                <select
                                    value={editTournamentId}
                                    onChange={(e) => setEditTournamentId(e.target.value)}
                                    className="w-full bg-transparent text-ios-label focus:outline-none"
                                >
                                    <option value="">Solo classifica generale</option>
                                    {Array.from(new Set(tournaments.map(t => t.giornataName || t.name))).map(seriesName => {
                                        const seriesTournaments = tournaments.filter(t => (t.giornataName || t.name) === seriesName);
                                        const lastTournament = seriesTournaments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                                        return (
                                            <option key={lastTournament.id} value={lastTournament.id}>
                                                {seriesName}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}
                    </HIGListSection>

                    <div className="px-4">
                        <HIGButton type="submit" variant="filled" fullWidth disabled={isSubmitting}>
                            {isSubmitting ? 'Salvataggio...' : 'Salva Modifiche'}
                        </HIGButton>
                    </div>
                </form>
            </HIGSheet>

            <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />
        </HIGList>
    );
};

export default PlayersPage;
