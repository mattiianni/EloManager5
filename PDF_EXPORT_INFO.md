# PDF Export

Il sistema di export usa `window.print()` su una finestra separata con HTML e CSS generati lato client.

## Funzioni disponibili

In `services/printService.ts` sono presenti:

- `printChart`
- `printEloChart`
- `printRanking`
- `printTournamentReport`
- `printBlankScoreSheet`
- `printGironiTournament`
- `printTournamentStatistics`
- `printBeatTheBoxBlank`
- `printBeatTheBoxComplete`
- `printTorneoLiberoBlank`
- `printTorneoLiberoComplete`
- `printPlayerProfiles`
- `printTeamTournamentRoundRobinSchedule`
- `printTeamTournamentMatchdayCalendar`
- `printTeamTournamentMatchdayReport`
- `printTeamTournamentReport`
- `printTeamTournamentStatistics`

## Formati coperti

- classifica generale
- grafico ELO
- report torneo standard
- statistiche torneo
- scheda vuota torneo
- Gironi + Fase Finale
- Beat the Box
- Torneo Libero
- Torneo a Squadre:
  - calendario round robin
  - report torneo (classifica + giornate)
  - report singola giornata
  - statistiche (PDF separato)
- profili giocatore

## Implementazione

Pattern usato:

1. `window.open('', '_blank')`
2. scrittura HTML completo
3. `setTimeout(...)`
4. `window.print()`
5. `window.close()`

## Note pratiche

- alcuni export usano timeout piu' lunghi per dare tempo al browser di renderizzare SVG e font
- il formato prevalente e' `A4`
- i popup blocker possono bloccare la finestra di stampa
- da `v4.0.9`, i report `Gironi + Fase Finale` mantengono renderer dedicato, tipografia riallineata e flusso iOS coerente con le stampe storiche
- le intestazioni delle giornate multi-torneo usano `Nome Torneo - N^ Giornata`; la data resta nella riga informativa del PDF
- i blocchi principali usano regole anti-taglio per ridurre separazioni fra intestazioni e contenuto in anteprima/stampa
