// src/StatsEngine.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import utils from './utils.js';
import { VOTING, RATING } from './constants.js';
import { ROLES, SKILLS, getSkillsForPlayer } from './constants.js'; // Importa le costanti

/**
 * Logica Complessa di Calcolo del Rating (Simulazione)
 * * Questo modulo prende i dati grezzi (utenti e voti) e li elabora in un 
 * formato di statistiche comprensibile, calcolando il Rating.
 */

const STATS_ENGINE = (function () {

    /**
     * Calcola il ratingg di un singolo giocatore in base ai suoi voti.
     * @param {Array<object>} playerVotes - Tutti i voti ricevuti dal giocatore.
     * @returns {number} Il Rating calcolato.
     */
    const calculateRating = (playerVotes) => {
        if (!playerVotes || playerVotes.length === 0) {
            // Rating di base se non ci sono voti
            return RATING.DEFAULT_BASE_RATING;
        }

        // Il Rating è calcolato principalmente sulla media dei voti Match (generali)
        const matchVotes = playerVotes.map(v => v.matchVote).filter(v => v !== undefined);

        if (matchVotes.length === 0) {
            return RATING.DEFAULT_BASE_RATING;
        }

        const sumMatchVotes = matchVotes.reduce((sum, vote) => sum + vote, 0);
        const avgMatchVote = sumMatchVotes / matchVotes.length;

        // Mappa da media 1-10 a rating 50-100 (Formula molto semplificata)
        // Esempio: 5.0 -> 50, 7.5 -> 75, 10.0 -> 100
        const baseRating = avgMatchVote * 10;

        // Aggiusta con la media dei voti skill (peso minore)
        const allSkillVotes = playerVotes
            .flatMap(v => {
                if (!v.skillVotes || typeof v.skillVotes !== 'object') return [];
                return Object.values(v.skillVotes);
            })
            .filter(v => v !== undefined && v !== null);

        const avgSkillVote = allSkillVotes.length > 0 ?
            allSkillVotes.reduce((sum, vote) => sum + vote, 0) / allSkillVotes.length : RATING.DEFAULT_SKILL_VALUE;

        // Piccola correzione basata sulle skill: (AvgSkill - 6.0) * 2
        const skillCorrection = (avgSkillVote - RATING.DEFAULT_SKILL_VALUE) * 2;

        let finalRating = baseRating + skillCorrection;

        // Limita il rating tra 50 e 100
        finalRating = Math.max(RATING.MIN_RATING, Math.min(RATING.MAX_RATING, finalRating));

        return utils.round(finalRating, 2);
    };

    /**
     * Aggrega e calcola tutte le statistiche per tutti gli utenti.
     * @param {Array<object>} users - Lista di tutti gli utenti.
     * @param {Array<object>} votes - Lista di tutti i voti.
     * @param {Array<object>} matches - Lista di tutte le partite (Opzionale).
     * @returns {Array<object>} Lista di utenti con statistiche aggiunte.
     */
    const getStats = (users, votes, matches = []) => {
        // Mappa per un accesso rapido ai voti per ogni giocatore votato
        const votesByVotedPlayer = votes.reduce((acc, vote) => {
            acc[vote.votedPlayerId] = acc[vote.votedPlayerId] || [];
            acc[vote.votedPlayerId].push(vote);
            return acc;
        }, {});

        // Mappa per un accesso rapido ai match a cui ha partecipato l'utente (non solo votato)
        const participationByPlayer = matches.reduce((acc, match) => {
            if (match.participants) {
                match.participants.forEach(playerId => {
                    acc[playerId] = acc[playerId] || [];
                    acc[playerId].push(match);
                });
            }
            return acc;
        }, {});


        const statsUsers = users.map(user => {
            const playerVotes = votesByVotedPlayer[user.id] || [];
            const participatedMatches = participationByPlayer[user.id] || [];

            // 1. Calcola Rating
            const currentRating = calculateRating(playerVotes);

            // 2. Statistiche di Base
            const stats = {
                rating: currentRating,
                matchesPlayed: participatedMatches.filter(m => m.status === 'COMPLETED').length,
                totalVotesReceived: playerVotes.length,

                // 3. Statistiche Vittorie/Sconfitte (Semplificate)
                wins: 0,
                losses: 0,
                draws: 0,

                // 4. Statistiche Skill Medie
                avgSkills: calculateAvgSkills(playerVotes, user),

                // 5. Statistiche Portieri (Se applicabile)
                // ... (Logica per calcolo Clean Sheets, Gol Subiti, etc.)

            };

            // Calcolo Wins/Losses/Draws
            participatedMatches.filter(m => m.status === 'COMPLETED' && m.score && m.teams).forEach(match => {
                const team = match.teams.gialli.includes(user.id) ? 'gialli' :
                    match.teams.verdi.includes(user.id) ? 'verdi' : null;

                if (team) {
                    if (match.score.gialli > match.score.verdi) {
                        if (team === 'gialli') stats.wins++; else stats.losses++;
                    } else if (match.score.verdi > match.score.gialli) {
                        if (team === 'verdi') stats.wins++; else stats.losses++;
                    } else {
                        stats.draws++;
                    }
                }
            });

            stats.winRate = stats.matchesPlayed > 0 ? utils.round((stats.wins / stats.matchesPlayed) * 100, 1) : 0;

            return { ...user, stats };
        });

        return statsUsers;
    };

    /**
     * Calcola la media di ogni skill votata per un giocatore.
     * @param {Array<object>} playerVotes - Tutti i voti ricevuti dal giocatore.
     * @param {string} role - Ruolo del giocatore per determinare le skill rilevanti.
     * @returns {object} Oggetto con medie skill { "Passaggio": 7.5, ... }
     */
    const calculateAvgSkills = (playerVotes, player) => {  // Pass player object, not role string!
        // Get correct skill set based on isGoalkeeper
        const skillSet = getSkillsForPlayer(player);  // This returns SKILLS or SKILLS_GOALKEEPER

        // Flatten all skills from tecniche, tattiche, fisiche, mentali
        const relevantSkills = [
            ...skillSet.tecniche,
            ...skillSet.tattiche,
            ...skillSet.fisiche,
            ...skillSet.mentali
        ];
        const skillTotals = {};
        const skillCounts = {};

        if (playerVotes.length === 0) {
            // Se non ci sono voti, ritorna 6.0 per tutte le skill rilevanti
            const defaultSkills = {};
            relevantSkills.forEach(skill => defaultSkills[skill] = 6.0);
            return defaultSkills;
        }

        playerVotes.forEach(vote => {
            if (vote.skillVotes) {
                Object.keys(vote.skillVotes).forEach(skillName => {
                    const value = vote.skillVotes[skillName];
                    if (relevantSkills.includes(skillName) && value >= 1 && value <= 10) {
                        skillTotals[skillName] = (skillTotals[skillName] || 0) + value;
                        skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
                    }
                });
            }
        });

        const avgSkills = {};
        relevantSkills.forEach(skill => {
            avgSkills[skill] = skillCounts[skill] > 0 ?
                utils.round(skillTotals[skill] / skillCounts[skill], 2) :
                6.0; // Valore di base se non votato
        });

        return avgSkills;
    };

    return {
        getStats,
        calculateRating,
        calculateAvgSkills
    };

})();

// Esporta il motore di statistiche
export default STATS_ENGINE;