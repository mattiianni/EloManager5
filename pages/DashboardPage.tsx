import React, { useMemo } from 'react';
import { usePadelStore } from '../hooks/usePadelStore.tsx';
import { SFIcon } from '../components/ui/SFIcon.tsx';
import { HIGListSection, HIGListRow } from '../components/ui/HIGList.tsx';
import PlayerProfileModal from '../components/PlayerProfileModal.tsx';
import { Player, TournamentType } from '../types.ts';
import { groupMatchesByPlayerSets } from '../services/beatTheBoxService.ts';
import { printPlayerProfiles } from '../services/printService.ts';

interface DashboardPageProps {
    onNavigateToTournaments: (tournamentId: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateToTournaments }) => {
    const { players, matches, tournaments, eloHistory, getPlayerById } = usePadelStore();
    const [profilePlayer, setProfilePlayer] = React.useState<Player | null>(null);

    const stats = useMemo(() => {
        const activePlayers = players.length;
        const totalMatches = matches.length;
        const completedTournaments = tournaments.filter(t => t.status === 'completed').length;
        let avgElo = 0;
        if (players.length > 0) {
            const sorted = [...players].sort((a, b) => b.currentElo - a.currentElo);
            const top50Count = Math.max(1, Math.floor(sorted.length / 2));
            const top50 = sorted.slice(0, top50Count);
            avgElo = top50.reduce((sum, p) => sum + p.currentElo, 0) / top50Count;
        }
        return { activePlayers, totalMatches, completedTournaments, avgElo };
    }, [players, matches, tournaments]);

    const top5 = useMemo(() => {
        const sorted = [...players].sort((a, b) => b.currentElo - a.currentElo).slice(0, 5);
        return sorted.map(p => {
            const playerHistory = eloHistory
                .filter(e => e.playerId === p.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastDelta = playerHistory.length > 0 ? playerHistory[0].delta : 0;
            return { ...p, lastDelta };
        });
    }, [players, eloHistory]);

    const lastGiornata = useMemo(() => {
        const completed = tournaments
            .filter(t => t.status === 'completed')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (completed.length === 0) return null;

        const tournament = completed[0];
        const tournamentMatches = matches.filter(m => m.tournamentId === tournament.id);

        let top3: { label: string }[] = [];

        if (tournament.type === TournamentType.BeatTheBox) {
            const { phaseMatches } = groupMatchesByPlayerSets(tournamentMatches);
            const numBoxes = groupMatchesByPlayerSets(tournamentMatches).boxes.size;
            let finalMatches: typeof tournamentMatches = [];
            if (numBoxes >= 4 && phaseMatches.length >= 2) {
                finalMatches = phaseMatches.slice(2);
            } else {
                finalMatches = phaseMatches;
            }
            const standings: { team: string[] }[] = [];
            if (finalMatches.length > 0 && finalMatches[0].winner) {
                const fm = finalMatches[0];
                standings.push({ team: fm.winner === 'team1' ? [...fm.team1] : [...fm.team2] });
                standings.push({ team: fm.winner === 'team1' ? [...fm.team2] : [...fm.team1] });
            }
            if (finalMatches.length > 1 && finalMatches[1].winner) {
                const fm = finalMatches[1];
                standings.push({ team: fm.winner === 'team1' ? [...fm.team1] : [...fm.team2] });
            }
            top3 = standings.map(s =>
                ({ label: s.team.map(id => { const p = getPlayerById(id); return p ? `${p.name} ${p.surname[0]}.` : '?'; }).join(' & ') })
            );
        } else {
            const uniquePlayers = Array.from(new Set(tournamentMatches.flatMap(m => [...m.team1, ...m.team2])));
            const topByWins = uniquePlayers
                .map(id => {
                    const p = getPlayerById(id);
                    const wins = tournamentMatches.filter(m =>
                        (m.winner === 'team1' && m.team1.includes(id)) ||
                        (m.winner === 'team2' && m.team2.includes(id))
                    ).length;
                    return { id, name: p ? `${p.name} ${p.surname[0]}.` : '?', wins };
                })
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 3);
            top3 = topByWins.map(p => ({ label: `${p.name} (${p.wins} vittorie)` }));
        }

        return { ...tournament, top3 };
    }, [tournaments, matches, getPlayerById]);

    const recentMatches = useMemo(() => {
        const sorted = [...matches]
            .filter(m => m.winner && m.winner !== 'draw')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        return sorted.map(m => {
            const t1 = m.team1.map(id => { const p = getPlayerById(id); return p ? `${p.name} ${p.surname[0]}.` : '?'; }).join(' & ');
            const t2 = m.team2.map(id => { const p = getPlayerById(id); return p ? `${p.name} ${p.surname[0]}.` : '?'; }).join(' & ');
            const t1Score = m.sets.reduce((sum, s) => sum + s.team1, 0);
            const t2Score = m.sets.reduce((sum, s) => sum + s.team2, 0);
            const date = new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
            return { date, t1, t2, t1Score, t2Score, winner: m.winner };
        });
    }, [matches, getPlayerById]);

    const getMedalIcon = (index: number) => {
        switch (index) {
            case 0: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemYellow)" />;
            case 1: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemGray)" />;
            case 2: return <SFIcon name="medal.fill" size={20} color="var(--ios-systemOrange)" />;
            default: return <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ios-secondaryLabel)' }}>{index + 1}.</span>;
        }
    };

    const getTrendIcon = (delta: number) => {
        if (delta > 0) return <SFIcon name="arrow.up" size={13} color="var(--ios-systemGreen)" />;
        if (delta < 0) return <SFIcon name="arrow.down" size={13} color="var(--ios-systemRed)" />;
        return <SFIcon name="minus" size={13} color="var(--ios-systemGray)" />;
    };

    const kpiItems = [
        { label: 'Giocatori', value: stats.activePlayers, icon: 'person.2.fill', color: 'var(--ios-systemBlue)' },
        { label: 'Partite', value: stats.totalMatches, icon: 'sportscourt', color: 'var(--ios-systemGreen)' },
        { label: 'Giornate', value: stats.completedTournaments, icon: 'calendar', color: 'var(--ios-systemOrange)' },
        { label: 'Media ELO', value: stats.avgElo.toFixed(0), icon: 'chart.bar.fill', color: 'var(--ios-systemIndigo)' },
    ];

    return (
        <div style={{ paddingTop: '8px' }}>

            {/* KPI Grid — stessa inset di HIGListSection (16px) */}
            <div style={{ margin: '0 16px 20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {kpiItems.map((kpi, idx) => (
                        <div key={idx} style={{
                            background: 'var(--ios-secondarySystemGroupedBackground)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <SFIcon name={kpi.icon} size={15} color={kpi.color} />
                                <span style={{
                                    font: '600 11px/14px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                    color: 'var(--ios-secondaryLabel)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                }}>{kpi.label}</span>
                            </div>
                            <div style={{
                                font: '700 24px/28px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                                color: 'var(--ios-label)',
                            }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TOP 5 */}
            <HIGListSection
                header={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Top 5 Giocatori</span>
                        <button
                            onClick={() => printPlayerProfiles(players.map(p => p.id), players, matches, eloHistory, tournaments)}
                            disabled={players.length === 0}
                            style={{
                                color: 'var(--ios-systemBlue)',
                                font: '400 13px/18px -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                textTransform: 'none',
                                letterSpacing: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                            }}
                        >
                            <SFIcon name="printer" size={13} color="var(--ios-systemBlue)" />
                            Stampa
                        </button>
                    </div>
                }
            >
                {top5.length === 0 ? (
                    <HIGListRow label="Nessun giocatore registrato" />
                ) : (
                    top5.map((p, i) => (
                        <HIGListRow
                            key={p.id}
                            label={`${p.name} ${p.surname}`}
                            icon={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                    {getMedalIcon(i)}
                                </div>
                            }
                            detail={
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ color: 'var(--ios-systemBlue)', fontWeight: 600, fontSize: '15px' }}>{p.currentElo.toFixed(0)}</span>
                                    {getTrendIcon(p.lastDelta)}
                                </div>
                            }
                            onPress={() => setProfilePlayer(p)}
                            accessory="chevron"
                        />
                    ))
                )}
            </HIGListSection>

            {/* ULTIMA GIORNATA */}
            <HIGListSection header="Ultima Giornata">
                {!lastGiornata ? (
                    <HIGListRow label="Nessuna giornata completata" />
                ) : (
                    <>
                        <HIGListRow
                            label={lastGiornata.name}
                            subtitle={`${lastGiornata.type} • ${lastGiornata.date}`}
                            icon={
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'var(--ios-systemOrange)', borderRadius: '6px' }}>
                                    <SFIcon name="trophy.fill" size={16} color="white" />
                                </div>
                            }
                            onPress={() => onNavigateToTournaments(lastGiornata.id)}
                            accessory="chevron"
                        />
                        {lastGiornata.top3.map((entry, i) => (
                            <HIGListRow
                                key={i}
                                label={entry.label}
                                icon={
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                        {getMedalIcon(i)}
                                    </div>
                                }
                            />
                        ))}
                    </>
                )}
            </HIGListSection>

            {/* ULTIME PARTITE */}
            <HIGListSection header="Ultime Partite">
                {recentMatches.length === 0 ? (
                    <HIGListRow label="Nessuna partita registrata" />
                ) : (
                    recentMatches.map((m, i) => (
                        <HIGListRow
                            key={i}
                            label={
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, fontSize: '15px' }}>
                                    <span style={{
                                        color: m.winner === 'team1' ? 'var(--ios-label)' : 'var(--ios-secondaryLabel)',
                                        fontWeight: m.winner === 'team1' ? 600 : 400,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>{m.t1}</span>
                                    <span style={{
                                        color: m.winner === 'team2' ? 'var(--ios-label)' : 'var(--ios-secondaryLabel)',
                                        fontWeight: m.winner === 'team2' ? 600 : 400,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>{m.t2}</span>
                                </div>
                            }
                            subtitle={m.date}
                            detail={
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end', fontSize: '15px', fontFamily: 'monospace', fontWeight: 600 }}>
                                    <span style={{ color: m.winner === 'team1' ? 'var(--ios-label)' : 'var(--ios-secondaryLabel)' }}>
                                        {m.t1Score}
                                    </span>
                                    <span style={{ color: m.winner === 'team2' ? 'var(--ios-label)' : 'var(--ios-secondaryLabel)' }}>
                                        {m.t2Score}
                                    </span>
                                </div>
                            }
                        />
                    ))
                )}
            </HIGListSection>

            <PlayerProfileModal player={profilePlayer} onClose={() => setProfilePlayer(null)} />
        </div>
    );
};

export default DashboardPage;
