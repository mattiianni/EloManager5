import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

async function run() {
    const eloHistory = await sql`
        SELECT eh.*
        FROM elo_history eh
        JOIN players p ON eh.player_id = p.id
        WHERE p.surname = 'Marianelli' AND p.name = 'Roberto'
          AND eh.date::date IN ('2025-11-21'::date, '2025-10-17'::date)
    `;
    
    const tournaments = await sql`
        SELECT id, name, type, parent_tournament_name, giornata_name, date, day_label
        FROM tournaments
        WHERE date::date IN ('2025-11-21'::date, '2025-10-17'::date)
    `;

    const matches = await sql`
        SELECT id, date, tournament_id FROM matches WHERE date::date IN ('2025-11-21'::date, '2025-10-17'::date)
    `;

    function resolveEventContextSim(entry) {
        let parentTournamentName = null;
        let dayLabel = '';
        let dateOfDay = entry.date;

        if (entry.type === 'tournament') {
            const tournament = tournaments.find(t => t.id === entry.eventId);
            if (tournament) {
                const isSingleOrCoppie = tournament.type !== 'Torneo a Squadre';
                parentTournamentName = tournament.parentTournamentName || tournament.giornataName || (isSingleOrCoppie ? tournament.name : null);
                dayLabel = tournament.giornataName || tournament.type;
                dateOfDay = tournament.date;
            } else {
                const entryDate = new Date(entry.date).toISOString().split('T')[0];
                const byDate = tournaments.find(t =>
                    new Date(t.date).toISOString().split('T')[0] === entryDate &&
                    t.type !== 'Torneo a Squadre'
                );
                if (byDate) {
                    parentTournamentName = byDate.parentTournamentName || byDate.giornataName || byDate.name;
                    dayLabel = byDate.giornataName || byDate.type;
                    dateOfDay = byDate.date;
                } else {
                    parentTournamentName = entry.sourceLabel || null;
                    dayLabel = entry.sourceLabel || 'Giornata Torneo';
                }
            }
        } else if (entry.type === 'match') {
            // Ramo match aggiunto
            const match = matches.find(m => m.id === entry.eventId);
            if (match && match.tournamentId) {
                const tournament = tournaments.find(t => t.id === match.tournamentId);
                if (tournament) {
                    const isSingleOrCoppie = tournament.type !== 'Torneo a Squadre';
                    parentTournamentName = tournament.parentTournamentName || tournament.giornataName || (isSingleOrCoppie ? tournament.name : null);
                    dayLabel = tournament.giornataName || tournament.type;
                    dateOfDay = tournament.date;
                } else {
                    dayLabel = 'Giornata Torneo';
                }
            } else {
                dayLabel = 'Partita Amichevole';
            }
        }
        return { parentTournamentName, dayLabel };
    }

    console.log('\n--- SIMULAZIONE EVENTI CON RAMO MATCH ---');
    for (const h of eloHistory) {
        const res = resolveEventContextSim(h);
        console.log(`Entry type: ${h.type}, event_id: ${h.event_id}, source_label: ${h.source_label} | Risolto parent: "${res.parentTournamentName}", giornata: "${res.dayLabel}"`);
    }
    
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
