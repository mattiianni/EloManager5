# ELO Implementation

## Formula Base
L'app calcola la variazione ELO di ogni partita utilizzando la formula ELO classica.
Il K-factor è stato standardizzato a `K=16` globale per tutti i tornei, tutte le fasi, e tutte le partite, per assicurare l'assoluta integrità matematica ed evitare inflazioni.

- Punteggio per vittoria: 1
- Punteggio per sconfitta: 0
- Punteggio per pareggio (non usato): 0.5

Il calcolo della forza relativa (Expectancy) è basato su una scala di 400 punti.

## Implementazione (server.js)
Tutto il calcolo è eseguito sul server nella funzione `calculateEloChange()`. Il server processa ogni match in maniera atomica. L'aggiunta di risultati o la modifica del K non si riflette retroattivamente a meno che non si utilizzi lo script di ricalcolo o l'endpoint admin dedicato.

## Admin Ricalcolo Globale
L'endpoint `/api/admin/recalculate-elos` esegue un ricalcolo cronologico puro. Partendo da 1500 per ogni giocatore e da un database `elo_history` vuoto, cicla tutte le partite mai giocate nell'ordine in cui sono state concluse (usando la data del torneo e il `created_at` del match). Ad ogni partita riapplica l'algoritmo (K=16), aggiorna lo stato ELO dei 4 giocatori, e infine persiste il tutto nel database. Questo garantisce che la history sia sempre matematicamente immacolata, anche se nel passato c'erano stati bug o K-factors diversi.
