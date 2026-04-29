// src/utils.js
// © 2026 Luigi Oliviero | Sportivity App | Tutti i diritti riservati

import { SKILLS, SKILLS_GOALKEEPER, getSkillsForPlayer, CLASSIFICATION_FORMULA, MATCH, PROFILE } from './constants.js';

const utils = {
    calculateAverages: (playerId, votes, player) => {
        const playerVotes = votes.filter(v => v.playerId === playerId);
        if (playerVotes.length === 0) return null;
        const averages = {};
        const skills = player ? getSkillsForPlayer(player) : SKILLS;
        const allSkills = [...skills.tecniche, ...skills.tattiche, ...skills.fisiche];
        allSkills.forEach(skill => {
            const values = playerVotes.map(v => v.ratings[skill]).filter(v => v !== undefined);
            if (values.length > 0) {
                averages[skill] = values.reduce((a, b) => a + b, 0) / values.length;
            }
        });
        return averages;
    },

    calculateOverall: (averages) => {
        if (!averages) return null;
        const values = Object.values(averages);
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    calculateCategoryOverall: (averages, category, player) => {
        if (!averages) return null;
        const skills = player ? getSkillsForPlayer(player) : SKILLS;
        const categorySkills = skills[category];
        const values = categorySkills.map(s => averages[s]).filter(v => v !== undefined);
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
    },

    countVotes: (playerId, votes) => {
        return votes.filter(v => v.playerId === playerId).length;
    },

    toBase10: (value) => {
        return (value / 4) * 10;
    },

    getInitials: (name) => {
        if (!name) return '??';
        return name.substring(0, PROFILE.INITIALS_LENGTH).toUpperCase();
    },

    // ============================================================================
    // FORMULA-BASED CLASSIFICATION SYSTEM
    // ============================================================================

    /**
     * Recupera lo storico delle partite completate per un giocatore
     */
    getPlayerMatchHistory: (playerId, matches) => {
        if (!matches || matches.length === 0) return [];

        return matches
            .filter(match => {
                if (match.status !== 'COMPLETED') return false;
                const gialliPlayers = match.teams?.gialli || [];
                const verdiPlayers = match.teams?.verdi || [];
                // OLD: return gialliPlayers.includes(playerId) || verdiPlayers.includes(playerId);
                // NEW: Check if player object exists in team arrays
                return gialliPlayers.some(p => p.playerId === playerId) ||
                    verdiPlayers.some(p => p.playerId === playerId);
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    /**
     * Calcola il rendimento (performance) di un giocatore basato sulle ultime N partite.
     * @param {string} playerId - ID del giocatore
     * @param {Array} allMatches - Tutte le partite (viene presa la finestra delle ultime N)
     * @param {Array} matchVotes - Tutti i voti delle partite
     * @param {number} windowSize - Dimensione finestra (default 10)
     * @param {number} minMatchesInWindow - Minimo partite giocate nella finestra (default 3)
     */

    calculatePerformance: (playerId, allMatches, matchVotes, windowSize = 10, minMatchesInWindow = 3) => {
        // Get the last N matches overall (most recent first)
        const recentMatches = allMatches
            .filter(m => m.status === 'COMPLETED')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, windowSize);

        // Check how many of those matches this player participated in
        const playerMatches = recentMatches.filter(match => {
            const gialliPlayers = match.teams?.gialli || [];
            const verdiPlayers = match.teams?.verdi || [];
            return gialliPlayers.some(p => p.playerId === playerId) ||
                verdiPlayers.some(p => p.playerId === playerId);
        });

        // If player hasn't played any matches in the window, return null
        if (playerMatches.length === 0) {
            return null;  // No data = no contribution
        }
        // Note: minMatchesInWindow is only used for "Rendimento" ranking visibility
        // For OVR calculation, we use any matches available (1, 2, or more)

        const ratings = [];

        // Collect all ratings for this player from their matches in the window
        playerMatches.forEach(match => {
            const matchVotesList = matchVotes.filter(mv => mv.matchId === match.id);

            matchVotesList.forEach(voterData => {
                if (voterData.votes && voterData.votes[playerId] !== undefined) {
                    ratings.push(voterData.votes[playerId]);
                }
            });
        });

        if (ratings.length === 0) return null;
        return ratings.reduce((a, b) => a + b, 0) / ratings.length;
    },

    /**
     * Calcola la costanza (quante partite giocate delle ultime N)
     */
    calculateConsistency: (matchHistory, windowSize = 10) => {
        if (!matchHistory || matchHistory.length === 0) return 0;
        const matchesPlayed = Math.min(matchHistory.length, windowSize);
        return matchesPlayed / windowSize;
    },

    /**
     * Calcola l'overall usando la formula ponderata
     * Formula: new_vote = (current_vote * x) + (performance * y) + (consistency * z)
     */
    calculateFormulaBasedOverall: (averages, playerId, matches, matchVotes, formula) => {
        const currentVote = utils.calculateOverall(averages);
        if (!currentVote) return null;
        const base10 = utils.toBase10(currentVote);

        // Ultime N partite completate (finestra presenze)
        const recentMatches = matches
            .filter(m => m.status === 'COMPLETED')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, formula.RECENT_MATCHES_FOR_PERFORMANCE);

        // Partite giocate dal giocatore in quella finestra
        const playerRecentMatches = recentMatches.filter(match => {
            const gialli = match.teams?.gialli || [];
            const verdi = match.teams?.verdi || [];
            return gialli.some(p => p.playerId === playerId) ||
                verdi.some(p => p.playerId === playerId);
        });
        const n = playerRecentMatches.length;

        // Media matchVotes nelle ultime CONSISTENCY_WINDOW partite giocate
        const recentRatings = [];
        playerRecentMatches
            .slice(0, formula.CONSISTENCY_WINDOW)
            .forEach(match => {
                const matchVotesList = matchVotes.filter(mv => mv.matchId === match.id);
                matchVotesList.forEach(voterData => {
                    if (voterData.votes && voterData.votes[playerId] !== undefined) {
                        recentRatings.push(voterData.votes[playerId]);
                    }
                });
            });

        const rendimento = recentRatings.length > 0
            ? recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length
            : base10; // fallback neutro: usa la base stessa

        const multiplier = 1 + (n - 2) * (formula.PRESENCE_FACTOR + formula.PERFORMANCE_FACTOR * (rendimento / 10));
        const finalVote10 = base10 * multiplier;

        return (finalVote10 / 10) * 4;
    },

    /**
     * Check if two players have played together in at least one match
     * @param {string} playerId1 - First player ID
     * @param {string} playerId2 - Second player ID
     * @param {Array} matches - Array of matches
     * @returns {boolean} - True if they played together
     */
    havePlayedTogether: (playerId1, playerId2, matches) => {
        return matches.some(match => {
            const gialliPlayers = match.teams?.gialli || [];
            const verdiPlayers = match.teams?.verdi || [];

            const player1InMatch = gialliPlayers.some(p => p.playerId === playerId1) ||
                verdiPlayers.some(p => p.playerId === playerId1);
            const player2InMatch = gialliPlayers.some(p => p.playerId === playerId2) ||
                verdiPlayers.some(p => p.playerId === playerId2);

            return player1InMatch && player2InMatch;
        });
    },

    /**
     * Get players that current user can vote for
     */
    getVoteablePlayers: (currentUser, users, matches, votes) => {
        if (!currentUser) return [];

        return users.filter(u => {
            if (u.id === currentUser.id) return false;
            if (u.id.startsWith('seed')) return false;

            const matchCount = utils.countPlayerMatches(u.id, matches);
            if (matchCount < MATCH.MIN_MATCHES_FOR_VOTING) return false;

            if (currentUser.hasVotedOffline && u.isInitialPlayer) return false;

            if (!utils.havePlayedTogether(currentUser.id, u.id, matches)) return false;

            const alreadyVoted = votes.some(v =>
                v.voterId === currentUser.id && v.playerId === u.id
            );
            if (alreadyVoted) return false;

            return true;
        });
    },

    // ============================================================================
    // GENERAZIONE ID GIOCATORI
    // ============================================================================

    generatePlayerId: (users) => {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const datePrefix = `player${month}${year}`; // Es: player122025

        // Trova tutti gli ID che iniziano con questo prefisso
        const todayPlayers = users.filter(u => u.id.startsWith(datePrefix));

        // Estrai i numeri progressivi esistenti
        const existingNumbers = todayPlayers
            .map(u => {
                const match = u.id.match(/_(\d+)$/); // Estrai numero dopo _
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => !isNaN(n));

        // Calcola il prossimo numero
        const nextNumber = existingNumbers.length > 0
            ? Math.max(...existingNumbers) + 1
            : 1;

        return `${datePrefix}_${nextNumber}`;
    },

    // ============================================================================
    // HELPER FUNCTIONS PER PARTITE
    // ============================================================================

    formatMatchDate: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]}`;
    },

    formatMatchDateFull: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
        const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]} ${date.getFullYear()}`;
    },

    formatTime: (dateString) => {
        const date = new Date(dateString);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    formatDeadlineDisplay: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
        const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
            'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
        return `${giorni[date.getDay()]} ${date.getDate()} ${mesi[date.getMonth()]}`;
    },

    formatDeadline: (dateString) => {
        const date = new Date(dateString);
        const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        const day = date.getDate();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${giorni[date.getDay()]} ${day}, ${hours}:${minutes}`;
    },

    renderGoalkeeperIcons: (count) => {
        if (count === 0) return '';
        if (count === 1) return '🧤';
        return '🧤🧤';
    },

    getPlayerNameById: (playerId, users) => {
        if (users && users.length > 0) {
            const player = users.find(u => u.id === playerId);
            if (player) return player.name;
        }
        return playerId;
    },

    countPlayerMatches: (playerId, matches, users = []) => {
        if (!matches || matches.length === 0) {
            // Se non ci sono partite, restituisci solo le previousMatches
            const player = users.find(u => u.id === playerId);
            return player?.previousMatches || 0;
        }

        const completedMatches = matches.filter(match => {
            if (match.status !== 'COMPLETED') return false;
            const gialliPlayers = match.teams?.gialli || [];
            const verdiPlayers = match.teams?.verdi || [];
            return gialliPlayers.some(p => p.playerId === playerId) ||
                verdiPlayers.some(p => p.playerId === playerId);
        }).length;

        // Aggiungi le previousMatches se esistono
        const player = users.find(u => u.id === playerId);
        const previousMatches = player?.previousMatches || 0;

        return completedMatches + previousMatches;
    },

    /**
 * Calcola quante volte un giocatore è stato MVP (voto più alto della partita)
 */
    calculateMVPCount(playerId, matches, allMatchVotes) {
        let mvpCount = 0;

        matches.forEach(match => {
            if (match.status !== 'COMPLETED') return;

            const matchVotesForMatch = allMatchVotes.filter(mv => mv.matchId === match.id);
            if (matchVotesForMatch.length === 0) return;

            // Calcola media voti per ogni giocatore in questa partita
            const playerAverages = {};

            matchVotesForMatch.forEach(voteDoc => {
                Object.entries(voteDoc.votes || {}).forEach(([pid, rating]) => {
                    if (!playerAverages[pid]) {
                        playerAverages[pid] = { total: 0, count: 0 };
                    }
                    playerAverages[pid].total += rating;
                    playerAverages[pid].count += 1;
                });
            });

            // Trova il giocatore con la media più alta
            let maxAverage = 0;
            let mvpId = null;

            Object.entries(playerAverages).forEach(([pid, data]) => {
                const average = data.total / data.count;
                if (average > maxAverage) {
                    maxAverage = average;
                    mvpId = pid;
                }
            });

            if (mvpId === playerId) {
                mvpCount++;
            }
        });

        return mvpCount;
    },

    /**
     * Dal nuovo array goals[], restituisce il miglior marcatore (escludendo autogoal).
     * @returns {{ playerId, playerName, count }|null}
     */
    getTopScorerFromGoals(goals) {
        if (!goals || goals.length === 0) return null;
        const normal = goals.filter(g => !g.isOwnGoal && g.count > 0);
        if (normal.length === 0) return null;
        return normal.reduce((best, g) => g.count > best.count ? g : best);
    },

    /**
     * Restituisce il capocannoniere di una partita (nuovo formato goals[] o fallback legacy topScorer).
     * @returns {{ playerName, count }|null}
     */
    getMatchTopScorer(match) {
        if (match.goals && match.goals.length > 0) {
            const top = this.getTopScorerFromGoals(match.goals);
            return top ? { playerName: top.playerName, count: top.count } : null;
        }
        // Fallback legacy
        if (match.topScorer) {
            return { playerName: match.topScorer, count: match.topScorerGoals || 0 };
        }
        return null;
    },

    /**
     * Calcola il totale gol normali (non autogoal) di un giocatore in tutte le partite COMPLETED.
     */
    calculatePlayerGoals(playerId, matches) {
        let total = 0;
        matches.forEach(match => {
            if (match.status !== 'COMPLETED' || !match.goals) return;
            match.goals.forEach(g => {
                if (g.playerId === playerId && !g.isOwnGoal) total += g.count;
            });
        });
        return total;
    },

    /**
     * Calcola il totale autogoal di un giocatore in tutte le partite COMPLETED.
     */
    calculatePlayerOwnGoals(playerId, matches) {
        let total = 0;
        matches.forEach(match => {
            if (match.status !== 'COMPLETED' || !match.goals) return;
            match.goals.forEach(g => {
                if (g.playerId === playerId && g.isOwnGoal) total += g.count;
            });
        });
        return total;
    },

    /**
     * Calcola quante volte un giocatore è stato capocannoniere.
     * Usa goals[] se disponibile, altrimenti fallback a topScorer legacy (per nome).
     */
    calculateTopScorerCount(playerId, playerName, matches) {
        let topScorerCount = 0;

        matches.forEach(match => {
            if (match.status !== 'COMPLETED') return;

            if (match.goals && match.goals.length > 0) {
                const top = this.getTopScorerFromGoals(match.goals);
                if (top && top.playerId === playerId) topScorerCount++;
            } else if (match.topScorer === playerName) {
                // Fallback legacy: confronto per nome
                topScorerCount++;
            }
        });

        return topScorerCount;
    },

    /**
     * Calcola quanti clean sheet ha fatto un portiere
     */
    calculateCleanSheets(playerId, playerName, matches, maxGoals) {
        let cleanSheetCount = 0;

        matches.forEach(match => {
            if (match.status !== 'COMPLETED') return;

            // Trova in quale squadra giocava il portiere
            let playerTeam = null;
            if (match.teams?.gialli?.some(p => p.playerId === playerId || p.playerName === playerName)) {
                playerTeam = 'gialli';
            } else if (match.teams?.verdi?.some(p => p.playerId === playerId || p.playerName === playerName)) {
                playerTeam = 'verdi';
            }

            if (!playerTeam) return;

            // Verifica se era portiere in quella partita
            const teamPlayers = match.teams[playerTeam];
            const playerInMatch = teamPlayers.find(p => p.playerId === playerId || p.playerName === playerName);
            if (!playerInMatch?.isGoalkeeper) return;

            // Calcola gol subiti (gol della squadra avversaria)
            const opposingTeam = playerTeam === 'gialli' ? 'verdi' : 'gialli';
            const goalsAgainst = match.score?.[opposingTeam] || 0;

            if (goalsAgainst <= maxGoals) {
                cleanSheetCount++;
            }
        });

        return cleanSheetCount;
    },

    /**
     * Calcola vittorie/pareggi/sconfitte di un giocatore.
     * @param {string} playerId
     * @param {Array} matches - Partite già filtrate al giocatore (COMPLETED)
     */
    calculateWDL(playerId, matches) {
        let wins = 0, draws = 0, losses = 0;
        matches.forEach(match => {
            if (!match.score) return;
            let playerTeam = null;
            if (match.teams?.gialli?.some(p => p.playerId === playerId)) playerTeam = 'gialli';
            else if (match.teams?.verdi?.some(p => p.playerId === playerId)) playerTeam = 'verdi';
            if (!playerTeam) return;
            const myScore = match.score[playerTeam];
            const theirScore = match.score[playerTeam === 'gialli' ? 'verdi' : 'gialli'];
            if (myScore > theirScore) wins++;
            else if (myScore === theirScore) draws++;
            else losses++;
        });
        return { wins, draws, losses, total: wins + draws + losses };
    },

    /**
     * Restituisce le ultime N risultati del giocatore come array di stringhe 'V'/'P'/'S'.
     * L'array è ordinato dalla partita più vecchia alla più recente (sinistra→destra).
     * @param {string} playerId
     * @param {Array} matches - Partite già filtrate al giocatore, ordinate per data desc
     * @param {number} n - Numero massimo di risultati (default 5)
     */
    getFormStreak(playerId, matches, n = 5) {
        const results = [];
        for (const match of matches) {
            if (results.length >= n) break;
            if (!match.score) continue;
            let playerTeam = null;
            if (match.teams?.gialli?.some(p => p.playerId === playerId)) playerTeam = 'gialli';
            else if (match.teams?.verdi?.some(p => p.playerId === playerId)) playerTeam = 'verdi';
            if (!playerTeam) continue;
            const myScore = match.score[playerTeam];
            const theirScore = match.score[playerTeam === 'gialli' ? 'verdi' : 'gialli'];
            if (myScore > theirScore) results.push('V');
            else if (myScore === theirScore) results.push('P');
            else results.push('S');
        }
        return results.reverse(); // oldest → newest for display
    },

    /**
     * Restituisce lo storico delle medie voti ricevuti dal giocatore partita per partita.
     * Ordinato dal più vecchio al più recente (per sparkline left→right).
     * @param {string} playerId
     * @param {Array} matches - Partite già filtrate al giocatore, ordinate per data desc
     * @param {Array} matchVotes - Tutti i voti partita
     * @param {number} n - Massimo partite da includere (default 8)
     * @returns {Array<{date: string, avg: number}>}
     */
    getMatchVoteHistory(playerId, matches, matchVotes, n = 8) {
        const history = [];
        for (const match of matches) {
            if (history.length >= n) break;
            const votes = matchVotes
                .filter(mv => mv.matchId === match.id)
                .flatMap(mv => mv.votes?.[playerId] !== undefined ? [mv.votes[playerId]] : []);
            if (votes.length === 0) continue;
            const avg = votes.reduce((a, b) => a + b, 0) / votes.length;
            history.push({ date: match.date, avg });
        }
        return history.reverse(); // oldest → newest for chart
    }
};

export default utils;
};