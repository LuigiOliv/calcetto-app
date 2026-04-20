// src/components/MatchesPage.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import storage from '../storage.js';
import { MatchCard } from './Match.jsx';

function MatchesPage({ currentUser, users = [], onSelectMatch }) {
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMatches();
    }, []);

    const loadMatches = async () => {
        setLoading(true);
        try {
            const data = await storage.getMatches();

            // Controlla e aggiorna status automaticamente
            const updatedMatches = await Promise.all(
                data.map(match => storage.checkAndUpdateMatchStatus(match))
            );

            setMatches(updatedMatches);
        } catch (error) {
            console.error('Errore caricamento partite:', error);
        }
        setLoading(false);
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>🏆 Le Prossime Partite</h2>
            </div>

            {loading ? (
                <div className="no-votes">
                    <h3>Caricamento partite...</h3>
                </div>
            ) : matches.length === 0 ? (
                <div className="no-votes">
                    <h3>Nessuna partita in programma</h3>
                    <p>L'admin creerà presto la prossima partita!</p>
                </div>
            ) : (
                <div className="matches-list">
                    {matches.map(match => (
                        <MatchCard
                            key={match.id}
                            match={match}
                            currentUser={currentUser}
                            users={users}
                            onClick={() => onSelectMatch(match.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default MatchesPage;