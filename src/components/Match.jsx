// src/components/Match.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import React, { useState, useEffect } from 'react';
import utils from '../utils.js';
import storage from '../storage.js';

// ============================================================================
// MATCH CARD (Scheda Partita nella Lista)
// ============================================================================

export function MatchCard({ match, currentUser, users, onClick }) {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRegistrations();
    }, [match.id]);

    const loadRegistrations = async () => {
        try {
            const regs = await storage.getRegistrations(match.id);
            setRegistrations(regs);
        } catch (error) {
            console.error('Errore caricamento iscrizioni:', error);
        }
        setLoading(false);
    };

    const getStatusBadge = () => {
        // ✅ NUOVO: Badge per partite annullate
        if (match.status === 'CANCELLED') {
            return { text: '❌ ANNULL.', class: 'cancelled' };
        }

        if (match.status === 'OPEN' || match.status === 'CLOSED') {
            return { text: '📝 APERTA', class: 'open' };
        }
        if (match.status === 'VOTING') {
            return { text: '⭐ DA VOTARE', class: 'voting' };
        }
        return { text: '✅ FINITA', class: 'completed' };
    };

    const countGoalkeepers = () => {
        return registrations.filter(r => r.isGoalkeeper).length;
    };

    const status = getStatusBadge();
    const gkCount = countGoalkeepers();

    if (loading) {
        return (
            <div className="match-card">
                <div className="match-card-center">
                    <h3>Caricamento...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className={`match-card ${status.class}`} onClick={onClick}>
            <div className="match-card-left">
                <span className={`match-status ${status.class}`}>{status.text}</span>
            </div>
            <div className="match-card-center">
                <h3>{utils.formatMatchDate(match.date)}</h3>
            </div>
            <div className="match-card-right">
                {(match.status === 'OPEN' || match.status === 'CLOSED') && (
                    <>
                        <div className="match-info">
                            👥 {registrations.length}/{match.maxPlayers} {utils.renderGoalkeeperIcons(gkCount)}
                        </div>
                        <div className="match-info match-info--small">
                            Chiude: {utils.formatDeadline(match.registrationDeadlineForced)}
                        </div>
                    </>
                )}
                {match.status === 'VOTING' && match.score && (
                    <>
                        <div className="match-info">
                            Gialli {match.score.gialli} - {match.score.verdi} Verdi
                        </div>
                        <div className="match-info match-info--small">
                            🗳️ Vota entro domenica
                        </div>
                    </>
                )}
                {match.status === 'COMPLETED' && match.score && (
                    <>
                        <div className="match-info">
                            Gialli {match.score.gialli} - {match.score.verdi} Verdi
                        </div>
                        <div className="match-info match-info--small">
                            Top scorer: 🏆 {utils.getPlayerNameById(match.topScorer, users)}
                        </div>
                    </>
                )}
                {match.status === 'CANCELLED' && match.cancellationReason && (
                    <span className="cancellation-reason">
                        Motivo: {match.cancellationReason}
                    </span>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// VISTA ISCRIZIONI PARTITA
// ============================================================================

export function MatchRegistrationView({ match, currentUser, users, onBack, onUpdate }) {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
    const [selectedPlayerId, setSelectedPlayerId] = useState('');
    const [isGoalkeeper, setIsGoalkeeper] = useState(false);

    useEffect(() => {
        loadRegistrations();
    }, [match.id]);

    const loadRegistrations = async () => {
        setLoading(true);
        try {
            const regs = await storage.getRegistrations(match.id);
            setRegistrations(regs);
        } catch (error) {
            console.error('Errore caricamento iscrizioni:', error);
        }
        setLoading(false);
    };

    const isRegistered = registrations.some(r => r.playerId === currentUser.id);
    const isClosed = match.status === 'CLOSED';
    const hasTeams = match.teams && (match.teams.gialli?.length > 0 || match.teams.verdi?.length > 0);

    const handleRegister = async () => {
        setActionLoading(true);
        try {
            await storage.registerPlayer(match.id, currentUser);
            await loadRegistrations();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Errore iscrizione:', error);
            alert('Errore durante l\'iscrizione. Riprova.');
        }
        setActionLoading(false);
    };

    const handleUnregister = async (playerId, playerName) => {
        const isCurrentUser = playerId === currentUser.id;
        const message = isCurrentUser
            ? 'Vuoi disiscriverti dalla partita?'
            : `Rimuovere ${playerName} dalla partita?`;

        if (!confirm(message)) return;

        setActionLoading(true);
        try {
            await storage.unregisterPlayer(match.id, playerId);
            await loadRegistrations();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Errore disiscrizione:', error);
            alert('Errore durante la disiscrizione. Riprova.');
        }
        setActionLoading(false);
    };

    const handleAddPlayer = async () => {
        if (!selectedPlayerId) {
            alert('Seleziona un giocatore!');
            return;
        }

        setActionLoading(true);
        try {
            const player = users.find(u => u.id === selectedPlayerId);
            const playerToAdd = {
                ...player,
                isGoalkeeper: isGoalkeeper
            };

            await storage.registerPlayerByAdmin(match.id, playerToAdd, currentUser.id);
            await loadRegistrations();
            if (onUpdate) onUpdate();

            // Reset e chiudi modale
            setSelectedPlayerId('');
            setIsGoalkeeper(false);
            setShowAddPlayerModal(false);
        } catch (error) {
            console.error('Errore aggiunta giocatore:', error);
            alert('Errore durante l\'aggiunta. Riprova.');
        }
        setActionLoading(false);
    };

    const getAvailablePlayers = () => {
        const registeredIds = registrations.map(r => r.playerId);
        return users.filter(u => !registeredIds.includes(u.id));
    };

    const countGoalkeepers = () => {
        return registrations.filter(r => r.isGoalkeeper).length;
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

    return (
        <>
            <div className="section-container">
                <div className="detail-card">
                    <div className="detail-header">
                        <span className={`match-status ${isClosed ? 'completed' : 'open'}`}>
                            {isClosed ? '🔒 ISCRIZIONI CHIUSE' : '📝 ISCRIZIONI APERTE'}
                        </span>

                        <div className="header-info-grid">
                            <div className="header-main">
                                <div className="detail-date">{utils.formatMatchDateFull(match.date)}</div>
                                <div className="detail-time">⏰ Ore {utils.formatTime(match.date)}</div>
                                <div className="detail-location">📍 {match.location}</div>
                            </div>
                            <div className="header-aside">
                                <div className="recap-box">
                                    <div className="recap-row">
                                        {utils.renderGoalkeeperIcons(countGoalkeepers())}
                                        <span><strong>{registrations.length}</strong>/{match.maxPlayers}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="detail-content">
                        {isClosed && match.teams && match.teams.gialli && match.teams.gialli.length > 0 ? (
                            <>
                                <div className="teams-header">
                                    <h3>⚔️ SQUADRE ASSEGNATE</h3>
                                    <p>Le squadre sono pronte per la partita!</p>
                                </div>

                                <div className="teams-grid">
                                    {/* SQUADRA GIALLI */}
                                    <div className="team-card team-card--yellow">
                                        <h4 className="team-card__title">
                                            🟡 GIALLI ({match.teams.gialli.length})
                                        </h4>
                                        <div className="team-card__players">
                                            {match.teams.gialli.map((player, index) => {
                                                const fullUser = users.find(u => u.id === player.playerId);
                                                const displayName = fullUser?.name || player.playerName;
                                                const displayAvatar = fullUser?.avatar;

                                                return (
                                                    <div key={player.playerId} className="team-player">
                                                        <span className="team-player__number">{index + 1}</span>
                                                        <div className="avatar-mini">
                                                            {displayAvatar
                                                                ? <img src={displayAvatar} alt={displayName} />
                                                                : utils.getInitials(displayName)}
                                                        </div>
                                                        <span className="team-player__name">
                                                            {displayName}
                                                            {player.playerId === currentUser.id && ' (Tu)'}
                                                            {!fullUser && ' ⚠️'}
                                                        </span>
                                                        {player.isGoalkeeper && (
                                                            <span className="team-player__gk-icon">🧤</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* SQUADRA VERDI */}
                                    <div className="team-card team-card--green">
                                        <h4 className="team-card__title">
                                            🟢 VERDI ({match.teams.verdi.length})
                                        </h4>
                                        <div className="team-card__players">
                                            {match.teams.verdi.map((player, index) => {
                                                const fullUser = users.find(u => u.id === player.playerId);
                                                const displayName = fullUser?.name || player.playerName;
                                                const displayAvatar = fullUser?.avatar;

                                                return (
                                                    <div key={player.playerId} className="team-player">
                                                        <span className="team-player__number">{index + 1}</span>
                                                        <div className="avatar-mini">
                                                            {displayAvatar
                                                                ? <img src={displayAvatar} alt={displayName} />
                                                                : utils.getInitials(displayName)}
                                                        </div>
                                                        <span className="team-player__name">
                                                            {displayName}
                                                            {player.playerId === currentUser.id && ' (Tu)'}
                                                            {!fullUser && ' ⚠️'}
                                                        </span>
                                                        {player.isGoalkeeper && (
                                                            <span className="team-player__gk-icon">🧤</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {currentUser.isAdmin && (
                                    <div className="admin-info-box">
                                        <p>ℹ️ Per modificare le squadre, torna alla sezione Admin e clicca "👥 Assegna Squadre"</p>
                                        <p>Per annullare tutto: "🔓 Riapri Iscrizioni" (cancellerà squadre e risultati)</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="players-list">
                                    <h3>👥 Chi Gioca ({registrations.length})</h3>
                                    {registrations.length === 0 ? (
                                        <div className="no-votes">
                                            <p>Nessun iscritto ancora. Sii il primo!</p>
                                        </div>
                                    ) : (
                                        registrations.map(reg => {
                                            const fullUser = users.find(u => u.id === reg.playerId);
                                            const displayName = fullUser?.name || reg.playerName; // Fallback to stored name if user deleted
                                            const displayAvatar = fullUser?.avatar;

                                            return (
                                                <div key={reg.id} className={`player-item ${reg.isGoalkeeper ? 'gk' : ''}`}>
                                                    <div className="avatar">
                                                        {displayAvatar
                                                            ? <img src={displayAvatar} alt={displayName} />
                                                            : utils.getInitials(displayName)}
                                                    </div>
                                                    <div className="player-info">
                                                        <div className="player-name">
                                                            {displayName}
                                                            {reg.playerId === currentUser.id && ' (Tu)'}
                                                            {!fullUser && ' ⚠️'} {/* Show warning if user deleted */}
                                                        </div>
                                                        <div className="player-role">
                                                            {reg.isGoalkeeper ? '🧤 Portiere' : 'Movimento'}
                                                        </div>
                                                    </div>

                                                    {(reg.playerId === currentUser.id || currentUser.isAdmin) && !isClosed && (
                                                        <div
                                                            className="unsubscribe-btn"
                                                            onClick={() => handleUnregister(reg.playerId, displayName)}
                                                        >
                                                            ✕
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {currentUser.isAdmin && !isClosed && (
                                    <div className="admin-add-player">
                                        <button
                                            className="btn-add-player"
                                            onClick={() => setShowAddPlayerModal(true)}
                                        >
                                            + AGGIUNGI GIOCATORE
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {isClosed && !hasTeams && (
                            <div className="deadline-msg">
                                Iscriviti entro le ore 20 del {utils.formatDeadlineDisplay(match.registrationDeadlineDisplay)}<br />
                                per avere la possibilità di cambiare campo se necessario
                            </div>
                        )}

                        {isClosed && !hasTeams && (
                            <div className="deadline-msg closed">
                                Le iscrizioni sono chiuse.<br />
                                L'admin sta preparando le squadre!
                            </div>
                        )}

                        <div className="btn-group">
                            <button className="btn btn-secondary" onClick={onBack}>
                                ← INDIETRO
                            </button>
                            {!isClosed && (
                                isRegistered ? (
                                    <button className="btn btn-registered" disabled>
                                        ✓ SONO GIÀ ISCRITTO
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleRegister}
                                        disabled={actionLoading}
                                    >
                                        {actionLoading ? 'Attendere...' : '✓ ISCRIVITI'}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAddPlayerModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>👥 Aggiungi Giocatore</h2>

                        <div className="form-group">
                            <label>Seleziona Giocatore *</label>
                            <select
                                value={selectedPlayerId}
                                onChange={(e) => setSelectedPlayerId(e.target.value)}
                            >
                                <option value="">-- Seleziona --</option>
                                {getAvailablePlayers().map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <div className="checkbox-item">
                                <input
                                    type="checkbox"
                                    id="admin-gk"
                                    checked={isGoalkeeper}
                                    onChange={(e) => setIsGoalkeeper(e.target.checked)}
                                />
                                <label htmlFor="admin-gk">🧤 È un portiere</label>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowAddPlayerModal(false);
                                    setSelectedPlayerId('');
                                    setIsGoalkeeper(false);
                                }}
                            >
                                Annulla
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddPlayer}
                                disabled={!selectedPlayerId || actionLoading}
                            >
                                {actionLoading ? 'Attendere...' : '✓ Aggiungi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}