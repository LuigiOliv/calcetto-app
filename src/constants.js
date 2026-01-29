// src/constants.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

export const ADMIN_EMAIL = 'luigi.oliviero@gmail.com';
export const DEFAULT_VOTE_VALUE = 6.0;

// =========================================================================
// DEFINIZIONI SKILL E RUOLI
// =========================================================================

export const SKILLS = {
    // Abilità Tecniche
    tecniche: ['Tiro', 'Passaggio corto', 'Passaggio lungo', 'Contrasto', 'Controllo'],
    // Abilità Tattiche
    tattiche: ['Visione di gioco', 'Senso della posizione', 'Spirito di sacrificio', 'Letture difensive', 'Costruzione'],
    // Abilità Fisiche
    fisiche: ['Resistenza', 'Scatto', 'Progressione', 'Presenza fisica', 'Cazzimma']
};

export const SKILLS_GOALKEEPER = {
    // Abilità Tecniche (Portiere)
    tecniche: ['Parate', 'Uscite', 'Rinvii (piedi)', 'Rilanci (mani)', 'Controllo palla'],
    // Abilità Tattiche (Portiere)
    tattiche: ['Posizionamento', 'Comunicazione', 'Lettura del gioco', 'Gestione area', 'Prima costruzione'],
    // Abilità Fisiche (Portiere)
    fisiche: ['Reattività/Agilità', 'Riflessi', 'Elevazione', 'Resistenza', 'Plasticità (tuffi)']
};

export const shortSKILLS = {
    // Mappatura breve per le skill di campo
    tecniche: ['TIR', 'PsC', 'PsL', 'CST', 'CTR'],
    tattiche: ['VIS', 'PSZ', 'SAC', 'DIF', 'REG'],
    fisiche: ['RES', 'SCT', 'PRG', 'FIS', 'CZM']
};

export const shortSKILLS_GK = {
    // Mappatura breve per le skill del portiere
    tecniche: ['PRT', 'USC', 'RNV', 'RLC', 'CTR'],
    tattiche: ['PSZ', 'CMZ', 'LET', 'GES', 'REG'],
    fisiche: ['AGL', 'RFL', 'ELV', 'RES', 'TUF']
};

export const ROLES = [
    'Portiere', 'Difensore centrale', 'Difensore laterale sx', 'Difensore laterale dx',
    'Centrocampista difensivo', 'Centrocampista offensivo', 'Mezzala sx', 'Mezzala dx', 'Centravanti'
];

// =========================================================================
// FUNZIONI HELPER
// =========================================================================

/**
 * Restituisce l'oggetto SKILLS appropriato in base al ruolo del giocatore.
 * @param {object} player - L'oggetto giocatore che include il campo isGoalkeeper.
 * @returns {object} SKILLS o SKILLS_GOALKEEPER.
 */
export const getSkillsForPlayer = (player) => {
    return player.isGoalkeeper ? SKILLS_GOALKEEPER : SKILLS;
};

/**
 * Restituisce l'oggetto shortSKILLS appropriato in base al ruolo del giocatore.
 * @param {object} player - L'oggetto giocatore che include il campo isGoalkeeper.
 * @returns {object} shortSKILLS o shortSKILLS_GK.
 */
export const getShortSkillsForPlayer = (player) => {
    return player.isGoalkeeper ? shortSKILLS_GK : shortSKILLS;
};

// =========================================================================
// CLASSIFICATION FORMULA CONFIGURATION
// =========================================================================

export const CLASSIFICATION_FORMULA = {
    CURRENT_WEIGHT: 0.90,              // Peso voto attuale (80%)
    PERFORMANCE_WEIGHT: 0.30,         // Peso rendimento recente (40%)
    CONSISTENCY_WEIGHT: 0.05,         // Peso costanza (5%)
    RECENT_MATCHES_FOR_PERFORMANCE: 10, // Finestra partite per calcolare rendimento
    CONSISTENCY_WINDOW: 5,            // Numero partite per calcolare costanza
    MIN_MATCHES_FOR_PERFORMANCE: 3     // Minimo partite nella finestra per essere eleggibili
};

// Add these new constant groups to your existing constants.js file:

// ============================================
// VOTING & RATING THRESHOLDS
// ============================================
export const VOTING = {
    MIN_VOTES_FOR_DISPLAY: 5,           // Numero minimo di valutazioni per comparire nelle classifiche
    MIN_VOTES_RECENT_FOR_LEADERBOARD: 3, // Numero minimo di valutazioni negli ultimi giorni per visualizzare la classifica
    RECENT_VOTES_WINDOW_MS: 5 * 24 * 60 * 60 * 1000, // Numero di giorni in millisecondi nei quali contare i voti recenti
    RECENT_VOTES_WINDOW: 5,              // Numero di giorni nei quali contare i voti recenti         
    SEED_VOTES_COUNT: 8,                 // Numero di voti seed quando l'amministratore modifica le valutazioni
    VOTE_MIN: 1,                         // Valore minimo del voto
    VOTE_MAX: 10,                        // Valore massimo del voto
    VOTE_STEP: 0.5,                      // Incremento del voto
    DEFAULT_VOTE: 6.0,                   // Voto di default quando non ci sono voti
};

