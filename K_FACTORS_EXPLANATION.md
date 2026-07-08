# ELO K-Factors Configuration (Aggiornamento V4.2)

A partire da questo aggiornamento, il sistema Padel ELO Manager utilizza un approccio puramente matematico e oggettivo per il calcolo delle variazioni ELO.
Sono stati rimossi tutti i K-Factor asimmetrici e specifici per torneo, per adottare un K-factor globale fisso.

## La Regola del K=16 Globale
Tutte le partite, in tutti i formati di torneo (TorneOtto, Americano, Gironi, Finali 1°-2° o 7°-8°), utilizzano uno standard unico:

**K = 16**

Questo garantisce la massima integrità matematica dell'algoritmo ELO:
1. **Nessuna Inflazione**: I punti totali in palio sono sempre a somma zero tra le due coppie (chi vince guadagna esattamente quello che l'avversario perde).
2. **Equità Assoluta**: Una finale 3°-4° posto non è più penalizzante rispetto ad una finale 1°-2°. 
3. **Auto-Bilanciamento**: Le coppie molto forti che affrontano coppie molto deboli vinceranno pochissimi punti, mentre rischieranno di perderne molti in caso di "upset" (sorpresa). Questo è garantito nativamente dalla formula ELO, senza alcun bisogno di "truccare" i K-factor per le finali.

Le vecchie configurazioni asimmetriche e "anti-inversione" (es. K=32/10) sono state rimosse per evitare sbilanciamenti a lungo termine e frustrazione nei giocatori delle fasce minori.
