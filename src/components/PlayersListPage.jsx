// src/components/PlayersListPage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

// NEW:
import { useMemo } from 'react';
import utils from '../utils.js';
import { MATCH } from '../constants.js';


function PlayersListPage({ users = [], currentUser, votes = [], matches = [], onSelectPlayer }) {

    // Find this useMemo and modify the filter
    const playersToVote = useMemo(() => {
        if (!currentUser) return [];

        return users
            .filter(u => {
                if (u.id === currentUser.id) return false;
                if (u.id.startsWith('seed')) return false;

                // NEW: Check minimum matches requirement
                const matchCount = utils.countPlayerMatches(u.id, matches);
                if (matchCount < MATCH.MIN_MATCHES_FOR_VOTING) return false;

                // Filter out initial players if user has voted offline
                if (currentUser.hasVotedOffline && u.isInitialPlayer) return false;

                // Check if already voted
                const alreadyVoted = votes.some(v =>
                    v.voterId === currentUser.id && v.playerId === u.id
                );
                if (alreadyVoted) return false;

                // NEW: Check if current user has played at least one match with this player
                const hasPlayedTogether = matches.some(match => {
                    const gialliPlayers = match.teams?.gialli || [];
                    const verdiPlayers = match.teams?.verdi || [];
                    
                    const currentUserInMatch = gialliPlayers.some(p => p.playerId === currentUser.id) ||
                                              verdiPlayers.some(p => p.playerId === currentUser.id);
                    const targetPlayerInMatch = gialliPlayers.some(p => p.playerId === u.id) ||
                                               verdiPlayers.some(p => p.playerId === u.id);
                    
                    // They played together if both were in the same match
                    return currentUserInMatch && targetPlayerInMatch;
                });

                return hasPlayedTogether;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [users, currentUser, votes, matches]);

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Seleziona un giocatore da valutare</h2>
            </div>

            {playersToVote.length === 0 ? (
                <div className="no-votes">
                    <h3>🎉 Ottimo lavoro, hai valutato tutti!</h3>
                    {currentUser.hasVotedOffline && (
                        <p>Hai già votato tutti. Potrai votare i nuovi iscritti.</p>
                    )}
                </div>
            ) : (
                <div className="players-grid">
                    {playersToVote.map(player => (
                        <div key={player.id} className="player-card" onClick={() => onSelectPlayer(player.id)}>
                            <div className="avatar">
                                {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                            </div>
                            <h3>{player.name} {player.isGoalkeeper && '🧤'}</h3>
                            <div className="status">
                                {player.isGoalkeeper && <span className="goalkeeper-badge">🧤 PORTIERE</span>}
                                {!player.isInitialPlayer && <span className="new-badge">⭐ NUOVO</span>}
                                <div>Clicca per valutare</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default PlayersListPage;