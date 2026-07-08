# Database Schema

Schema allineato all'implementazione attuale in `server.js`.

Database: `Neon PostgreSQL`

## Tabelle applicative

### `players`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | VARCHAR(255) | obbligatorio |
| `surname` | VARCHAR(255) | obbligatorio |
| `position` | VARCHAR(50) | `Sinistra`, `Destra`, `Indifferente` |
| `initial_elo` | REAL | default `1500` |
| `current_elo` | REAL | default `1500` |
| `workspace_id` | UUID FK | scope workspace |

### `tournaments`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | VARCHAR(255) | nome torneo o giornata |
| `type` | VARCHAR(100) | formato torneo |
| `date` | TIMESTAMPTZ | data torneo |
| `club` | VARCHAR(255) | circolo |
| `status` | VARCHAR(20) | `scheduled` o `completed` |
| `americano_fields` | INTEGER | solo Americano |
| `americano_scoring_type` | VARCHAR(20) | `games-diff` o `points` |
| `final_standings` | JSONB | usato per final standings salvate |
| `giornata_name` | VARCHAR(255) | nome serie per giornate collegate |
| `team_tournament_root_id` | UUID | per Torneo a Squadre: id root (i record giornata puntano qui) |
| `workspace_id` | UUID FK | scope workspace |

### `matches`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `date` | TIMESTAMPTZ | data match |
| `created_at` | TIMESTAMPTZ | ordering stabile di inserimento |
| `team1_p1_id` | UUID FK | player 1 team 1 |
| `team1_p2_id` | UUID FK | player 2 team 1 |
| `team2_p1_id` | UUID FK | player 1 team 2 |
| `team2_p2_id` | UUID FK | player 2 team 2 |
| `sets` | JSONB | array set |
| `winner` | VARCHAR(10) | `team1`, `team2`, `draw`, `null` |
| `tournament_id` | UUID FK | opzionale |
| `workspace_id` | UUID FK | scope workspace |

### `elo_history`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `event_id` | UUID | match o tournament id |
| `player_id` | UUID FK | player collegato |
| `elo_before` | REAL | ELO pre-evento |
| `elo_after` | REAL | ELO post-evento |
| `delta` | REAL | variazione |
| `date` | TIMESTAMPTZ | timestamp evento |
| `type` | VARCHAR(50) | `match`, `tournament`, `manual` |
| `workspace_id` | UUID FK | scope workspace |

## Tabelle auth/admin

### `workspaces`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | VARCHAR(255) | obbligatorio |
| `owner_name` | VARCHAR(255) | opzionale |
| `owner_email` | VARCHAR(255) | opzionale |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |
| `is_active` | BOOLEAN | default `true` |
| `settings` | JSONB | default `{}` |

### `access_codes`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `code_hash` | VARCHAR(255) | bcrypt hash univoco |
| `code_plain` | VARCHAR(10) | visibile in admin se disponibile |
| `workspace_id` | UUID FK | workspace di appartenenza |
| `label` | VARCHAR(255) | etichetta admin |
| `is_admin` | BOOLEAN | accesso admin |
| `is_active` | BOOLEAN | codice attivo o revocato |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `expires_at` | TIMESTAMPTZ | opzionale |
| `last_used_at` | TIMESTAMPTZ | ultimo login |
| `failed_attempts` | INTEGER | default `0` |
| `locked_until` | TIMESTAMPTZ | lock temporaneo |

### `audit_logs`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `workspace_id` | UUID FK | opzionale |
| `action` | VARCHAR(100) | tipo evento |
| `ip_address` | VARCHAR(45) | IPv4 o IPv6 |
| `user_agent` | TEXT | opzionale |
| `details` | JSONB | metadata evento |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

## Indici rilevanti

- `idx_players_workspace`
- `idx_tournaments_workspace`
- `idx_matches_workspace`
- `idx_elo_history_workspace`
- `idx_access_codes_workspace`
- `idx_audit_logs_workspace`

