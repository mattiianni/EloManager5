import React, { useMemo, useState } from 'react';
import { usePadelStore } from '../hooks/usePadelStore.tsx';
import { Player, RankingEntry, SetScore, Tournament, TournamentType } from '../types.ts';
import RankingChart from '../components/RankingChart.tsx';
import { printRanking } from '../services/printService.ts';
import { getTournamentDisplayName } from '../utils/tournamentLabels.ts';
import PlayerProfileModal from '../components/PlayerProfileModal.tsx';
import { HIGList, HIGListSection, HIGListRow } from '../components/ui/HIGList.tsx';
import { SFIcon } from '../components/ui/SFIcon.tsx';
import HIGButton from '../components/ui/HIGButton.tsx';
import HIGSegmentedControl from '../components/ui/HIGSegmentedControl.tsx';

interface RankingPageProps {
    theme: 'light' | 'dark';
}

const RankingPage: React.FC<RankingPageProps> = ({ theme }) => {
    const { players, matches, eloHistory, tournaments, loading } = usePadelStore();
    const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
    const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
    const [presenceThreshold, setPresenceThreshold] = useState<number>(0);
    const [showAllPlayers, setShowAllPlayers] = useState<boolean>(false);

    // Reset showAllPlayers when tournament or threshold changes
    React.useEffect(() => {
        setShowAllPlayers(false);
    }, [selectedTournamentId, presenceThreshold]);

    // Calculate giornate for selected tournament SERIES (by seriesKey = giornataName || name)
    const tournamentGiornate = useMemo(() => {
        if (!selectedTournamentId) return [];
        const tournamentRecords = tournaments.filter(t => (t.giornataName || t.name) === selectedTournamentId);
        return tournamentRecords.map(t => new Date(t.date).toISOString().split('T')[0]).sort();
    }, [selectedTournamentId, tournaments]);

    const rankingData: RankingEntry[] = useMemo(() => {
        if (loading && !players.length) {
            return [];
        }

        const sortedEventsByDate = [...eloHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        let filteredPlayers = players;
        
        if (selectedTournamentId) {
            const tournamentIds = tournaments
                .filter(t => (t.giornataName || t.name) === selectedTournamentId)
                .map(t => t.id);
            const tournamentMatches = matches.filter(m => m.tournamentId && tournamentIds.includes(m.tournamentId));
            const playersInTournament = new Set<string>();
            tournamentMatches.forEach(m => {
                m.team1.forEach(id => playersInTournament.add(id));
                m.team2.forEach(id => playersInTournament.add(id));
            });
            filteredPlayers = players.filter(p => playersInTournament.has(p.id));
        }
        
        return filteredPlayers
            .map(player => {
                let playerMatches = matches.filter(m => {
                    const hasPlayer = m.team1.includes(player.id) || m.team2.includes(player.id);
                    if (!hasPlayer) return false;
                    
                    if (selectedTournamentId) {
                        const tournament = tournaments.find(t => t.id === m.tournamentId);
                        return tournament && (tournament.giornataName || tournament.name) === selectedTournamentId;
                    }
                    
                    if (!m.tournamentId) return true;
                    
                    const tournament = tournaments.find(t => t.id === m.tournamentId);
                    return tournament?.status === 'completed';
                });
                
                const matchesPlayed = playerMatches.length;

                let matchesWon = 0;
                let gamesWon = 0;
                let gamesLost = 0;

                playerMatches.forEach(match => {
                    const isTeam1 = match.team1.includes(player.id);
                    const setsArray = Array.isArray(match.sets) ? match.sets : Object.values(match.sets) as SetScore[];
                    const team1GamesTotal = setsArray.reduce((sum, set) => sum + (set.team1 || 0), 0);
                    const team2GamesTotal = setsArray.reduce((sum, set) => sum + (set.team2 || 0), 0);

                    if (isTeam1) {
                        gamesWon += team1GamesTotal;
                        gamesLost += team2GamesTotal;
                        if (match.winner === 'team1') {
                            matchesWon++;
                        }
                    } else {
                        gamesWon += team2GamesTotal;
                        gamesLost += team1GamesTotal;
                        if (match.winner === 'team2') {
                            matchesWon++;
                        }
                    }
                });
                
                const winPercentage = matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0;
                
                let lastDelta = null;
                if (selectedTournamentId) {
                    const tournamentIds = tournaments.filter(t => (t.giornataName || t.name) === selectedTournamentId).map(t => t.id);
                    const tournamentEloEntries = eloHistory.filter(e => 
                        e.playerId === player.id && tournamentIds.includes(e.eventId)
                    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    lastDelta = tournamentEloEntries.length > 0 ? tournamentEloEntries[0].delta : null;
                } else {
                    const lastEloEntry = sortedEventsByDate.find(e => e.playerId === player.id);
                    lastDelta = lastEloEntry ? lastEloEntry.delta : null;
                }

                let displayElo = player.currentElo;
                if (selectedTournamentId) {
                    const tournamentIds = tournaments.filter(t => (t.giornataName || t.name) === selectedTournamentId).map(t => t.id);
                    const tournamentEloEntries = eloHistory.filter(e => 
                        e.playerId === player.id && tournamentIds.includes(e.eventId)
                    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                    
                    if (tournamentEloEntries.length > 0) {
                        const initialElo = 1500;
                        const tournamentDelta = tournamentEloEntries.reduce((sum, entry) => sum + entry.delta, 0);
                        displayElo = initialElo + tournamentDelta;
                    }
                }

                let presencePercentage = 100;
                let playerGiornateCount = 0;
                if (selectedTournamentId && tournamentGiornate.length > 0) {
                    const tournamentRecords = tournaments.filter(t => (t.giornataName || t.name) === selectedTournamentId);
                    playerGiornateCount = tournamentRecords.filter(tournamentRecord => {
                        return matches.some(m => 
                            m.tournamentId === tournamentRecord.id && 
                            (m.team1.includes(player.id) || m.team2.includes(player.id))
                        );
                    }).length;
                    presencePercentage = (playerGiornateCount / tournamentGiornate.length) * 100;
                }

                return {
                    ...player,
                    currentElo: displayElo,
                    rank: 0,
                    matchesPlayed,
                    matchesWon,
                    gamesWon,
                    gamesLost,
                    winPercentage,
                    lastDelta,
                    presencePercentage,
                    playerGiornateCount,
                };
            })
            .sort((a, b) => {
                if (selectedTournamentId && presenceThreshold > 0) {
                    const aAboveThreshold = a.presencePercentage >= presenceThreshold;
                    const bAboveThreshold = b.presencePercentage >= presenceThreshold;
                    
                    if (aAboveThreshold && !bAboveThreshold) return -1;
                    if (!aAboveThreshold && bAboveThreshold) return 1;
                }
                return b.currentElo - a.currentElo;
            })
            .map((player, index) => ({ ...player, rank: index + 1 }));
    }, [players, matches, eloHistory, loading, selectedTournamentId, presenceThreshold, tournamentGiornate, tournaments]);

    const handleToggleExpand = (playerId: string) => {
        setExpandedPlayerId(prevId => (prevId === playerId ? null : playerId));
    };

    const completedTournaments = useMemo(() => {
        const tournamentMap = new Map<string, Tournament>();
        tournaments
            .filter(t => t.status === 'completed' && t.type !== TournamentType.TorneoASquadre)
            .forEach(t => {
                const seriesKey = (t.giornataName || t.name);
                if (!tournamentMap.has(seriesKey)) {
                    tournamentMap.set(seriesKey, t);
                }
            });
        return Array.from(tournamentMap.values());
    }, [tournaments]);

    const getMedalIcon = (index: number) => {
        switch (index) {
            case 0: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemYellow)" />;
            case 1: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemGray)" />;
            case 2: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemOrange)" />;
            default: return <span className="text-[15px] font-bold text-ios-label-secondary">{index + 1}.</span>;
        }
    };

    const getTrendIcon = (delta: number | null) => {
        if (delta === null || delta === 0) return <SFIcon name="minus" size={14} color="var(--ios-systemGray)" />;
        if (delta > 0) return <SFIcon name="arrow.up" size={14} color="var(--ios-systemGreen)" />;
        return <SFIcon name="arrow.down" size={14} color="var(--ios-systemRed)" />;
    };

    const presenceOptions = [0, 50, 60, 70, 80, 90];
    const presenceLabels = ['Tutti', '50%', '60%', '70%', '80%', '90%'];

    return (
        <HIGList className="py-4">
            
            {/* Header / Actions */}
            <div className="px-1 pt-3 mb-4 flex justify-between items-center">
                <h2 className="text-[1.62rem] font-black leading-none tracking-tight text-sky-500 dark:text-sky-300 sm:text-[1.78rem] md:text-[2.25rem]">Classifica</h2>
                <HIGButton 
                    variant="gray"
                    onClick={() => printRanking(
                        rankingData, 
                        eloHistory, 
                        matches, 
                        tournaments,
                        selectedTournamentId,
                        presenceThreshold,
                        tournamentGiornate
                    )}
                    disabled={loading || rankingData.length === 0}
                >
                    <SFIcon name="printer" size={18} />
                </HIGButton>
            </div>

            {/* Filters */}
            <HIGListSection header="Filtri">
                <div className="px-4 py-2 flex items-center bg-transparent">
                    <SFIcon name="trophy.fill" size={18} color="var(--ios-systemOrange)" className="mr-3" />
                    <select
                        value={selectedTournamentId || ''}
                        onChange={(e) => {
                            setSelectedTournamentId(e.target.value || null);
                            setPresenceThreshold(0);
                        }}
                        className="flex-1 bg-transparent text-ios-label focus:outline-none sf-body appearance-none"
                    >
                        <option value="">Generale</option>
                        {completedTournaments.map(tournament => (
                            <option key={(tournament.giornataName || tournament.name)} value={(tournament.giornataName || tournament.name)}>
                                {tournament.giornataName || tournament.name}
                            </option>
                        ))}
                    </select>
                    <SFIcon name="chevron.up.chevron.down" size={14} color="var(--ios-label-tertiary)" />
                </div>
            </HIGListSection>

            {selectedTournamentId && tournamentGiornate.length > 1 && (
                <div className="px-4 mb-6">
                    <div className="text-xs text-ios-label-secondary uppercase tracking-wider mb-2 font-semibold">
                        Presenza Minima ({tournamentGiornate.length} giornate)
                    </div>
                    <HIGSegmentedControl 
                        segments={presenceLabels}
                        selectedIndex={presenceOptions.indexOf(presenceThreshold)}
                        onChange={(idx) => setPresenceThreshold(presenceOptions[idx])}
                    />
                </div>
            )}

            {/* Ranking List */}
            {loading && !players.length ? (
                <div className="px-4 text-center text-ios-label-secondary">Caricamento...</div>
            ) : (
                <HIGListSection 
                    header="Giocatori"
                    footer={selectedTournamentId && presenceThreshold > 0 
                        ? `Giocatori sotto soglia ${presenceThreshold}% elencati in basso.`
                        : `Totale: ${rankingData.length} giocatori`}
                >
                    {(showAllPlayers ? rankingData : rankingData.slice(0, 10)).map((player, idx) => {
                        const isExpanded = expandedPlayerId === player.id;
                        
                        const playerHistory = eloHistory
                            .filter(entry => {
                                if (entry.playerId !== player.id) return false;
                                if (selectedTournamentId) {
                                    const tournamentIds = tournaments
                                        .filter(t => (t.giornataName || t.name) === selectedTournamentId)
                                        .map(t => t.id);
                                    return tournamentIds.includes(entry.eventId);
                                }
                                return true;
                            })
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        const prevPlayer = idx > 0 ? rankingData[idx - 1] : null;
                        const showSeparator = selectedTournamentId && presenceThreshold > 0 && 
                            prevPlayer &&
                            prevPlayer.presencePercentage >= presenceThreshold &&
                            player.presencePercentage < presenceThreshold;

                        return (
                            <React.Fragment key={player.id}>
                                {showSeparator && (
                                    <div className="px-4 py-2 bg-ios-fill flex items-center justify-center gap-2 border-b border-[var(--ios-separator)]">
                                        <SFIcon name="arrow.down.to.line" size={14} color="var(--ios-label-secondary)" />
                                        <span className="text-[11px] font-bold text-ios-label-secondary uppercase tracking-wider">
                                            Sotto Soglia {presenceThreshold}%
                                        </span>
                                    </div>
                                )}
                                
                                <HIGListRow
                                    label={
                                        <div className="flex justify-between items-center w-full">
                                            <span className="truncate pr-2">{`${player.name} ${player.surname}`}</span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-semibold text-ios-blue text-[17px]">{player.currentElo.toFixed(2)}</span>
                                                {getTrendIcon(player.lastDelta)}
                                            </div>
                                        </div>
                                    }
                                    subtitle={
                                        <div className="flex items-center justify-between mt-0.5 w-full">
                                            <span className="text-ios-label-secondary text-[13px]">
                                                {selectedTournamentId ? `${player.playerGiornateCount}/${tournamentGiornate.length} giornate` : `Posizione #${player.rank}`}
                                            </span>
                                            <div className="flex items-center gap-3 pr-2">
                                                <button onClick={(e) => { e.stopPropagation(); setProfilePlayer(player); }} className="text-ios-green" aria-label="Info">
                                                    <SFIcon name="info.circle" size={16} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleToggleExpand(player.id); }} className="text-ios-label-tertiary">
                                                    <SFIcon name={isExpanded ? "chevron.up" : "chevron.down"} size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    }
                                    icon={<div className="flex h-full w-full items-center justify-center">{getMedalIcon(idx)}</div>}
                                    detail={null}
                                    accessory={null}
                                />

                                {isExpanded && playerHistory.length > 0 && (
                                    <div className="bg-ios-fill px-4 py-2 border-b border-[var(--ios-separator)]">
                                        <div className="text-xs text-ios-label-secondary font-semibold mb-2 uppercase">Storico ELO</div>
                                        <div className="space-y-1">
                                            {playerHistory.map(entry => {
                                                let description = '';
                                                if (entry.type === 'manual') {
                                                    description = 'Aggiornamento Manuale';
                                                } else if (entry.type === 'tournament') {
                                                    const tournament = tournaments.find(t => t.id === entry.eventId);
                                                    if (tournament) {
                                                        if (selectedTournamentId) {
                                                            description = tournament.type;
                                                        } else {
                                                            description = `${tournament.type} (${getTournamentDisplayName(tournament, tournaments)})`;
                                                        }
                                                    } else {
                                                        description = 'Giornata Torneo';
                                                    }
                                                } else {
                                                    description = 'Partita Amichevole';
                                                }
                                                const deltaSign = entry.delta >= 0 ? '+' : '';
                                                return (
                                                    <div key={entry.eventId + entry.type} className="flex justify-between items-center text-[13px]">
                                                        <div className="text-ios-label">
                                                            <span>{description}</span> 
                                                            <span className="text-ios-label-secondary ml-1">{new Date(entry.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit'})}</span>
                                                        </div>
                                                        <div className={`font-mono font-semibold ${entry.delta >= 0 ? 'text-ios-green' : 'text-ios-red'}`}>
                                                            {deltaSign}{entry.delta.toFixed(1)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </HIGListSection>
            )}

            {!showAllPlayers && rankingData.length > 10 && (
                <div className="px-4 mt-2">
                    <HIGButton variant="gray" fullWidth onClick={() => setShowAllPlayers(true)}>
                        Mostra tutti i {rankingData.length} giocatori
                    </HIGButton>
                </div>
            )}

            {rankingData.length === 0 && !loading && (
                <div className="px-4 text-center py-8 text-ios-label-secondary">Nessun giocatore in classifica.</div>
            )}

            <div className="mt-8">
                <RankingChart theme={theme} selectedSeriesKey={selectedTournamentId} />
            </div>

            <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} theme={theme} />
        </HIGList>
    );
};

export default RankingPage;
