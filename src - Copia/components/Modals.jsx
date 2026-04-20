// src/components/Modals.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState } from 'react';
import storage from '../storage.js';
import { ROLES, PROFILE } from '../constants.js';

// =========================================================================
// 1. CLAIM PROFILE MODAL
// =========================================================================

export function ClaimProfileModal({ users, onClaim, onNewPlayer }) {
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [newPlayerName, setNewPlayerName] = useState('');
    const [showNewPlayerInput, setShowNewPlayerInput] = useState(false); // ← NUOVO stato
    const availablePlayers = users.filter(u => !u.claimed && !u.id.startsWith('seed'));

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>👋 Benvenuto!</h2>
                <p>Chi sei tra questi giocatori?</p>

                <div className="form-group">
                    <label>Seleziona il tuo nome (potrai cambiarlo dopo!):</label>
                    <select value={selectedPlayer} onChange={(e) => setSelectedPlayer(e.target.value)}>
                        <option value="">-- Seleziona il tuo profilo --</option>
                        {availablePlayers.map(player => (
                            <option key={player.id} value={player.id}>{player.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    className="btn btn-primary full-width"
                    onClick={() => selectedPlayer && onClaim(selectedPlayer)}
                    disabled={!selectedPlayer}
                >
                    ✓ Eccomi!
                </button>

                {/* ✅ DENTRO IL MODAL - Divider visivo */}
                <div className="modal-divider">
                    <p className="modal-hint">Non trovi il tuo nome?</p>

                    {/* ✅ Mostra input SOLO se showNewPlayerInput è true */}
                    {showNewPlayerInput ? (
                        <>
                            <div className="form-group">
                                <input
                                    type="text"
                                    placeholder="Scrivi il tuo nome e cognome"
                                    value={newPlayerName}
                                    onChange={(e) => setNewPlayerName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowNewPlayerInput(false);
                                        setNewPlayerName('');
                                    }}
                                    style={{ flex: 1 }}
                                >
                                    ✕ Annulla
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => onNewPlayer(newPlayerName)}
                                    disabled={!newPlayerName.trim()}
                                    style={{ flex: 1 }}
                                >
                                    ✓ Conferma
                                </button>
                            </div>
                        </>
                    ) : (
                        // ✅ Mostra bottone SOLO se input è nascosto
                        <button
                            className="btn btn-secondary full-width"
                            onClick={() => setShowNewPlayerInput(true)}
                        >
                            + Sono un nuovo giocatore
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 2. ROLE SELECTION MODAL (First time)
// =========================================================================

export function RoleSelectionModal({ onSave }) {
    const [preferredRole, setPreferredRole] = useState('');
    const [otherRoles, setOtherRoles] = useState([]);

    const handleOtherRoleToggle = (role) => {
        if (otherRoles.includes(role)) {
            setOtherRoles(otherRoles.filter(r => r !== role));
        } else {
            setOtherRoles([...otherRoles, role]);
        }
    };

    const handlePreferredRoleChange = (newRole) => {
        if (otherRoles.includes(newRole)) {
            setOtherRoles(otherRoles.filter(r => r !== newRole));
        }
        setPreferredRole(newRole);
    };

    const handleSubmit = () => {
        if (!preferredRole) {
            alert('Seleziona il tuo ruolo preferito');
            return;
        }
        const isGoalkeeper = preferredRole === 'Portiere';
        if (!isGoalkeeper && otherRoles.length < PROFILE.MIN_OTHER_ROLES_REQUIRED) {
            alert(`Seleziona almeno ${PROFILE.MIN_OTHER_ROLES_REQUIRED} altri ruoli`);
            return;
        }
        onSave(preferredRole, otherRoles);
    };

    const availableOtherRoles = ROLES.filter(r => {
        // Rimuovi il ruolo preferito
        if (r === preferredRole) return false;
        // Se il preferito NON è portiere, rimuovi "Portiere" dagli altri ruoli
        if (preferredRole && preferredRole !== 'Portiere' && r === 'Portiere') return false;
        return true;
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>⚽ Benvenuto!</h2>
                <p>Prima di iniziare, raccontaci qualcosa di te</p>
                <div className="form-group">
                    <label>Qual è il tuo ruolo preferito? *</label>
                    <select
                        value={preferredRole}
                        onChange={(e) => handlePreferredRoleChange(e.target.value)}
                    >
                        <option value="">-- Seleziona --</option>
                        {ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>
                        In quali altri ruoli ti adatti?
                        {preferredRole === 'Portiere' ? ' (opzionale)' : ` (min. ${PROFILE.MIN_OTHER_ROLES_REQUIRED}) *`}
                    </label>
                    <div className="checkbox-group">
                        {availableOtherRoles.map(role => (
                            <div key={role} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    id={`role-${role}`}
                                    checked={otherRoles.includes(role)}
                                    onChange={() => handleOtherRoleToggle(role)}
                                />
                                <label htmlFor={`role-${role}`}>{role}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    className={`btn btn-primary full-width ${(!preferredRole || (preferredRole !== 'Portiere' && otherRoles.length < PROFILE.MIN_OTHER_ROLES_REQUIRED)) ? 'btn-disabled' : ''}`}
                    onClick={handleSubmit}
                    disabled={!preferredRole || (preferredRole !== 'Portiere' && otherRoles.length < PROFILE.MIN_OTHER_ROLES_REQUIRED)}
                >
                    Conferma {preferredRole !== 'Portiere' && otherRoles.length < PROFILE.MIN_OTHER_ROLES_REQUIRED && preferredRole ? `(${otherRoles.length}/${PROFILE.MIN_OTHER_ROLES_REQUIRED} ruoli)` : ''}
                </button>
            </div>
        </div>
    );
}

// =========================================================================
// 3. ROLE EDIT MODAL (Edit existing roles)
// =========================================================================

export function RoleEditModal({ user, onClose, onSuccess }) {
    const [preferredRole, setPreferredRole] = useState(user.preferredRole || '');
    const [otherRoles, setOtherRoles] = useState(user.otherRoles || []);

    const handleOtherRoleToggle = (role) => {
        if (otherRoles.includes(role)) {
            setOtherRoles(otherRoles.filter(r => r !== role));
        } else {
            setOtherRoles([...otherRoles, role]);
        }
    };

    const handlePreferredRoleChange = (newRole) => {
        if (otherRoles.includes(newRole)) {
            setOtherRoles(otherRoles.filter(r => r !== newRole));
        }
        setPreferredRole(newRole);
    };

    const handleSubmit = async () => {
        if (!preferredRole) {
            alert('Seleziona il tuo ruolo preferito');
            return;
        }

        const cleanedOtherRoles = otherRoles.filter(r => r !== preferredRole);
        const isGoalkeeper = preferredRole === 'Portiere';

        if (!isGoalkeeper && cleanedOtherRoles.length < PROFILE.MIN_OTHER_ROLES_REQUIRED) {
            alert(`Seleziona almeno ${PROFILE.MIN_OTHER_ROLES_REQUIRED} altri ruoli`);
            return;
        }

        const updatedUser = {
            ...user,
            preferredRole,
            otherRoles: cleanedOtherRoles
        };

        await storage.updateUser(updatedUser);
        storage.setCurrentUser(updatedUser);
        onSuccess();
    };

    const availableOtherRoles = ROLES.filter(r => {
        // Rimuovi il ruolo preferito
        if (r === preferredRole) return false;
        // Se il preferito NON è portiere, rimuovi "Portiere" dagli altri ruoli
        if (preferredRole && preferredRole !== 'Portiere' && r === 'Portiere') return false;
        return true;
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>✏️ Modifica Ruoli</h2>
                <p>Aggiorna le tue preferenze di ruolo</p>

                <div className="form-group">
                    <label>Qual è il tuo ruolo preferito? *</label>
                    <select
                        value={preferredRole}
                        onChange={(e) => handlePreferredRoleChange(e.target.value)}
                    >
                        <option value="">-- Seleziona --</option>
                        {ROLES.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>
                        In quali altri ruoli ti adatti?
                        {preferredRole === 'Portiere' ? ' (opzionale)' : ` (min. ${PROFILE.MIN_OTHER_ROLES_REQUIRED}) *`}
                    </label>
                    <div className="checkbox-group">
                        {availableOtherRoles.map(role => (
                            <div key={role} className="checkbox-item">
                                <input
                                    type="checkbox"
                                    id={`edit-role-${role}`}
                                    checked={otherRoles.includes(role)}
                                    onChange={() => handleOtherRoleToggle(role)}
                                />
                                <label htmlFor={`edit-role-${role}`}>{role}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Annulla
                    </button>
                    <button
                        className={`btn btn-primary ${(!preferredRole || (preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < PROFILE.MIN_OTHER_ROLES_REQUIRED)) ? 'btn-disabled' : ''}`}
                        onClick={handleSubmit}
                        disabled={!preferredRole || (preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < PROFILE.MIN_OTHER_ROLES_REQUIRED)}
                    >
                        Salva Modifiche {preferredRole !== 'Portiere' && otherRoles.filter(r => r !== preferredRole).length < PROFILE.MIN_OTHER_ROLES_REQUIRED && preferredRole ? `(${otherRoles.filter(r => r !== preferredRole).length}/${PROFILE.MIN_OTHER_ROLES_REQUIRED} ruoli)` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =========================================================================
// 4. PROFILE SELECTOR MODAL (Antonio's multiple profiles)
// =========================================================================

export function ProfileSelectorModal({ profiles, onSelect }) {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>👋 Ciao Antonio!</h2>
                <p>Con quale profilo vuoi entrare?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '25px' }}>
                    {profiles.map(profile => (
                        <button
                            key={profile.id}
                            className="btn btn-primary full-width"
                            onClick={() => onSelect(profile)}
                            style={{ fontSize: '1.1rem', padding: '18px' }}
                        >
                            {profile.isGoalkeeper ? '🧤' : '👤'} {profile.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}