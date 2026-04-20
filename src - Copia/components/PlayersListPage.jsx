// src/components/PlayersListPage.jsx
// © 2026 Luigi Oliviero | Sportivity App | Tutti i diritti riservati

// NEW:
import { useMemo } from 'react';
import utils from '../utils.js';
import { MATCH } from '../constants.js';


function PlayersListPage({ users = [], currentUser, votes = [], matches = [], onSelectPlayer }) {

    // Find this useMemo and modify the filter
    const playersToVote = useMemo(() => {
        return utils.getVoteablePlayers(currentUser, users, matches, votes)
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