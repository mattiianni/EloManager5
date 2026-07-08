import React, { useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePadelStore } from '../hooks/usePadelStore.tsx';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { printEloChart } from '../services/printService.ts';
import { ChevronDownIcon, PrintIcon } from './ui/Icons.tsx';

const CustomTooltip: React.FC<any> = ({ active, payload, label, theme }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-3 rounded-md shadow-lg ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'}`}>
                <p className="label">{`Event #${label + 1}`}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} style={{ color: pld.color }}>
                        {`${pld.name}: ${pld.value.toFixed(2)}`}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const COLORS = ['#38bdf8', '#818cf8', '#f87171', '#fbbf24', '#4ade80', '#a78bfa', '#f472b6', '#2dd4bf'];

interface RankingChartProps {
    theme: 'light' | 'dark';
    selectedSeriesKey?: string | null; // giornataName || name
}

const CHART_CONTAINER_ID = 'elo-chart-container';

const RankingChart: React.FC<RankingChartProps> = ({ theme, selectedSeriesKey }) => {
    const { players, eloHistory, tournaments } = usePadelStore();
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(true);
    const chartDataRef = useRef<any[]>([]);

    const playersWithHistory = useMemo(() =>
        players.filter(p => eloHistory.some(h => h.playerId === p.id)),
        [players, eloHistory]
    );

    const handlePrintChart = async () => {
        const originalSelected = [...selectedPlayerIds];
        try {
            // Select all players with history to compute full chart data
            setSelectedPlayerIds(playersWithHistory.map(p => p.id));

            // Wait for React re-render so chartData (and ref) updates
            await new Promise(resolve => requestAnimationFrame(() => {
                setTimeout(resolve, 250);
            }));

            printEloChart(
                chartDataRef.current,
                playersWithHistory.map(p => p.id),
                players,
            );
        } catch (error) {
            console.error('Error during print:', error);
        } finally {
            setSelectedPlayerIds(originalSelected);
        }
    };

    const handlePlayerSelection = (playerId: string) => {
        setSelectedPlayerIds(prev =>
            prev.includes(playerId)
                ? prev.filter(id => id !== playerId)
                : [...prev, playerId]
        );
    };

    const chartData = useMemo(() => {
        if (selectedPlayerIds.length === 0) return [];
        
        const seriesEventIdsOrdered: string[] | null = selectedSeriesKey
            ? [...tournaments]
                .filter(t => (t.giornataName || t.name) === selectedSeriesKey)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(t => t.id)
            : null;

        const eventDates = new Map<string, string>();
        tournaments.forEach(t => { eventDates.set(t.id, t.date); });
        eloHistory.forEach(e => { if (!eventDates.has(e.eventId)) eventDates.set(e.eventId, e.date); });

        let orderedEventIds: string[] = [];
        if (seriesEventIdsOrdered && seriesEventIdsOrdered.length > 0) {
            orderedEventIds = seriesEventIdsOrdered;
        } else {
            const playerEvents = eloHistory.filter(e => selectedPlayerIds.includes(e.playerId));
            const uniqueEventIds = [...new Set(playerEvents.map(e => e.eventId))];
            orderedEventIds = uniqueEventIds.sort((a, b) => new Date(eventDates.get(a) || '').getTime() - new Date(eventDates.get(b) || '').getTime());
        }
        
        const data: any[] = [];

        // Build fast lookup maps per player: first entry per event (for eloBefore), last entry per event (for eloAfter)
        const perPlayerEventFirstEntry = new Map<string, Map<string, typeof eloHistory[number]>>();
        // Also compute per-event DELTA SUM strictly within this series
        const perPlayerEventDeltaSum = new Map<string, Map<string, number>>();

        selectedPlayerIds.forEach(playerId => {
            const historyForPlayer = eloHistory
                .filter(e => e.playerId === playerId)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const firstMap = new Map<string, typeof eloHistory[number]>();
            const deltaMap = new Map<string, number>();

            historyForPlayer.forEach(entry => {
                if (!firstMap.has(entry.eventId)) firstMap.set(entry.eventId, entry);
                // Accumulate delta per event
                const prev = deltaMap.get(entry.eventId) || 0;
                deltaMap.set(entry.eventId, prev + (entry.delta || 0));
            });

            perPlayerEventFirstEntry.set(playerId, firstMap);
            perPlayerEventDeltaSum.set(playerId, deltaMap);
        });

        // Initial point = rating immediately BEFORE the first giornata of the selected series
        const initialPoint: any = { eventIndex: -1 };
        const firstEventId = orderedEventIds[0];
        const firstEventDate = firstEventId ? new Date(eventDates.get(firstEventId) || 0).getTime() : 0;

        const playerInitialBase = new Map<string, number>();
        selectedPlayerIds.forEach(playerId => {
            const historyForPlayer = eloHistory
                .filter(e => e.playerId === playerId)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const priorEntry = historyForPlayer
                .filter(e => new Date(e.date).getTime() < firstEventDate)
                .slice(-1)[0];

            const firstEntryInEvent = perPlayerEventFirstEntry.get(playerId)?.get(firstEventId || '');

            let base: number;
            if (firstEntryInEvent) {
                base = firstEntryInEvent.eloBefore;
            } else if (priorEntry) {
                base = priorEntry.eloAfter;
            } else {
                const player = players.find(p => p.id === playerId);
                base = player ? player.initialElo : 0;
            }
            playerInitialBase.set(playerId, base);
            initialPoint[playerId] = base;
        });
        data.push(initialPoint);

        // For each giornata, add the delta SUM of that giornata to the cumulative value.
        // If a player did not play that giornata, delta=0 (carry-over).
        const cumulativeByPlayer = new Map<string, number>();
        selectedPlayerIds.forEach(pid => cumulativeByPlayer.set(pid, 0));

        orderedEventIds.forEach((eventId, index) => {
            const point: any = { eventIndex: index };

            selectedPlayerIds.forEach(playerId => {
                const deltaMap = perPlayerEventDeltaSum.get(playerId);
                const deltaForEvent = deltaMap ? (deltaMap.get(eventId) || 0) : 0;
                const cum = (cumulativeByPlayer.get(playerId) || 0) + deltaForEvent;
                cumulativeByPlayer.set(playerId, cum);
                point[playerId] = (playerInitialBase.get(playerId) || 0) + cum;
            });

            data.push(point);
        });

        // Diagnostic log: show the built series for current selection
        try {
            const seriesForLog = data.map(d => {
                const obj: any = { idx: d.eventIndex };
                selectedPlayerIds.forEach(pid => { obj[pid] = d[pid]; });
                return obj;
            });
            // eslint-disable-next-line no-console
            console.table(seriesForLog);
            // eslint-disable-next-line no-console
            console.debug('selectedSeriesKey:', selectedSeriesKey, 'events:', orderedEventIds);
        } catch {}

        return data;
    }, [selectedPlayerIds, players, eloHistory, tournaments, selectedSeriesKey]);

    // Keep ref in sync with latest chartData for print
    chartDataRef.current = chartData;

    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
    
    const gridStrokeColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
    const axisStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <Card title={
            <div
                className="flex items-center justify-between gap-3 cursor-pointer"
                onClick={() => setIsCollapsed(prev => !prev)}
                role="button"
                aria-expanded={!isCollapsed}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsCollapsed(prev => !prev);
                    }
                }}
            >
                <div className="flex items-center gap-2">
                    <span>ELO History</span>
                    <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                </div>
                <Button
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePrintChart();
                    }}
                    size="sm"
                    variant="secondary"
                    disabled={playersWithHistory.length === 0}
                >
                    <span className="flex items-center gap-1"><PrintIcon /> Stampa Grafico ELO</span>
                </Button>
            </div>
        } className="mt-8">
            {!isCollapsed && (
            <div id={CHART_CONTAINER_ID}>
                <div className="mb-4 player-select-wrapper no-print">
                    <h4 className="font-semibold mb-2">Seleziona Grafico Giocatore:</h4>
                    <div className="flex flex-wrap gap-2">
                        {sortedPlayers.map(player => (
                            <label key={player.id} className="flex items-center space-x-2 cursor-pointer bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600">
                                <input
                                    type="checkbox"
                                    checked={selectedPlayerIds.includes(player.id)}
                                    onChange={() => handlePlayerSelection(player.id)}
                                    className="form-checkbox h-4 w-4 rounded text-sky-500 bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-sky-500"
                                />
                                <span>{player.name} {player.surname}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {selectedPlayerIds.length > 0 && chartData.length > 1 ? (
                    <>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={gridStrokeColor} />
                                    <XAxis
                                        dataKey="eventIndex"
                                        tickFormatter={(tick) => tick >= 0 ? `E${tick + 1}` : 'Start'}
                                        stroke={axisStrokeColor}
                                        allowDecimals={false}
                                    />
                                    <YAxis 
                                        type="number" 
                                        domain={['dataMin - 20', 'dataMax + 20']} 
                                        stroke={axisStrokeColor}
                                        tickFormatter={(tick) => Number(tick).toFixed(2)}
                                    />
                                    <Tooltip content={<CustomTooltip theme={theme} />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        wrapperStyle={{ paddingTop: '20px' }}
                                    />
                                    {selectedPlayerIds.map((id, index) => {
                                        const player = players.find(p => p.id === id);
                                        if (!player) return null;
                                        return (
                                            <Line
                                                key={id}
                                                type="monotone"
                                                dataKey={id}
                                                name={`${player.name} ${player.surname}`}
                                                stroke={COLORS[index % COLORS.length]}
                                                strokeWidth={2}
                                                dot={{ r: 2 }}
                                                activeDot={{ r: 6 }}
                                                isAnimationActive={true}
                                            />
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <div className="h-96 flex items-center justify-center text-gray-500">
                        {selectedPlayerIds.length === 0 
                            ? "Seleziona uno o più giocatori per visualizzare la progressione ELO."
                            : "No ELO history available for the selected players."
                        }
                    </div>
                )}
            </div>
            )}
        </Card>
    );
};

export default RankingChart;
