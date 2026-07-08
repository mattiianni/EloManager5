
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { usePadelStore } from '../hooks/usePadelStore.tsx';
import { Player } from '../types.ts';
import { HIGSheet } from './ui/HIGSheet.tsx';
import { XIcon, ArrowUpIcon, ArrowDownIcon, ArrowStableIcon } from './ui/Icons.tsx';

interface PlayerProfileModalProps {
    player: Player | null;
    onClose: () => void;
    theme?: 'light' | 'dark';
}

const CustomTooltip: React.FC<any> = ({ active, payload, label, theme, chartData }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-3 rounded-md shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'}`}>
                <p className="label">{label === -1 ? 'Start' : `Event #${label + 1}`}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} style={{ color: pld.color }}>
                        {`ELO: ${pld.value.toFixed(2)}`}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({ player, onClose, theme: themeProp }) => {
    const theme = themeProp || (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    const { matches, eloHistory, getPlayerById, tournaments } = usePadelStore();

    // Only count matches from completed tournaments or friendly matches
    const playerMatches = useMemo(() => {
        if (!player) return [];
        return matches
            .filter(m => m.team1.includes(player.id) || m.team2.includes(player.id))
            .filter(m => {
                if (!m.tournamentId) return true; // Friendly match
                const tournament = tournaments.find(t => t.id === m.tournamentId);
                return tournament?.status === 'completed';
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [player, matches, tournaments]);

    const stats = useMemo(() => {
        if (!player) return null;

        const total = playerMatches.length;
        const wins = playerMatches.filter(m => {
            const isTeam1 = m.team1.includes(player.id);
            return (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
        }).length;

        let gamesWon = 0;
        let gamesLost = 0;
        playerMatches.forEach(m => {
            const isTeam1 = m.team1.includes(player.id);
            m.sets.forEach(set => {
                gamesWon += isTeam1 ? set.team1 : set.team2;
                gamesLost += isTeam1 ? set.team2 : set.team1;
            });
        });

        // Form: based on last 5 individual matches (consistent with "Ultime 5 Partite")
        const last5 = playerMatches.slice(-5);
        const form = last5.map(m => {
            const isTeam1 = m.team1.includes(player.id);
            return (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
        });

        const playerHistory = eloHistory
            .filter(e => e.playerId === player.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Best streak (from matches)
        let bestStreak = 0;
        let currentStreak = 0;
        playerMatches.forEach(m => {
            const isTeam1 = m.team1.includes(player.id);
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
            if (won) {
                currentStreak++;
                bestStreak = Math.max(bestStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });

        // Last delta
        const lastDelta = playerHistory.length > 0 ? playerHistory[playerHistory.length - 1].delta : 0;

        return { total, wins, gamesWon, gamesLost, form, bestStreak, lastDelta };
    }, [player, playerMatches, eloHistory]);

    // ELO chart data: same approach as RankingChart.tsx (cumulative deltas)
    const eloChartData = useMemo(() => {
        if (!player) return [];

        const playerHistory = eloHistory
            .filter(e => e.playerId === player.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (playerHistory.length === 0) return [];

        // Build event dates map
        const eventDates = new Map<string, string>();
        tournaments.forEach(t => { eventDates.set(t.id, t.date); });
        playerHistory.forEach(e => { if (!eventDates.has(e.eventId)) eventDates.set(e.eventId, e.date); });

        // Get ordered unique event IDs
        const orderedEventIds = [...new Set(playerHistory.map(e => e.eventId))]
            .sort((a, b) => new Date(eventDates.get(a) || '').getTime() - new Date(eventDates.get(b) || '').getTime());

        // Build per-event delta sum and first entry lookup
        const eventFirstEntry = new Map<string, typeof playerHistory[number]>();
        const eventDeltaSum = new Map<string, number>();
        playerHistory.forEach(entry => {
            if (!eventFirstEntry.has(entry.eventId)) eventFirstEntry.set(entry.eventId, entry);
            eventDeltaSum.set(entry.eventId, (eventDeltaSum.get(entry.eventId) || 0) + entry.delta);
        });

        // Initial base: eloBefore of first event
        const firstEventId = orderedEventIds[0];
        const firstEntry = eventFirstEntry.get(firstEventId);
        const base = firstEntry ? firstEntry.eloBefore : player.initialElo;

        const data: { eventIndex: number; elo: number }[] = [];
        // Initial point
        data.push({ eventIndex: -1, elo: base });

        // Cumulative approach (same as RankingChart)
        let cumulative = 0;
        orderedEventIds.forEach((eventId, index) => {
            const deltaForEvent = eventDeltaSum.get(eventId) || 0;
            cumulative += deltaForEvent;
            data.push({ eventIndex: index, elo: base + cumulative });
        });

        return data;
    }, [player, eloHistory, tournaments]);

    const partners = useMemo(() => {
        if (!player) return [];
        const partnerMap = new Map<string, { total: number; wins: number }>();

        playerMatches.forEach(m => {
            const isTeam1 = m.team1.includes(player.id);
            const team = isTeam1 ? m.team1 : m.team2;
            const partnerId = team.find(id => id !== player.id);
            if (!partnerId) return;

            if (!partnerMap.has(partnerId)) partnerMap.set(partnerId, { total: 0, wins: 0 });
            const s = partnerMap.get(partnerId)!;
            s.total++;
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
            if (won) s.wins++;
        });

        return [...partnerMap.entries()]
            .map(([id, s]) => ({ player: getPlayerById(id), ...s }))
            .filter(e => e.player)
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);
    }, [player, playerMatches, getPlayerById]);

    const opponents = useMemo(() => {
        if (!player) return [];
        const opponentMap = new Map<string, { total: number; wins: number }>();

        playerMatches.forEach(m => {
            const isTeam1 = m.team1.includes(player.id);
            const opponentTeam = isTeam1 ? m.team2 : m.team1;
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');

            opponentTeam.forEach(oppId => {
                if (!opponentMap.has(oppId)) opponentMap.set(oppId, { total: 0, wins: 0 });
                const s = opponentMap.get(oppId)!;
                s.total++;
                if (won) s.wins++;
            });
        });

        return [...opponentMap.entries()]
            .map(([id, s]) => ({ player: getPlayerById(id), ...s }))
            .filter(e => e.player)
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);
    }, [player, playerMatches, getPlayerById]);

    const recentMatches = useMemo(() => {
        if (!player) return [];
        return [...playerMatches].reverse().slice(0, 5).map(m => {
            const isTeam1 = m.team1.includes(player.id);
            const team = isTeam1 ? m.team1 : m.team2;
            const oppTeam = isTeam1 ? m.team2 : m.team1;
            const partnerId = team.find(id => id !== player.id);
            const partner = partnerId ? getPlayerById(partnerId) : null;
            const opp1 = getPlayerById(oppTeam[0]);
            const opp2 = getPlayerById(oppTeam[1]);
            const won = (isTeam1 && m.winner === 'team1') || (!isTeam1 && m.winner === 'team2');
            const myScore = m.sets.reduce((sum, s) => sum + (isTeam1 ? s.team1 : s.team2), 0);
            const oppScore = m.sets.reduce((sum, s) => sum + (isTeam1 ? s.team2 : s.team1), 0);

            return {
                date: new Date(m.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
                partner: partner ? `${partner.name} ${partner.surname[0]}.` : '?',
                opponents: `${opp1 ? `${opp1.name} ${opp1.surname[0]}.` : '?'} & ${opp2 ? `${opp2.name} ${opp2.surname[0]}.` : '?'}`,
                myScore,
                oppScore,
                won,
            };
        });
    }, [player, playerMatches, getPlayerById]);

    if (!player) return null;

    const gridStrokeColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const axisStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <HIGSheet isOpen={true} onClose={onClose} title={`${player.name} ${player.surname}`} trailingAction={{ label: 'Chiudi', onPress: onClose }}>
            <div className="w-full flex flex-col">
                {/* Custom header info */}
                <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--ios-separator)]">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                            ELO: {player.currentElo.toFixed(2)}
                        </span>
                        {stats && stats.lastDelta > 0 && <ArrowUpIcon className="h-5 w-5 text-green-500" />}
                        {stats && stats.lastDelta < 0 && <ArrowDownIcon className="h-5 w-5 text-red-500" />}
                        {stats && stats.lastDelta === 0 && <ArrowStableIcon className="h-5 w-5 text-gray-400" />}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{player.position}</span>
                    </div>
                </div>

                {/* Body */}
                <main className="p-4 md:p-6 overflow-y-auto space-y-6">
                    {/* ELO Chart - same style as RankingChart */}
                    {eloChartData.length > 1 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Andamento ELO</h3>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <LineChart data={eloChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                                        <XAxis
                                            dataKey="eventIndex"
                                            tickFormatter={(tick) => tick === -1 ? 'Start' : `E${tick + 1}`}
                                            stroke={axisStrokeColor}
                                        />
                                        <YAxis
                                            type="number"
                                            domain={['dataMin - 20', 'dataMax + 20']}
                                            stroke={axisStrokeColor}
                                            tickFormatter={(v) => Number(v).toFixed(2)}
                                        />
                                        <Tooltip content={<CustomTooltip theme={theme} chartData={eloChartData} />} />
                                        <Line
                                            type="monotone"
                                            dataKey="elo"
                                            stroke="#38bdf8"
                                            strokeWidth={2}
                                            dot={{ r: 2 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Stats Grid */}
                    {stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Partite</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-green-600 dark:text-green-400">{stats.wins} <span className="text-sm font-normal">({stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : 0}%)</span></div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Vinte</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.gamesWon} <span className="text-sm font-normal text-gray-500">/ {stats.gamesLost}</span></div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Games V/P</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    {stats.form.map((won, i) => (
                                        <span key={i} className={`inline-block w-3.5 h-3.5 rounded-full ${won ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                    ))}
                                    {stats.form.length === 0 && <span className="text-sm text-gray-400">N/A</span>}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Form (ultime 5)</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-orange-500">{stats.bestStreak}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Best Streak</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                                <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(0) : 0}%</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Win Rate</div>
                            </div>
                        </div>
                    )}

                    {/* Partners & Opponents */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Compagni Frequenti</h3>
                            {partners.length === 0 ? (
                                <p className="text-sm text-gray-400">Nessun dato.</p>
                            ) : (
                                <div className="space-y-2">
                                    {partners.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {p.player!.name} {p.player!.surname}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {p.total} partite, {p.total > 0 ? ((p.wins / p.total) * 100).toFixed(0) : 0}% win
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Avversari Frequenti</h3>
                            {opponents.length === 0 ? (
                                <p className="text-sm text-gray-400">Nessun dato.</p>
                            ) : (
                                <div className="space-y-2">
                                    {opponents.map((o, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {o.player!.name} {o.player!.surname}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                {o.total} partite, {o.total > 0 ? ((o.wins / o.total) * 100).toFixed(0) : 0}% win
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Matches */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ultime 5 Partite</h3>
                        {recentMatches.length === 0 ? (
                            <p className="text-sm text-gray-400">Nessuna partita trovata.</p>
                        ) : (
                            <div className="space-y-1">
                                {recentMatches.map((m, i) => (
                                    <div key={i} className={`py-1.5 px-3 rounded-lg text-sm ${m.won ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono shrink-0 w-10">{m.date}</span>
                                            <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
                                                con <span className="font-medium">{m.partner}</span>
                                            </span>
                                            <span className={`shrink-0 w-7 text-center py-0.5 rounded text-xs font-bold text-white ${m.won ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-600'}`}>{m.myScore}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-10 shrink-0"></span>
                                            <span className="text-gray-600 dark:text-gray-300 truncate flex-1">
                                                vs <span className="font-medium">{m.opponents}</span>
                                            </span>
                                            <span className={`shrink-0 w-7 text-center py-0.5 rounded text-xs font-bold text-white ${!m.won ? 'bg-green-600' : 'bg-gray-400 dark:bg-gray-600'}`}>{m.oppScore}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </HIGSheet>
    );
};

export default PlayerProfileModal;
