# Changelog

## v4.1.11 — 2026-06-27
### Modifiche Algoritmo ELO & UI
- Risolto errore matematico di arrotondamento `Math.round()` che azzerava i decimali nel calcolo dei delta ELO, ripristinando la precisione decimale fluttuante cronologica partita per partita.
- Aggiornata l'etichetta "Avg ELO" in Dashboard a "MEDIA ELO" calcolando in modo dinamico la sola media della Top 50% dei giocatori.
- Corretta la UI in "Sorteggi" da "ELO Medio" a "ELO" per maggiore aderenza terminologica (essendo in realtà la stima combinata della coppia).
- Sistemati i colori di testo in contrasto (testo invisibile) sui box di avviso informativi (`bg-ios-blue`).
## v4.1.10 — 2026-06-26
### Modifiche UI/UX & Fix
- Logo Header Mobile: ricentrato in posizione assoluta e ridotto in altezza (-10%) per dare respiro alla UI senza rompere gli allineamenti.
- Header Mobile (Pulsanti destro): le icone `Giorno/Notte` ed `Esci` sono ora impilate in verticale per risparmiare spazio orizzontale. Pulsante tema leggermente scalato (-25%).
- Aggiunto alert di conferma ("Sei sicuro di voler uscire?") al tocco dell'icona `Esci` per evitare logout accidentali (fat finger).

## v4.1.9 — 2026-06-26
### Modifiche UI/UX (Mobile/PWA)
- Header: spostato il logo centrale leggermente a sinistra per distanziarlo dal toggle tema su schermi stretti.
- Sorteggi: rimossi i padding ridondanti (`px-4`) che causavano uno schiacciamento anomalo dei contenuti all'interno delle card su mobile.
- Giocatori: riorganizzato il layout della lista spostando le icone di azione (info, modifica, elimina) in una riga separata sotto il nome e ruolo, risolvendo il troncamento del nome.
- Admin: rinominato il tab "Codici Accesso" in "Accessi" per evitare wrapping fastidiosi che rompevano il controllo segmentato.

## v4.1.8 — 2026-06-26
### Modifiche UI/UX
- Sostituito il titolo di testo nell'intestazione e nello Splash Screen con i nuovi loghi ufficiali (\`elomanager.png\` ed \`elomanager_w.png\`).
- Implementato lo switch automatico dell'immagine in base al tema di sistema (chiaro/scuro).
- Ribilanciate le proporzioni dell'intestazione superiore: altezza aumentata a 80px e dimensioni del logo adattate (~20% più grandi) per una leggibilità ottimale sia su Desktop che Mobile.
- Aggiornate icone favicon e PWA.
- Risolti problemi di layout (sbordamento) nella stampa PDF delle partite a 3 set.

## v4.1.7 — 2026-06-26
### Operazioni di Rilascio / Infrastruttura
- Verificata la piena compatibilità dei file di deploy (`vercel.json`, `package.json`, `vite.config.ts`) con l'infrastruttura di Vercel, prendendo come riferimento il branch del precedente repository `PadelManager2`. 
- Il repository è formalmente pronto per lo switch di produzione su Vercel: non è stata necessaria alcuna modifica ai parametri in quanto già conformi.

## v4.1.6 — 2026-06-25
### Modifiche e Fix (HIG)
- Completata traduzione in italiano di tutti i popup e dei messaggi di sistema residui (es. risultati, alert di salvataggio torneo, ecc.).
- Risolto un difetto grafico sui popup `HIGSheet` in modalità mobile, aggiungendo padding interno (`px-4`) per evitare che testi e pulsanti toccassero i bordi dello schermo.
- Ingrandito font dell'intestazione principale (Padel Elo Manager) di +4 step (a 20px) per una migliore leggibilità.
- Eseguita profonda pulizia del repository rimuovendo oltre 45 script monouso temporanei.

Questo file consolida gli storici precedentemente salvati come `UPDATE_SUMMARY_*.md`.

## v4.1.5 — 2026-06-19

- Deploy: Configurato deploy su Vercel e risolte incompatibilità Serverless (incluso pass a `bcryptjs`).
- Admin: Evidenziato l'accesso di utenti non-admin nell'Audit Log con pill rossa.
- UI Layout: Allineato il nome del workspace sotto versione e data nell'header desktop.
- Riferimenti versione aggiornati a `4.1.5` e data a `Giu 2026`.

## v4.1.4 — 2026-05-01

- Admin: tab `Invia dati` + API per copiare un torneo tra workspace (dati indipendenti).
- UI Stitch: classe `.stitch-row` riutilizzabile applicata a righe interne (Top 5) e alle card giornate in `Tornei`.
- Statistiche: pill `Dati parziali` con contrasto corretto anche in dark.

## v4.1.3 — 2026-05-01

- Admin: cancellazione workspace con conferma e guardrail (non attuale, non ultimo).
- Access codes: scadenza rapida (`Nessuna / 8h / 24h / 48h / 7 giorni`), login bloccato per scaduti, stato UI `Attivo / Scaduto / Disattivato`.
- Mobile/PWA: form `Genera Nuovo Codice` riposizionato.
- PWA/assets: `public/icon.svg` riallineata al PNG.

## v4.1.2 — 2026-05-01

- Matchday torneo a squadre mobile/PWA: footer azioni stabilizzato durante il salvataggio.
- Sidebar desktop light: contrasto corretto e selezione attiva piu' evidente.
- PWA: icone/manifest riallineati agli asset PNG reali.
- Mese riferimento aggiornato a `Mag 2026`.

## v4.1.1 — 2026-04-30

- Header: metadata alleggeriti e icone leggermente piu' scure.
- Dashboard: KPI principali riallineati al colore del titolo.

## v4.1.0 — 2026-04-30

- Versioning: nuova routine patch-first (4.1.0 -> 4.1.1 -> ...).
- Reskin UI consolidato (Stitch) senza cambiare logica applicativa.
- Light mode: contrasto corretto nelle aree reskinnate.
- PWA: refresh piu' aggressivo e asset coerenti.

## v4.0.12 — 2026-04-30

- Presentazione HTML: link reale allo sviluppatore (mailto) + versione aggiornata.

## v4.0.11 — 2026-04-30

- Tornei a squadre (eliminazione diretta): fix fixture con BYE e propagazione turni.
- Admin: endpoint reset bracket eliminazione diretta.
- PDF: stampa esplicita `BYE` al posto di placeholder.
- UX mobile: back/chiusura risultati rientrano su `Tornei`.
- Header: titolo mobile-first (una riga su iPhone/PWA).

## v4.0.10 — 2026-04-28

- iOS PWA safe-area: spostato padding bottom nel main scroll container (senza cambiare sizing interno).

## v4.0.9 — 2026-04-27

- Mobile/PWA: fix overflow data su form tornei linkati e team/playoff.
- Team tournament: action bar mobile migliorata; `Modifica Risultati` instradato alla matchday page dedicata.
- Header mobile: sticky piu' sicuro (safe area) e scroll isolation migliore.
- Sidebar mobile: layering corretto (drawer sopra header).
