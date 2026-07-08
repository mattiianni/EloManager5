import { Tournament, TournamentType } from '../types.ts';

const compareTournamentDaysChronologically = (a: Tournament, b: Tournament): number => {
    const byDate = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (byDate !== 0) return byDate;

    const byName = a.name.localeCompare(b.name, 'it');
    if (byName !== 0) return byName;

    return a.id.localeCompare(b.id, 'it');
};

export const getTournamentSeriesKey = (tournament: Tournament): string =>
    tournament.giornataName || tournament.name;

const getNonTeamSeriesTournaments = (tournament: Tournament, tournaments: Tournament[]): Tournament[] =>
    tournaments
        .filter(t =>
            t.type !== TournamentType.TorneoASquadre &&
            getTournamentSeriesKey(t) === getTournamentSeriesKey(tournament)
        )
        .sort(compareTournamentDaysChronologically);

export const getCompletedTournamentDayDisplayName = (
    tournament: Tournament,
    tournaments: Tournament[]
): string => {
    if (tournament.type === TournamentType.TorneoASquadre || tournament.status !== 'completed') {
        return tournament.name;
    }

    // Torneo Libero giornaliero: keep grouping by series key, but always display
    // the user-defined tournament name for that specific day.
    if (tournament.type === TournamentType.TorneoLibero) {
        return tournament.name;
    }

    const seriesDays = getNonTeamSeriesTournaments(tournament, tournaments);
    if (seriesDays.length <= 1) return tournament.name;

    const dayIndex = seriesDays.findIndex(t => t.id === tournament.id);
    const dayNumber = dayIndex >= 0 ? dayIndex + 1 : 1;
    const seriesName = getTournamentSeriesKey(tournament);

    return `${seriesName} - ${dayNumber}^ Giornata`;
};

export const getTournamentDisplayName = (
    tournament: Tournament,
    tournaments: Tournament[]
): string => getCompletedTournamentDayDisplayName(tournament, tournaments);
