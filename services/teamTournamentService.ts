import { TeamTournamentMatchday, TeamTournamentTeam, TeamTournamentConfig } from '../types.ts';

export interface TeamTournamentStandingRow {
    teamNumber: number;
    teamName: string;
    played: number;
    won: number;
    lost: number;
    points: number;
    gamesFor: number;
    gamesAgainst: number;
    gamesDiff: number;
}

const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const calculateTeamTournamentStandings = (
    teams: TeamTournamentTeam[],
    matchdays: TeamTournamentMatchday[],
    scoringType: TeamTournamentConfig['scoringType']
): TeamTournamentStandingRow[] => {
    const teamNameByNumber = new Map<number, string>();
    teams.forEach(t => teamNameByNumber.set(t.teamNumber, t.name));

    const rows = new Map<number, TeamTournamentStandingRow>();
    const ensure = (teamNumber: number) => {
        if (!rows.has(teamNumber)) {
            rows.set(teamNumber, {
                teamNumber,
                teamName: teamNameByNumber.get(teamNumber) || `Squadra ${teamNumber}`,
                played: 0,
                won: 0,
                lost: 0,
                points: 0,
                gamesFor: 0,
                gamesAgainst: 0,
                gamesDiff: 0,
            });
        }
        return rows.get(teamNumber)!;
    };

    matchdays
        // Standings are based on the Round Robin phase only (finals must not affect the table).
        .filter(md => (md.phase ?? 'round_robin') === 'round_robin')
        .filter(md => md.status === 'completed' && md.summary)
        .forEach(md => {
            const t1 = ensure(md.team1Number);
            const t2 = ensure(md.team2Number);

            t1.played += 1;
            t2.played += 1;

            const s = md.summary || {};
            const t1Points = safeNum(s.team1Points);
            const t2Points = safeNum(s.team2Points);
            const t1Games = safeNum(s.team1Games);
            const t2Games = safeNum(s.team2Games);

            t1.points += t1Points;
            t2.points += t2Points;

            t1.gamesFor += t1Games;
            t1.gamesAgainst += t2Games;
            t2.gamesFor += t2Games;
            t2.gamesAgainst += t1Games;

            const winner = s.winner || null;
            if (winner === 'team1') {
                t1.won += 1;
                t2.lost += 1;
            } else if (winner === 'team2') {
                t2.won += 1;
                t1.lost += 1;
            }
        });

    rows.forEach(r => {
        r.gamesDiff = r.gamesFor - r.gamesAgainst;
    });

    const arr = Array.from(rows.values());
    // Ensure rows exist for all teams even if 0 played
    teams.forEach(t => ensure(t.teamNumber));

    const primaryKey = (r: TeamTournamentStandingRow) =>
        scoringType === 'Differenza Games' ? r.gamesDiff : r.points;

    return Array.from(rows.values()).sort((a, b) => {
        const pA = primaryKey(a);
        const pB = primaryKey(b);
        if (pB !== pA) return pB - pA;
        if (b.gamesDiff !== a.gamesDiff) return b.gamesDiff - a.gamesDiff;
        if (b.gamesFor !== a.gamesFor) return b.gamesFor - a.gamesFor;
        return a.teamName.localeCompare(b.teamName);
    });
};

export const standingsUpToMatchday = (
    teams: TeamTournamentTeam[],
    allMatchdays: TeamTournamentMatchday[],
    scoringType: TeamTournamentConfig['scoringType'],
    matchdayId: string
) => {
    const idx = allMatchdays.findIndex(md => md.id === matchdayId);
    const slice = idx >= 0 ? allMatchdays.slice(0, idx + 1) : allMatchdays;
    return calculateTeamTournamentStandings(teams, slice, scoringType);
};