export const RATING = {
    DEFAULT_BASE_RATING: 60.0,           // Rating di base quando non ci sono ancora voti
    DEFAULT_SKILL_VALUE: 6.0,            // Default skill value when no votes
    MIN_RATING: 50.0,                    // Minimum rating boundary
    MAX_RATING: 100.0,                   // Maximum rating boundary
    RATING_MIN: 1,                       // Rating scale minimum
    RATING_MAX: 4,                       // Rating scale maximum
    EXCELLENT_THRESHOLD: 7,              // Limite per colore rating eccellente
    GOOD_THRESHOLD: 6,                   // Limite per colore rating buono
};

// ============================================
// MATCH CONFIGURATION
// ============================================
export const MATCH = {
    MIN_MATCHES_FOR_VOTING: 3,           // Numero minimo di partite per essere valutati
    MAX_PLAYERS_OPTIONS: [10, 12, 14, 16, 18, 20], // Valid max player counts
    DEFAULT_MAX_PLAYERS: 16,             // Default maximum players per match
    DEFAULT_TIME: '21:20',               // Default match time
    DEFAULT_LOCATION: 'Campo SuperSantos, Portici', // Default match location
    MIN_PLAYERS_FOR_TEAMS: 2,            // Minimum players needed to assign teams
    MIN_MATCH_PLAYERS: 10,               // Minimum players validation
    MAX_MATCH_PLAYERS: 20,               // Maximum players validation
    MATCHES_QUERY_LIMIT: 20,             // Number of recent matches to fetch
};

// ============================================
// TIME & DEADLINES
// ============================================
export const DEADLINES = {
    REG_DEADLINE_DISPLAY_DAYS: 2,        // Fino a quanti giorni prima puoi registrarti alla partita
    REG_DEADLINE_DISPLAY_HOUR: 18,       // A che ora si chiudono le iscrizioni (ore)
    REG_DEADLINE_FORCED_MINUTES: 30,     // Quanti minuti prima della partita si chiudono le iscrizioni
    VOTING_DEADLINE_DAYS: 3,             // Entro quanti giorni dopo la partita si chiudono i voti
    VOTING_DEADLINE_HOUR: 23,            // A che ora si chiudono i voti (ore)
    VOTING_DEADLINE_MINUTE: 59,          // A che minuto si chiudono i voti
    VOTING_DEADLINE_SECOND: 59,          // A che secondo si chiudono i voti
    VOTING_OPENS_AFTER_HOURS: 2,         // Dopo quante ore dall'inizio della partita si aprono i voti
    MANUAL_OVERRIDE_DURATION_MS: 2 * 60 * 60 * 1000, // 2 hours override duration
    CANCELLED_OVERRIDE_DURATION_MS: 365 * 24 * 60 * 60 * 1000, // 1 year for cancelled
};

// ============================================
// DISPLAY & PAGINATION
// ============================================
export const DISPLAY = {
    LEADERBOARD_INITIAL_DISPLAY: 20,     // Initial number of players shown in leaderboard
    MACRO_CARD_INITIAL_DISPLAY: 10,      // Players shown per macro card
    TOP_SKILL_DISPLAY_COUNT: 5,          // Top N players per skill
    PODIUM_POSITIONS: 3,                 // Number of podium positions
    GOLD_POSITION: 0,                    // Posizione per medaglia d'oro 0 = posizione 1
    SILVER_POSITION: 1,                  // Posizione per medaglia d'argento
    BRONZE_POSITION: 2,                  // Posizione per medaglia di bronzo
};

// ============================================
// TEAM BALANCE & ALGORITHM
// ============================================
export const TEAM_BALANCE = {
    BALANCE_THRESHOLD: 0.1,              // Max difference for balanced teams
    DEFAULT_OVERALL_VALUE: 2.5,          // Default overall when no averages exist
    MAX_TEAM_SIZE_DIFFERENCE: 1,         // Max difference in team sizes
    MIN_GOALKEEPERS_FOR_SPLIT: 2,        // Minimum GKs to split between teams
};

// ============================================
// PROFILE & ROLES
// ============================================
export const PROFILE = {
    MIN_OTHER_ROLES_REQUIRED: 2,         // Numero minimo di altri ruoli da selezionare (se non sei GK)
    INITIALS_LENGTH: 2,                  // Number of characters for avatar initials
};

// ============================================
// UI & INTERACTION
// ============================================
export const UI = {
    SUCCESS_MESSAGE_DURATION_MS: 3000,   // Duration to show success messages
    RELOAD_DELAY_MS: 1000,               // Delay before page reload
    AUTH_INIT_DELAY_MS: 500,             // Delay before checking auth state
    SWIPE_THRESHOLD_PX: 60,              // Minimum swipe distance for tab change
    MOBILE_BREAKPOINT_PX: 768,           // Larghezza dei dispositivi per abilitare hard click (radar charts)
};

export const CLEAN_SHEET_MAX_GOALS = 2; // Clean sheet se avversari segnano <= 2 gol