## Isolamento dati

Tutte le query applicative filtrano per `workspace_id`.

In pratica:

- un workspace vede solo i propri giocatori
- i tornei, match ed ELO history sono isolati
- gli endpoint admin lavorano cross-workspace

## Formati torneo supportati in DB

- `TorneOtto 30'`
- `Americano`
- `Round Robin + Finali`
- `Friendly Match`
- `Beat the Box`
- `Torneo Libero`
- `Gironi + Fase Finale`
- `Torneo a Squadre`

## Tabelle Torneo a Squadre

Le tabelle del Torneo a squadre sono collegate al torneo root (record in `tournaments`) e al suo `workspace_id` tramite la FK su `tournaments`.

### `team_tournament_configs`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tournament_id` | UUID FK | unique, punta al torneo root |
| `initial_team_count` | INTEGER | numero squadre iniziale |
| `default_players_per_team` | INTEGER | numero giocatori di riferimento |
| `format` | VARCHAR(50) | es. `ROUND ROBIN` |
| `matches_per_day` | INTEGER | `3` o `5` |
| `round_robin_final_phase` | VARCHAR(50) | scelta fase finale |
| `scoring_type` | VARCHAR(50) | `Punti` o `Differenza Games` |
| `config_completed` | BOOLEAN | configurazione completata |
| `schedule_json` | JSONB | calendario round robin |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

### `team_tournament_teams`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `tournament_id` | UUID FK | torneo root |
| `team_number` | INTEGER | numero progressivo |
| `name` | VARCHAR(255) | nome squadra |
| `target_player_count` | INTEGER | obiettivo giocatori (modificabile) |
| `players` | JSONB | array di `{ name, surname }` |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

### `team_tournament_matchdays`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `root_tournament_id` | UUID FK | torneo root |
| `tournament_day_id` | UUID FK | unique, record in `tournaments` per la giornata |
| `date` | TIMESTAMPTZ | data giornata |
| `team1_number` | INTEGER | squadra A |
| `team2_number` | INTEGER | squadra B |
| `round_number` | INTEGER | numero giornata RR |
| `phase` | VARCHAR(30) | `round_robin` o playoff |
| `matches_per_day` | INTEGER | `3` o `5` |
| `status` | VARCHAR(20) | `scheduled` o `completed` |
| `summary_json` | JSONB | riepilogo partita (win/points/games) |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

### `team_tournament_matchday_matches`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `matchday_id` | UUID FK | collega a `team_tournament_matchdays` |
| `match_index` | INTEGER | 1..3 o 1..5 |
| `team1_players` | JSONB | `{ name, surname }[]` |
| `team2_players` | JSONB | `{ name, surname }[]` |
| `sets` | JSONB | array set come negli altri match |
| `winner` | VARCHAR(10) | `team1`, `team2`, `draw`, `null` |
| `cancelled` | BOOLEAN | match cancellato (non giocato) |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

### `team_tournament_fixtures`

| Campo | Tipo | Note |
|---|---|---|
| `id` | UUID PK | `gen_random_uuid()` |
| `root_tournament_id` | UUID FK | torneo root |
| `phase` | VARCHAR(30) | es. `semifinal`, `final_1_2` |
| `slot` | INTEGER | progressivo per fase |
| `team1_number` | INTEGER | puo' essere `NULL` finche' non determinato |
| `team2_number` | INTEGER | puo' essere `NULL` finche' non determinato |
| `depends_on` | JSONB | dipendenze (se presenti) |
| `status` | VARCHAR(20) | `planned`, `scheduled`, `completed` |
| `tournament_day_id` | UUID FK | giornata playoff (se creata) |
| `matchday_id` | UUID FK | matchday (se creata) |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

## Note implementative

- `ON DELETE CASCADE` e' usato sulle FK principali
- i `sets` sono salvati come JSONB
- i tornei multi-giornata usano `giornata_name`
- l'ordine dei match in un torneo dipende da `created_at` e `date`
