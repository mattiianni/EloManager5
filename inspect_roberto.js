import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.NEON_DATABASE_URL || process.env.DATABASE_URL);

async function run() {
    // Fix: per le giornate con giornata_name valorizzato, day_label deve essere il NAME del record (che è il nome giornata)
    // Beat the Box -> name="Beat the Box", giornata_name="TorneOtto Inverno 2025" -> day_label deve essere "Beat the Box"
    // King of the Court -> name="King of the Court" -> day_label deve essere "King of the Court"
    // Americano -> name="Americano" -> day_label deve essere "Americano"
    await sql`
        UPDATE tournaments
        SET day_label = name
        WHERE giornata_name IS NOT NULL
          AND type NOT IN ('Torneo a Squadre')
    `;
    console.log('Fixed day_label for giornate with giornata_name');

    // Verify
    const rows = await sql`
        SELECT name, type, giornata_name, day_label, date
        FROM tournaments 
        ORDER BY date
    `;
    console.log('\n=== RISULTATO FINALE ===\n');
    for (const r of rows) {
        const d = r.date ? new Date(r.date).toLocaleDateString('it-IT') : '?';
        console.log(`${(r.name||'').padEnd(26)}| type: ${(r.type||'').padEnd(22)}| day_label: ${r.day_label}  [${d}]`);
    }
    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
