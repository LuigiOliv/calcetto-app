// src/components/MatchDetailRouter.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import storage from '../storage.js';
import { MatchRegistrationView } from './Match.jsx';
import { MatchVotingView, MatchResultsView } from './Match/MatchDetails.jsx';
import utils from '../utils.js';

// ============================================================================
// ROUTER DETTAGLIO PARTITA
// ============================================================================

function MatchDetailRouter({ matchId, currentUser, onBack }) {
    const [match, setMatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        loadMatch();
        loadUsers();
    }, [matchId]);

    const loadUsers = async () => {
        try {
            const [allUsers, allMatches] = await Promise.all([
                storage.getUsers(),
                storage.getMatches()
            ]);
            const usersWithCount = allUsers.map(u => ({
                ...u,
                matchCount: utils.countPlayerMatches(u.id, allMatches, allUsers)
            }));
            setUsers(usersWithCount);
        } catch (error) {
            console.error('Errore caricamento utenti:', error);
        }
    };

    const loadMatch = async () => {
        setLoading(true);
        try {
            let data = await storage.getMatch(matchId);

            // Controlla e aggiorna status automaticamente
            data = await storage.checkAndUpdateMatchStatus(data);

            setMatch(data);
        } catch (error) {
            console.error('Errore caricamento partita:', error);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>Caricamento...</h2>
                </div>
            </div>
        );
    }

    if (!match) {
        return (
            <div className="section-container">
                <div className="no-votes">
                    <h3>Partita non trovata</h3>
                    <button className="btn btn-secondary" onClick={onBack}>
                        ← Torna alle Partite
                    </button>
                </div>
            </div>
        );
    }

    // ✅ NUOVO: Vista per partite annullate
    if (match.status === 'CANCELLED') {
        return (
            <div className="match-cancelled-view">
                <div className="cancelled-message">
                    <h2>❌ Partita Annullata</h2>
                    <p>Questa partita è stata annullata e non si svolgerà.</p>
                    {match.cancellationReason && (
                        <div className="cancellation-details">
                            <strong>Motivo:</strong> {match.cancellationReason}
                        </div>
                    )}
                    {match.cancelledAt && (
                        <div className="cancellation-date">
                            Annullata il: {new Date(match.cancelledAt).toLocaleString('it-IT')}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Router: quale vista mostrare in base allo status?
    if (match.status === 'OPEN' || match.status === 'CLOSED') {
        return (
            <MatchRegistrationView
                match={match}
                currentUser={currentUser}
                users={users}
                onBack={onBack}
                onUpdate={loadMatch}
            />
        );
    }

    if (match.status === 'VOTING') {
        return (
            <MatchVotingView
                match={match}
                currentUser={currentUser}
                users={users}
                onBack={onBack}
            />
        );
    }

    // COMPLETED - Vista Risultati
    return <MatchResultsView match={match} users={users} onBack={onBack} />;
}

export default MatchDetailRouter;