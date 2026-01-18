// src/components/AdminAndSettings.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import storage from '../storage.js';
import utils from '../utils.js';
import { ROLES, SKILLS, getSkillsForPlayer } from '../constants.js';
import { MATCH, DEADLINES, TEAM_BALANCE, VOTING, UI } from '../constants.js';

import { db } from '../firebase.js';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { RoleEditModal } from './Modals.jsx';

// =========================================================================
// 1. SETTINGS PAGE (Impostazioni Utente)
// =========================================================================

function SettingsPage({ user, onUpdateUser, onDeleteAccount }) {
    const [showSuccess, setShowSuccess] = useState(false);
    const [showRoleEdit, setShowRoleEdit] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(user.name);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const updatedUser = { ...user, avatar: reader.result };
                await onUpdateUser(updatedUser);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), UI.SUCCESS_MESSAGE_DURATION_MS);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNameSave = async () => {
        if (!newName.trim()) {
            alert('Il nome non può essere vuoto');
            return;
        }
        const updatedUser = { ...user, name: newName.trim() };
        await storage.updateUser(updatedUser);
        await onUpdateUser(updatedUser);
        setEditingName(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), UI.SUCCESS_MESSAGE_DURATION_MS);
    };

    const handleNameCancel = () => {
        setNewName(user.name);
        setEditingName(false);
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>⚙️ Impostazioni</h2>
            </div>

            <div className="settings-group">
                <h3>Foto Profilo</h3>
                <div className="settings-info">
                    <div className="settings-avatar">
                        {user.avatar ? <img src={user.avatar} alt={user.name} /> : utils.getInitials(user.name)}
                    </div>
                    <div className="file-input-wrapper">
                        <input type="file" id="avatar-upload" accept="image/*" onChange={handleFileChange} />
                        <label htmlFor="avatar-upload" className="file-input-label">📷 Carica Foto</label>
                    </div>
                </div>
            </div>

            <div className="settings-group">
                <h3>Informazioni Account</h3>
                <div className="settings-info-box">
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Nome:</strong>{' '}
                        {editingName ? (
                            <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '4px',
                                        border: '1px solid var(--volt)',
                                        background: 'var(--bg-deep)',
                                        color: 'white'
                                    }}
                                    autoFocus
                                />
                                <button className="btn btn-primary" onClick={handleNameSave} style={{ padding: '5px 15px' }}>
                                    ✓
                                </button>
                                <button className="btn btn-secondary" onClick={handleNameCancel} style={{ padding: '5px 15px' }}>
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <>
                                {user.name}{' '}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setEditingName(true)}
                                    style={{ padding: '3px 10px', fontSize: '12px', marginLeft: '10px' }}
                                >
                                    ✏️ Modifica
                                </button>
                            </>
                        )}
                    </div>
                    <div><strong>Email:</strong> {user.email}</div>
                </div>
            </div>

            <div className="settings-group">
                <h3>Ruoli</h3>
                <div className="settings-info-box">
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Ruolo preferito:</strong> {user.preferredRole || 'Non impostato'}
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <strong>Altri ruoli:</strong>
                        <div style={{ marginTop: '8px' }}>
                            {user.otherRoles && user.otherRoles.length > 0 ? (
                                <div className="role-badges">
                                    {user.otherRoles.map(role => (
                                        <span key={role} className="role-badge">{role}</span>
                                    ))}
                                </div>
                            ) : (
                                <span style={{ color: '#718096' }}>Nessuno</span>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setShowRoleEdit(true)} style={{ marginTop: '10px' }}>
                        ✏️ Modifica Ruoli
                    </button>
                </div>
            </div>

            <div className="settings-group admin-danger-zone">
                <h3>⚠️ Zona Pericolosa</h3>
                <p>Questa azione cancellerà i tuoi dati personali ma conserverà i voti. Potrai recuperare il profilo rieffettuando il login con la stessa email.</p>
                <button
                    className="btn btn-danger"
                    onClick={onDeleteAccount}
                >
                    🗑️ Elimina Account
                </button>
            </div>


            {
                showSuccess && <div className="success-message">✓ Impostazioni aggiornate!</div>
            }

            {
                showRoleEdit && (
                    <RoleEditModal
                        user={user}
                        onClose={() => setShowRoleEdit(false)}
                        onSuccess={async () => {
                            const updatedUser = await storage.getUsers().then(users => users.find(u => u.id === user.id));
                            await onUpdateUser(updatedUser);
                            setShowRoleEdit(false);
                            setShowSuccess(true);
                            setTimeout(() => setShowSuccess(false), UI.SUCCESS_MESSAGE_DURATION_MS);
                        }}
                    />
                )
            }
        </div >
    );
}

// =========================================================================
// 2. ADMIN PAGE (Strumenti Amministrativi)
// =========================================================================

function AdminPage({ users, setUsers, votes, setVotes, playersWithOverall }) {
    const [editingPlayer, setEditingPlayer] = useState(null);
    const [editName, setEditName] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingVotes, setEditingVotes] = useState(null);
    const [voteValues, setVoteValues] = useState({});
    const [showPlayersList, setShowPlayersList] = useState(false);

    // === STATI PER GESTIONE PARTITE ===
    const [showCreateMatch, setShowCreateMatch] = useState(false);
    const [newMatchDate, setNewMatchDate] = useState('');
    const [newMatchTime, setNewMatchTime] = useState(MATCH.DEFAULT_TIME);
    const [newMatchLocation, setNewMatchLocation] = useState(MATCH.DEFAULT_LOCATION);
    const [newMatchMaxPlayers, setNewMatchMaxPlayers] = useState(MATCH.DEFAULT_MAX_PLAYERS);
    const [adminMatches, setAdminMatches] = useState([]);
    const [adminRegistrations, setAdminRegistrations] = useState({});
    const [activeTab, setActiveTab] = useState('matches'); // Tab di default: Partite

    // STATI PER ASSEGNAZIONE SQUADRE E RISULTATO
    const [showTeamAssignment, setShowTeamAssignment] = useState(false);
    const [selectedMatchForTeams, setSelectedMatchForTeams] = useState(null);
    const [teamGialli, setTeamGialli] = useState([]);
    const [teamVerdi, setTeamVerdi] = useState([]);
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [selectedMatchForScore, setSelectedMatchForScore] = useState(null);
    const [scoreGialli, setScoreGialli] = useState('');
    const [scoreVerdi, setScoreVerdi] = useState('');
    const [topScorer, setTopScorer] = useState('');
    const [topScorerGoals, setTopScorerGoals] = useState('');

    // STATI PER MODIFICA MAX PLAYERS
    const [editingMaxPlayers, setEditingMaxPlayers] = useState(null);
    const [newMaxPlayers, setNewMaxPlayers] = useState('');

    // STATI PER MODIFICA INFO PARTITA (DATA/ORA/LOCATION)
    const [editingMatchInfo, setEditingMatchInfo] = useState(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [showEditMatchModal, setShowEditMatchModal] = useState(false);

    // Carica partite all'avvio
    useEffect(() => {
        loadAdminMatches();
    }, []);

    const loadAdminMatches = async () => {
        try {
            console.log('🔄 Caricamento partite admin...');
            const matches = await storage.getMatches();
            console.log('📥 Partite caricate:', matches.length);

            // Controlla e aggiorna status automaticamente
            const updatedMatches = await Promise.all(
                matches.map(match => storage.checkAndUpdateMatchStatus(match))
            );

            console.log('✅ Partite aggiornate:', updatedMatches);

            // Verifica che le squadre ci siano
            updatedMatches.forEach(match => {
                if (match.teams) {
                    console.log(`Match ${match.id} - Teams:`, match.teams);
                }
            });

            setAdminMatches(updatedMatches);

            // Carica iscrizioni per ogni partita
            const regsMap = {};
            for (const match of updatedMatches) {
                const regs = await storage.getRegistrations(match.id);
                regsMap[match.id] = regs;
            }
            setAdminRegistrations(regsMap);
        } catch (error) {
            console.error('❌ Errore caricamento partite admin:', error);
        }
    };

    const handleCreateMatch = async () => {
        if (!newMatchDate || !newMatchTime || !newMatchLocation) {
            alert('Compila tutti i campi obbligatori');
            return;
        }

        try {
            // Costruisci data completa
            const matchDateTime = new Date(`${newMatchDate}T${newMatchTime}:00`);

            // Deadline display: 3 giorni prima alle 18:00
            const regDeadlineDisplay = new Date(matchDateTime);
            regDeadlineDisplay.setDate(regDeadlineDisplay.getDate() - DEADLINES.REG_DEADLINE_DISPLAY_DAYS);
            regDeadlineDisplay.setHours(DEADLINES.REG_DEADLINE_DISPLAY_HOUR, 0, 0, 0);

            // Deadline forzata: 50 minuti prima della partita
            const regDeadlineForced = new Date(matchDateTime);
            regDeadlineForced.setMinutes(regDeadlineForced.getMinutes() - DEADLINES.REG_DEADLINE_FORCED_MINUTES);

            // Deadline voti: 3 giorni dopo a mezzanotte
            const votingDeadline = new Date(matchDateTime);
            votingDeadline.setDate(votingDeadline.getDate() + DEADLINES.VOTING_DEADLINE_DAYS);
            votingDeadline.setHours(DEADLINES.VOTING_DEADLINE_HOUR, DEADLINES.VOTING_DEADLINE_MINUTE, DEADLINES.VOTING_DEADLINE_SECOND, 999);

            await storage.createMatch({
                date: matchDateTime.toISOString(),
                location: newMatchLocation,
                maxPlayers: parseInt(newMatchMaxPlayers),
                registrationDeadlineDisplay: regDeadlineDisplay.toISOString(),
                registrationDeadlineForced: regDeadlineForced.toISOString(),
                votingDeadline: votingDeadline.toISOString()
            });

            // Reset form
            setNewMatchDate('');
            setNewMatchTime(MATCH.DEFAULT_TIME);
            setNewMatchLocation(MATCH.DEFAULT_LOCATION);
            setNewMatchMaxPlayers(MATCH.DEFAULT_MAX_PLAYERS);
            setShowCreateMatch(false);

            showSuccessMsg('Partita creata!');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore creazione partita:', error);
            alert('Errore durante la creazione della partita');
        }
    };

    const handleCloseRegistrations = async (matchId) => {
        if (!confirm('Chiudere le iscrizioni? I giocatori non potranno più iscriversi.')) return;

        try {
            await storage.updateMatch(matchId, {
                status: 'CLOSED',
                manualOverride: false,
                manualOverrideUntil: null
            });
            showSuccessMsg('Iscrizioni chiuse!');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore chiusura iscrizioni:', error);
            alert('Errore durante la chiusura');
        }
    };

    const handleReopenRegistrations = async (matchId) => {
        const match = adminMatches.find(m => m.id === matchId);
        if (!match) return;

        let confirmMessage = '';
        let resetData = {};

        if (match.status === 'CLOSED') {
            console.log('🟡 Caso rilevato: CLOSED');
            confirmMessage = '⚠️ Riaprire le iscrizioni? ATTENZIONE: Le squadre verranno cancellate!';
            resetData = {
                status: 'OPEN',
                teams: { gialli: [], verdi: [] },  // ← AGGIUNTO: cancella squadre
                score: null,                        // ← AGGIUNTO: reset score
                topScorer: null,                    // ← AGGIUNTO: reset top scorer
                topScorerGoals: null,               // ← AGGIUNTO: reset goals
                manualOverride: true,
                manualOverrideUntil: Date.now() + (2 * 60 * 60 * 1000)
            };
        } else if (match.status === 'VOTING') {
            console.log('🟡 Caso rilevato: VOTING');
            confirmMessage = '⚠️ Tornare alle iscrizioni? ATTENZIONE: Le squadre e i voti verranno cancellati!';
            resetData = {
                status: 'OPEN',
                teams: { gialli: [], verdi: [] },
                score: null,
                topScorer: null,
                topScorerGoals: null,
                manualOverride: true,
                manualOverrideUntil: Date.now() + (2 * 60 * 60 * 1000)
            };
        } else if (match.status === 'COMPLETED') {
            console.log('🟡 Caso rilevato: COMPLETED');
            confirmMessage = '⚠️ Riaprire la partita? ATTENZIONE: Risultato, squadre e voti verranno cancellati!';
            resetData = {
                status: 'OPEN',
                teams: { gialli: [], verdi: [] },
                score: null,
                topScorer: null,
                topScorerGoals: null,
                manualOverride: true,
                manualOverrideUntil: Date.now() + (2 * 60 * 60 * 1000)
            };
        }

        if (!confirm(confirmMessage)) return;

        try {
            // Se è VOTING o COMPLETED, cancella i voti
            if (match.status === 'VOTING' || match.status === 'COMPLETED') {
                const votesRef = collection(db, 'matches', matchId, 'match_votes');
                const votesSnapshot = await getDocs(votesRef);

                const batch = writeBatch(db);
                votesSnapshot.docs.forEach(docSnap => {
                    batch.delete(doc(db, 'matches', matchId, 'match_votes', docSnap.id));
                });
                await batch.commit();
            }

            await storage.updateMatch(matchId, resetData);
            await loadAdminMatches();
            showSuccessMsg('✅ Partita riaperta!');
        } catch (error) {
            console.error('Errore:', error);
            alert('Errore durante la riapertura');
        }
    };

    // ✅ NUOVO: Annulla partita
    const handleCancelMatch = async (matchId) => {
        const reason = prompt('Motivo annullamento (opzionale, es: "Maltempo"):\n\nLascia vuoto per nessun motivo.');

        if (!confirm('⚠️ Annullare questa partita?\n\nLe iscrizioni verranno mantenute ma la partita non sarà giocabile.')) {
            return;
        }

        try {
            const currentUser = storage.getCurrentUser(); // ✅ AGGIUNTO

            await storage.updateMatch(matchId, {
                status: 'CANCELLED',
                cancellationReason: reason || null,
                cancelledAt: Date.now(),
                cancelledBy: currentUser.id,
                manualOverride: true,
                manualOverrideUntil: Date.now() + DEADLINES.CANCELLED_OVERRIDE_DURATION_MS // 1 anno
            });

            await loadAdminMatches();
            alert('✅ Partita annullata con successo');
        } catch (error) {
            console.error('Errore annullamento partita:', error);
            alert('❌ Errore durante l\'annullamento');
        }
    };

    // ✅ NUOVO: Riapri partita annullata
    const handleReopenCancelledMatch = async (matchId) => {
        if (!confirm('Riaprire questa partita annullata?\n\nLa partita tornerà allo stato APERTA con le iscrizioni originali.')) {
            return;
        }

        try {
            await storage.updateMatch(matchId, {
                status: 'OPEN',
                cancellationReason: null,
                cancelledAt: null,
                cancelledBy: null,
                manualOverride: false,
                manualOverrideUntil: null
            });

            await loadAdminMatches();
            alert('✅ Partita riaperta con successo');
        } catch (error) {
            console.error('Errore riapertura partita:', error);
            alert('❌ Errore durante la riapertura');
        }
    };

    const handleEditMaxPlayers = (matchId, currentMax) => {
        setEditingMaxPlayers(matchId);
        setNewMaxPlayers(currentMax.toString());
    };

    const handleSaveMaxPlayers = async (matchId) => {
        const maxPlayers = parseInt(newMaxPlayers);

        if (isNaN(maxPlayers) || maxPlayers < MATCH.MIN_MATCH_PLAYERS || maxPlayers > MATCH.MAX_MATCH_PLAYERS || maxPlayers % 2 !== 0) {
            alert(`Il numero deve essere pari e compreso tra ${MATCH.MIN_MATCH_PLAYERS} e ${MATCH.MAX_MATCH_PLAYERS} (${MATCH.MAX_PLAYERS_OPTIONS.join(', ')})`);
            return;
        }

        try {
            await storage.updateMatch(matchId, { maxPlayers: maxPlayers });
            setEditingMaxPlayers(null);
            setNewMaxPlayers('');
            showSuccessMsg('Numero massimo aggiornato!');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore aggiornamento max players:', error);
            alert('Errore durante l\'aggiornamento');
        }
    };

    const handleEditMatchInfo = (match) => {
        // Check if teams are already assigned
        if (match.teams && (match.teams.gialli.length > 0 || match.teams.verdi.length > 0)) {
            if (!confirm('⚠️ ATTENZIONE: Le squadre sono già state assegnate. Modificare data/ora potrebbe causare conflitti con la disponibilità dei giocatori. Procedere?')) {
                return;
            }
        }

        // Extract date and time from match.date
        const matchDate = new Date(match.date);
        const dateStr = matchDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = `${String(matchDate.getHours()).padStart(2, '0')}:${String(matchDate.getMinutes()).padStart(2, '0')}`; // HH:mm

        setEditingMatchInfo(match.id);
        setEditDate(dateStr);
        setEditTime(timeStr);
        setEditLocation(match.location);
        setShowEditMatchModal(true);
    };

    const handleSaveMatchInfo = async (matchId) => {
        // Validation
        if (!editDate || !editTime || !editLocation.trim()) {
            alert('Tutti i campi sono obbligatori');
            return;
        }

        // Check if date is in the past
        const newMatchDateTime = new Date(`${editDate}T${editTime}:00`);
        const now = new Date();
        if (newMatchDateTime < now) {
            alert('Non puoi impostare una data nel passato');
            return;
        }

        try {
            // Recalculate all deadlines based on new date/time
            const matchDateTime = new Date(`${editDate}T${editTime}:00`);

            // Deadline display: 3 giorni prima alle 18:00
            const regDeadlineDisplay = new Date(matchDateTime);
            regDeadlineDisplay.setDate(regDeadlineDisplay.getDate() - 3);
            regDeadlineDisplay.setHours(18, 0, 0, 0);

            // Deadline forzata: 50 minuti prima della partita
            const regDeadlineForced = new Date(matchDateTime);
            regDeadlineForced.setMinutes(regDeadlineForced.getMinutes() - 50);

            // Deadline voti: 3 giorni dopo a mezzanotte
            const votingDeadline = new Date(matchDateTime);
            votingDeadline.setDate(votingDeadline.getDate() + 3);
            votingDeadline.setHours(23, 59, 59, 999);

            // Update match with new info and recalculated deadlines
            await storage.updateMatch(matchId, {
                date: matchDateTime.toISOString(),
                location: editLocation.trim(),
                registrationDeadlineDisplay: regDeadlineDisplay.toISOString(),
                registrationDeadlineForced: regDeadlineForced.toISOString(),
                votingDeadline: votingDeadline.toISOString()
            });

            // Reset state
            setEditingMatchInfo(null);
            setEditDate('');
            setEditTime('');
            setEditLocation('');
            setShowEditMatchModal(false);

            showSuccessMsg('Informazioni partita aggiornate!');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore aggiornamento info partita:', error);
            alert('Errore durante l\'aggiornamento');
        }
    };

    const handleCancelEditMatchInfo = () => {
        setEditingMatchInfo(null);
        setEditDate('');
        setEditTime('');
        setEditLocation('');
        setShowEditMatchModal(false);
    };

    const handleDeleteMatch = async (matchId) => {
        if (!confirm('⚠️ ATTENZIONE: Eliminare questa partita e tutte le iscrizioni?')) return;
        if (!confirm('Conferma: sei sicuro di voler eliminare tutto?')) return;

        try {
            await storage.deleteMatch(matchId);
            showSuccessMsg('Partita eliminata!');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore eliminazione partita:', error);
            alert('Errore durante l\'eliminazione');
        }
    };

    const handleOpenTeamAssignment = async (matchId) => {
        const match = adminMatches.find(m => m.id === matchId);
        const regs = adminRegistrations[matchId] || [];

        if (regs.length < 2) {
            alert('Servono almeno 2 giocatori iscritti per assegnare le squadre');
            return;
        }

        setSelectedMatchForTeams(match);

        if (match.teams && match.teams.gialli && match.teams.gialli.length > 0) {
            setTeamGialli(match.teams.gialli);
            setTeamVerdi(match.teams.verdi);
        } else {
            generateBalancedTeams(regs);  // ⭐ Nessun parametro
        }

        setShowTeamAssignment(true);
    };

    const generateBalancedTeams = (registrations) => {
        const playersWithData = registrations.map(reg => {
            // ⭐ Trova l'overall già calcolato
            const playerData = playersWithOverall.find(p => p.id === reg.playerId);
            const overall = playerData?.overall || 2.5;

            return {
                ...reg,
                overall: overall,
                preferredRole: playerData?.preferredRole || null,
                otherRoles: playerData?.otherRoles || []
            };
        });

        const goalkeepers = playersWithData.filter(p => p.isGoalkeeper);
        const fieldPlayers = playersWithData.filter(p => !p.isGoalkeeper);
        const sortedPlayers = [...fieldPlayers].sort((a, b) => b.overall - a.overall);

        let gialli = [];
        let verdi = [];

        if (goalkeepers.length >= 2) {
            const sortedGK = [...goalkeepers].sort((a, b) => b.overall - a.overall);
            gialli.push(sortedGK[0]);
            verdi.push(sortedGK[1]);
            for (let i = 2; i < sortedGK.length; i++) {
                if (i % 2 === 0) gialli.push(sortedGK[i]);
                else verdi.push(sortedGK[i]);
            }
        } else if (goalkeepers.length === 1) {
            gialli.push(goalkeepers[0]);
        }

        let teamIndex = 0;
        let direction = 1;

        for (let i = 0; i < sortedPlayers.length; i++) {
            if (teamIndex === 0) {
                gialli.push(sortedPlayers[i]);
            } else {
                verdi.push(sortedPlayers[i]);
            }

            teamIndex += direction;

            if (teamIndex > 1) {
                teamIndex = 1;
                direction = -1;
            } else if (teamIndex < 0) {
                teamIndex = 0;
                direction = 1;
            }
        }

        while (Math.abs(gialli.length - verdi.length) > 1) {
            if (gialli.length > verdi.length) {
                const weakest = gialli.reduce((min, p) => p.overall < min.overall ? p : min);
                gialli = gialli.filter(p => p.playerId !== weakest.playerId);
                verdi.push(weakest);
            } else {
                const weakest = verdi.reduce((min, p) => p.overall < min.overall ? p : min);
                verdi = verdi.filter(p => p.playerId !== weakest.playerId);
                gialli.push(weakest);
            }
        }

        setTeamGialli(gialli);
        setTeamVerdi(verdi);
    };

    const calculateTeamStats = (team) => {
        if (!team || team.length === 0) return { avgOverall: 0, totalOverall: 0, goalkeepers: 0 };

        const totalOverall = team.reduce((sum, p) => {
            const playerData = playersWithOverall.find(player => player.id === p.playerId);
            return sum + (playerData?.overall || 2.5);
        }, 0);

        const avgOverall = totalOverall / team.length;
        const goalkeepers = team.filter(p => {
            const playerData = playersWithOverall.find(player => player.id === p.playerId);
            return playerData?.preferredRole === ROLES.GOALKEEPER;
        }).length;

        return {
            avgOverall: avgOverall,  // Numero
            avgOverallDisplay: avgOverall.toFixed(2),  // Stringa per il display
            totalOverall: totalOverall.toFixed(2),
            goalkeepers
        };
    };

    const movePlayerToTeam = (player, fromTeam, toTeam) => {
        if (fromTeam === 'gialli') {
            setTeamGialli(teamGialli.filter(p => p.playerId !== player.playerId));
            setTeamVerdi([...teamVerdi, player]);
        } else {
            setTeamVerdi(teamVerdi.filter(p => p.playerId !== player.playerId));
            setTeamGialli([...teamGialli, player]);
        }
    };

    const handleSaveTeams = async () => {
        if (teamGialli.length === 0 || teamVerdi.length === 0) {
            alert('Entrambe le squadre devono avere almeno un giocatore');
            return;
        }

        console.log('💾 Salvataggio squadre...');
        console.log('Match ID:', selectedMatchForTeams.id);
        console.log('Gialli:', teamGialli);
        console.log('Verdi:', teamVerdi);

        try {
            const teamsData = {
                gialli: teamGialli,
                verdi: teamVerdi
            };

            console.log('📤 Invio dati:', teamsData);

            await storage.updateMatch(selectedMatchForTeams.id, {
                teams: teamsData
            });

            console.log('✅ Squadre salvate con successo!');

            showSuccessMsg('Squadre assegnate!');
            setShowTeamAssignment(false);
            setSelectedMatchForTeams(null);
            setTeamGialli([]);
            setTeamVerdi([]);
            await loadAdminMatches();
        } catch (error) {
            console.error('❌ Errore salvataggio squadre:', error);
            alert('Errore durante il salvataggio: ' + error.message);
        }
    };

    const handleOpenScoreModal = (matchId) => {
        const match = adminMatches.find(m => m.id === matchId);

        if (!match) {
            console.error('❌ Match non trovato!');
            alert('❌ Errore: Partita non trovata!');
            return;
        }

        if (!match.teams || !match.teams.gialli || match.teams.gialli.length === 0) {
            console.error('❌ Squadre non assegnate correttamente!');
            alert('❌ Devi prima assegnare le squadre!');
            return;
        }

        console.log('✅ Squadre OK, apro modal...');
        setSelectedMatchForScore(match);

        if (match.score && typeof match.score.gialli !== 'undefined' && typeof match.score.verdi !== 'undefined') {
            console.log('✅ Carico score esistente:', match.score);
            setScoreGialli(match.score.gialli.toString());
            setScoreVerdi(match.score.verdi.toString());
        } else {
            console.log('ℹ️ Nessuno score da caricare, inizializzo vuoto');
            setScoreGialli('');
            setScoreVerdi('');
        }

        if (match.topScorer) {
            console.log('✅ Carico topScorer esistente:', match.topScorer);
            setTopScorer(match.topScorer);
            setTopScorerGoals(match.topScorerGoals?.toString() || '');
        } else {
            console.log('ℹ️ Nessun topScorer da caricare');
            setTopScorer('');
            setTopScorerGoals('');
        }

        console.log('✅ Apro modal risultato');
        setShowScoreModal(true);
    };

    const handleSaveScore = async () => {
        if (!scoreGialli || !scoreVerdi) {
            alert('Inserisci entrambi i punteggi');
            return;
        }

        const gialliScore = parseInt(scoreGialli);
        const verdiScore = parseInt(scoreVerdi);

        if (isNaN(gialliScore) || isNaN(verdiScore) || gialliScore < 0 || verdiScore < 0) {
            alert('Inserisci punteggi validi');
            return;
        }

        try {
            const updates = {
                score: {
                    gialli: gialliScore,
                    verdi: verdiScore
                }
            };

            if (topScorer && topScorerGoals) {
                updates.topScorer = topScorer;
                updates.topScorerGoals = parseInt(topScorerGoals);
            }

            await storage.updateMatch(selectedMatchForScore.id, updates);

            showSuccessMsg('Risultato salvato!');
            setShowScoreModal(false);
            setSelectedMatchForScore(null);
            setScoreGialli('');
            setScoreVerdi('');
            setTopScorer('');
            setTopScorerGoals('');
            await loadAdminMatches();
        } catch (error) {
            console.error('Errore salvataggio risultato:', error);
            alert('Errore durante il salvataggio');
        }
    };

    const showSuccessMsg = (msg) => {
        setSuccessMessage(msg);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), UI.SUCCESS_MESSAGE_DURATION_MS);
    };

    const handleEditName = (player) => {
        setEditingPlayer(player.id);
        setEditName(player.name);
    };

    const handleSaveName = async (playerId) => {
        if (!editName.trim()) return;
        const updatedUser = users.find(u => u.id === playerId);
        updatedUser.name = editName.trim();
        await storage.updateUser(updatedUser);
        const updatedUsers = users.map(u => u.id === playerId ? updatedUser : u);
        setUsers(updatedUsers);
        setEditingPlayer(null);
        setEditName('');
        showSuccessMsg('Nome aggiornato!');
    };

    const handleDeletePlayer = async (playerId) => {
        if (!confirm('Eliminare questo giocatore e tutte le sue valutazioni?')) return;
        const updatedUsers = users.filter(u => u.id !== playerId);
        setUsers(updatedUsers);
        await storage.setUsers(updatedUsers);
        showSuccessMsg('Giocatore eliminato!');
    };

    const handleEditVotes = (player) => {
        const averages = utils.calculateAverages(player.id, votes, player);
        if (averages) {
            const values = {};
            Object.keys(averages).forEach(k => { values[k] = averages[k].toFixed(2); });
            setVoteValues(values);
        } else {
            const emptyValues = {};
            [...SKILLS.tecniche, ...SKILLS.tattiche, ...SKILLS.fisiche].forEach(skill => { emptyValues[skill] = ''; });
            setVoteValues(emptyValues);
        }
        setEditingVotes(player);
    };

    const handleSaveVotes = async () => {
        for (let i = 0; i < VOTING.SEED_VOTES_COUNT; i++) {
            const seedVote = {
                voterId: `seed_admin_${i}_${Date.now()}`,
                playerId: editingVotes.id,
                ratings: {},
                timestamp: Date.now()
            };
            [...SKILLS.tecniche, ...SKILLS.tattiche, ...SKILLS.fisiche].forEach(skill => {
                const value = parseFloat(voteValues[skill]);
                if (!isNaN(value)) seedVote.ratings[skill] = Math.round(value);
            });
            await storage.addVote(seedVote);
        }
        setEditingVotes(null);
        setVoteValues({});
        showSuccessMsg('Valutazioni aggiornate!');
        setTimeout(() => window.location.reload(), UI.RELOAD_DELAY_MS);
    };

    const handleAddPlayer = async () => {
        const newName = prompt('Nome del nuovo giocatore:');
        if (!newName || !newName.trim()) return;
        const newPlayer = {
            id: utils.generatePlayerId(users),  // ← CAMBIA QUESTA RIGA
            name: newName.trim(),
            avatar: null,
            preferredRole: null,
            otherRoles: [],
            email: null,
            claimed: false,
            isAdmin: false,
            isInitialPlayer: false,
            hasVotedOffline: false,
            isGoalkeeper: false
        };

        await storage.updateUser(newPlayer);
        setUsers([...users, newPlayer]);
        showSuccessMsg('Giocatore aggiunto!');
    };

    const handleFullReset = () => {
        if (!confirm('⚠️ ATTENZIONE: Eliminare TUTTI i dati?')) return;
        if (!confirm('Conferma: vuoi davvero cancellare tutto?')) return;
        storage.clearAll();
        window.location.reload();
    };
    return (
        <div className="section-container">
            <div className="section-header">
                <h2>🔧 Pannello Amministratore</h2>
            </div>

            {showSuccess && <div className="success-message">✓ {successMessage}</div>}

            <div className="admin-tabs-nav">
                <button
                    className={`admin-tab-btn${activeTab === 'matches' ? ' active' : ''}`}
                    onClick={() => setActiveTab('matches')}
                >
                    🏆 Partite
                </button>
                <button
                    className={`admin-tab-btn${activeTab === 'players' ? ' active' : ''}`}
                    onClick={() => setActiveTab('players')}
                >
                    👥 Giocatori
                </button>
                <button
                    className={`admin-tab-btn${activeTab === 'system' ? ' active' : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    ⚙️ Sistema
                </button>
            </div>
            {
                activeTab === 'matches' && (
                    <div className="settings-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>🏆 Gestione Partite</h3>
                            <button className="btn btn-primary" onClick={() => setShowCreateMatch(!showCreateMatch)}>
                                {showCreateMatch ? '✕ Annulla' : '+ Crea Partita'}
                            </button>
                        </div>
                        {showCreateMatch && (
                            <div className="admin-create-match">
                                <h4>Crea Nuova Partita</h4>

                                <div className="form-group">
                                    <label>Data Partita *</label>
                                    <input
                                        type="date"
                                        value={newMatchDate}
                                        onChange={(e) => setNewMatchDate(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Orario *</label>
                                    <input
                                        type="time"
                                        value={newMatchTime}
                                        onChange={(e) => setNewMatchTime(e.target.value)}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Location *</label>
                                    <input
                                        type="text"
                                        value={newMatchLocation}
                                        onChange={(e) => setNewMatchLocation(e.target.value)}
                                        placeholder={`Es: ${MATCH.DEFAULT_LOCATION}`} />
                                </div>

                                <div className="form-group">
                                    <label>Max Giocatori (numero pari: {MATCH.MAX_PLAYERS_OPTIONS.join(', ')})</label>                                    <select
                                        value={newMatchMaxPlayers}
                                        onChange={(e) => setNewMatchMaxPlayers(e.target.value)}
                                    >
                                        <option value="10">10 giocatori (5 vs 5)</option>
                                        <option value="12">12 giocatori (6 vs 6)</option>
                                        <option value="14">14 giocatori (7 vs 7)</option>
                                        <option value="16">16 giocatori (8 vs 8)</option>
                                        <option value="18">18 giocatori (9 vs 9)</option>
                                        <option value="20">20 giocatori (10 vs 10)</option>
                                    </select>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={handleCreateMatch}
                                    disabled={!newMatchDate || !newMatchTime || !newMatchLocation}
                                >
                                    ✓ Crea Partita
                                </button>
                            </div>
                        )}

                        <div className="admin-matches-list">
                            {adminMatches.map(match => {
                                const regs = adminRegistrations[match.id] || [];
                                const hasTeams = match.teams && (match.teams.gialli.length > 0 || match.teams.verdi.length > 0);
                                const canEdit = match.status === 'OPEN'; // Only OPEN matches can be edited

                                return (
                                    <div key={match.id} className="admin-match-item">
                                        <div className="admin-match-header">
                                            <span className={`match-status ${match.status.toLowerCase()}`}>
                                                {match.status === 'OPEN' && '📝 APERTA'}
                                                {match.status === 'CLOSED' && '🔒 CHIUSA'}
                                                {match.status === 'VOTING' && '⭐ VOTAZIONI'}
                                                {match.status === 'COMPLETED' && '✅ FINITA'}
                                                {match.status === 'CANCELLED' && '❌ ANNULL.'}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span className="admin-match-date">{utils.formatMatchDate(match.date)}</span>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleEditMatchInfo(match)}
                                                        style={{
                                                            background: 'var(--volt)',
                                                            border: 'none',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            color: 'var(--bg-deep)',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold'
                                                        }}
                                                        title="Modifica data/ora/location"
                                                    >
                                                        ✏️ Modifica
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="admin-match-info">
                                            <span>📍 {match.location}</span>
                                            {editingMaxPlayers === match.id ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span>👥</span>
                                                    <select
                                                        value={newMaxPlayers}
                                                        onChange={(e) => setNewMaxPlayers(e.target.value)}
                                                        style={{
                                                            background: 'var(--bg-deep)',
                                                            color: 'white',
                                                            border: '1px solid var(--volt)',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '13px'
                                                        }}
                                                    >
                                                        <option value="10">10</option>
                                                        <option value="12">12</option>
                                                        <option value="14">14</option>
                                                        <option value="16">16</option>
                                                        <option value="18">18</option>
                                                        <option value="20">20</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleSaveMaxPlayers(match.id)}
                                                        style={{
                                                            background: '#48bb78',
                                                            border: 'none',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            color: 'white',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingMaxPlayers(null);
                                                            setNewMaxPlayers('');
                                                        }}
                                                        style={{
                                                            background: '#718096',
                                                            border: 'none',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            color: 'white',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <span
                                                    onClick={() => canEdit && handleEditMaxPlayers(match.id, match.maxPlayers)}
                                                    style={{
                                                        cursor: canEdit ? 'pointer' : 'default',
                                                        textDecoration: canEdit ? 'underline' : 'none'
                                                    }}
                                                    title={canEdit ? "Click per modificare" : ""}
                                                >
                                                    👥 {regs.length}/{match.maxPlayers}
                                                </span>
                                            )}
                                        </div>

                                        <div className="admin-match-actions">
                                            {match.status === 'OPEN' && (
                                                <button
                                                    className="admin-action-btn close"
                                                    onClick={() => handleCloseRegistrations(match.id)}
                                                >
                                                    🔒 Chiudi Iscrizioni
                                                </button>
                                            )}
                                            {match.status === 'CLOSED' && (
                                                <>
                                                    <button
                                                        className="admin-action-btn reopen"
                                                        onClick={() => handleReopenRegistrations(match.id)}
                                                    >
                                                        🔓 Riapri Iscrizioni
                                                    </button>
                                                    <button
                                                        className="admin-action-btn assign"
                                                        onClick={() => handleOpenTeamAssignment(match.id)}
                                                    >
                                                        👥 Assegna Squadre
                                                    </button>
                                                    <button
                                                        className="admin-action-btn score"
                                                        onClick={() => handleOpenScoreModal(match.id)}
                                                    >
                                                        ⚽ Inserisci Risultato
                                                    </button>
                                                </>
                                            )}
                                            {match.status === 'VOTING' && (
                                                <>
                                                    <button
                                                        className="admin-action-btn reopen"
                                                        onClick={() => handleReopenRegistrations(match.id)}
                                                    >
                                                        🔙 Torna a Iscrizioni
                                                    </button>
                                                    <button
                                                        className="admin-action-btn score"
                                                        onClick={() => handleOpenScoreModal(match.id)}
                                                    >
                                                        ⚽ Inserisci Risultato
                                                    </button>
                                                </>
                                            )}
                                            {match.status === 'COMPLETED' && (
                                                <button
                                                    className="admin-action-btn reopen"
                                                    onClick={() => handleReopenRegistrations(match.id)}
                                                >
                                                    🔙 Riapri Partita
                                                </button>
                                            )}
                                            {/* ✅ NUOVO: Bottone Annulla per partite OPEN o CLOSED */}
                                            {(match.status === 'OPEN' || match.status === 'CLOSED') && (
                                                <button
                                                    className="admin-action-btn danger"
                                                    onClick={() => handleCancelMatch(match.id)}
                                                    title="Annulla partita per maltempo o altri motivi"
                                                >
                                                    ❌ Annulla Partita
                                                </button>
                                            )}

                                            {/* ✅ NUOVO: Bottone Riapri per partite CANCELLED */}
                                            {match.status === 'CANCELLED' && (
                                                <button
                                                    className="admin-action-btn success"
                                                    onClick={() => handleReopenCancelledMatch(match.id)}
                                                    title="Riapri partita annullata"
                                                >
                                                    🔓 Riapri Partita
                                                </button>
                                            )}
                                            <button
                                                className="admin-action-btn delete"
                                                onClick={() => handleDeleteMatch(match.id)}
                                            >
                                                🗑️ Elimina
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'players' && (
                    <div className="settings-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => setShowPlayersList(!showPlayersList)}>
                                {showPlayersList ? '▼' : '▶'} 👥 Gestione Giocatori ({users.filter(u => !u.id.startsWith('seed')).length})
                            </h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {showPlayersList && <button className="btn btn-primary" onClick={handleAddPlayer}>+ Aggiungi</button>}
                                <button className="btn btn-secondary" onClick={() => setShowPlayersList(!showPlayersList)}>
                                    {showPlayersList ? 'Comprimi' : 'Espandi'}
                                </button>
                            </div>
                        </div>

                        {showPlayersList && (
                            <div className="admin-player-list">
                                {users.filter(u => !u.id.startsWith('seed')).map((player, index) => {
                                    const voteCount = utils.countVotes(player.id, votes);
                                    const averages = utils.calculateAverages(player.id, votes);
                                    const overall = utils.calculateOverall(averages);

                                    return (
                                        <div key={player.id} className="admin-player-item">
                                            <span style={{ color: '#a0aec0', width: '25px' }}>{index + 1}.</span>

                                            {editingPlayer === player.id ? (
                                                <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
                                                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="admin-input" autoFocus />
                                                    <button onClick={() => handleSaveName(player.id)} className="admin-btn btn-save">✓</button>
                                                    <button onClick={() => setEditingPlayer(null)} className="admin-btn btn-cancel">✕</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span style={{ fontWeight: '600', minWidth: '140px' }}>{player.name}</span>
                                                    <span style={{ color: '#718096', fontSize: '13px', flex: 1 }}>{player.claimed ? `✓ ${player.email}` : '○ Non reclamato'}</span>
                                                    <span style={{ color: '#667eea', fontSize: '13px' }}>OVR: {overall ? utils.toBase10(overall).toFixed(2) : '-'} ({voteCount} voti)</span>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button onClick={() => handleEditName(player)} className="admin-btn">✏️</button>
                                                        <button onClick={() => handleEditVotes(player)} className="admin-btn btn-chart">📊</button>
                                                        <button onClick={() => handleDeletePlayer(player.id)} className="admin-btn btn-delete">🗑️</button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )
            }

            {
                activeTab === 'system' && (
                    <>
                        <div className="settings-group">
                            <h3>💾 Backup Database</h3>
                            <p>Esporta o importa tutti i dati (utenti e voti) per fare backup o ripristinare</p>
                            <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                                <button className="btn btn-primary" onClick={() => {
                                    const data = { users, votes, timestamp: Date.now(), date: new Date().toISOString() };
                                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `calcetto_backup_${new Date().toISOString().split('T')[0]}.json`;
                                    a.click();
                                    showSuccessMsg('Backup esportato!');
                                }}>📥 Esporta Backup</button>
                                <button className="btn btn-secondary" onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.json';
                                    input.onchange = async (e) => {
                                        try {
                                            const file = e.target.files[0];
                                            const text = await file.text();
                                            const data = JSON.parse(text);
                                            if (!confirm('⚠️ ATTENZIONE: Questo sovrascriverà tutti i dati attuali. Continuare?')) return;
                                            if (data.users) await storage.setUsers(data.users);
                                            if (data.votes) await storage.setVotes(data.votes);
                                            showSuccessMsg('Backup importato!');
                                            setTimeout(() => window.location.reload(), UI.RELOAD_DELAY_MS);
                                        } catch (err) {
                                            alert('Errore durante l\'importazione: ' + err.message);
                                        }
                                    };
                                    input.click();
                                }}>📤 Importa Backup</button>
                            </div>
                        </div>

                        <div className="settings-group admin-danger-zone">
                            <h3>⚠️ Zona Pericolosa</h3>
                            <p>Azioni irreversibili!</p>
                            <button className="btn btn-danger" onClick={handleFullReset}>🗑️ Reset Completo</button>
                        </div>
                    </>
                )
            }

            {/* MODAL MODIFICA VOTI */}
            {
                editingVotes && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-large">
                            <h2>📊 Modifica: {editingVotes.name}</h2>
                            <p>Inserisci valori 1-4. Verranno creati 8 voti seed.</p>
                            {['tecniche', 'tattiche', 'fisiche'].map(category => (
                                <div key={category} className="vote-edit-category">
                                    <h4 className={`category-${category}`}>{category}</h4>
                                    <div className="vote-edit-grid">
                                        {SKILLS[category].map(skill => (
                                            <div key={skill} className="vote-edit-item">
                                                <label>{skill}</label>
                                                <input type="number" min="1" max="4" step="0.01" value={voteValues[skill] || ''} onChange={(e) => setVoteValues({ ...voteValues, [skill]: e.target.value })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setEditingVotes(null)}>Annulla</button>
                                <button className="btn btn-primary" onClick={handleSaveVotes}>Salva</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* MODAL MODIFICA INFO PARTITA */}
            {
                showEditMatchModal && (
                    <div className="modal-overlay" onClick={handleCancelEditMatchInfo}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>✏️ Modifica Informazioni Partita</h3>
                                <button className="modal-close" onClick={handleCancelEditMatchInfo}>✕</button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Data Partita *</label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'var(--bg-deep)',
                                            border: '1px solid var(--volt)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Orario *</label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'var(--bg-deep)',
                                            border: '1px solid var(--volt)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Location *</label>
                                    <input
                                        type="text"
                                        value={editLocation}
                                        onChange={(e) => setEditLocation(e.target.value)}
                                        placeholder={`Es: ${MATCH.DEFAULT_LOCATION}`}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'var(--bg-deep)',
                                            border: '1px solid var(--volt)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>

                                <div style={{
                                    marginTop: '20px',
                                    padding: '12px',
                                    background: 'rgba(251, 191, 36, 0.1)',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#fbbf24'
                                }}>
                                    ℹ️ <strong>Nota:</strong> Le scadenze (iscrizioni e votazioni) verranno ricalcolate automaticamente in base alla nuova data.
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleCancelEditMatchInfo}
                                >
                                    ✕ Annulla
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSaveMatchInfo(editingMatchInfo)}
                                    disabled={!editDate || !editTime || !editLocation.trim()}
                                >
                                    ✓ Salva Modifiche
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showTeamAssignment && selectedMatchForTeams && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-large">
                            <h2>👥 Assegna Squadre - {utils.formatMatchDate(selectedMatchForTeams.date)}</h2>
                            <p>Trascina i giocatori tra le squadre o usa il bilanciamento automatico</p>

                            {teamGialli.length > 0 && teamVerdi.length > 0 && (
                                <div style={{
                                    background: 'rgba(210, 248, 0, 0.1)',
                                    border: '1px solid rgba(210, 248, 0, 0.3)',
                                    borderRadius: '8px',
                                    padding: '15px',
                                    marginTop: '20px',
                                    marginBottom: '10px'
                                }}>
                                    <h4 style={{ color: 'var(--volt)', marginBottom: '15px', textAlign: 'center' }}>
                                        📊 Statistiche Bilanciamento
                                    </h4>
                                    <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {(() => {
                                            const gialliStats = calculateTeamStats(teamGialli);
                                            const verdiStats = calculateTeamStats(teamVerdi);
                                            const diff = Math.abs(parseFloat(gialliStats.avgOverall) - parseFloat(verdiStats.avgOverall));
                                            const diffBase10 = utils.toBase10(diff);  // ⭐ Converti in scala 1-10
                                            console.log('Diff base4:', diff, 'Diff base10:', diffBase10, 'Threshold:', TEAM_BALANCE.BALANCE_THRESHOLD);
                                            const isBalanced = diffBase10 < TEAM_BALANCE.BALANCE_THRESHOLD;

                                            return (
                                                <>
                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '5px' }}>GIALLI</div>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFD700' }}>
                                                            {utils.toBase10(gialliStats.avgOverall).toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>
                                                            {gialliStats.count} giocatori | {gialliStats.goalkeepers} 🧤
                                                        </div>
                                                    </div>

                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}>
                                                        <div style={{ fontSize: '18px' }}>⚖️</div>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            color: isBalanced ? '#48bb78' : '#f59e0b',
                                                            padding: '4px 10px',
                                                            background: isBalanced ? 'rgba(72, 187, 120, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                            borderRadius: '12px'
                                                        }}>
                                                            {isBalanced ? '✓ BILANCIATE' : `Δ ${utils.toBase10(diff).toFixed(2)}`}
                                                        </div>
                                                    </div>

                                                    <div style={{ textAlign: 'center' }}>
                                                        <div style={{ fontSize: '11px', color: '#a0aec0', marginBottom: '5px' }}>VERDI</div>
                                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#48bb78' }}>
                                                            {utils.toBase10(verdiStats.avgOverall).toFixed(2)}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>
                                                            {verdiStats.count} giocatori | {verdiStats.goalkeepers} 🧤
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                                <div style={{ flex: 1, background: 'rgba(255, 215, 0, 0.1)', padding: '15px', borderRadius: '8px', border: '2px solid #FFD700' }}>
                                    <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>
                                        🟡 GIALLI ({teamGialli.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {teamGialli.map(player => {
                                            const playerData = playersWithOverall.find(u => u.id === player.playerId);
                                            const overall = playerData?.overall || 2.5;

                                            return (
                                                <div
                                                    key={player.playerId}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        padding: '10px',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{
                                                            background: 'rgba(255, 215, 0, 0.2)',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            color: '#FFD700',
                                                            minWidth: '40px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {utils.toBase10(overall).toFixed(1)}
                                                        </span>
                                                        <span>
                                                            {player.playerName}
                                                            {player.isGoalkeeper && ' 🧤'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => movePlayerToTeam(player, 'gialli', 'verdi')}
                                                        style={{
                                                            background: '#48bb78',
                                                            border: 'none',
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        → VERDI
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {teamGialli.length === 0 && (
                                            <p style={{ textAlign: 'center', opacity: 0.5 }}>Nessun giocatore</p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ flex: 1, background: 'rgba(72, 187, 120, 0.1)', padding: '15px', borderRadius: '8px', border: '2px solid #48bb78' }}>
                                    <h3 style={{ color: '#48bb78', marginBottom: '15px' }}>
                                        🟢 VERDI ({teamVerdi.length})
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {teamVerdi.map(player => {
                                            const playerData = playersWithOverall.find(p => p.id === player.playerId);
                                            const overall = playerData?.overall || 2.5;

                                            return (
                                                <div
                                                    key={player.playerId}
                                                    style={{
                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                        padding: '10px',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{
                                                            background: 'rgba(72, 187, 120, 0.2)',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            color: '#48bb78',
                                                            minWidth: '40px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {utils.toBase10(overall).toFixed(1)}
                                                        </span>
                                                        <span>
                                                            {player.playerName}
                                                            {player.isGoalkeeper && ' 🧤'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => movePlayerToTeam(player, 'verdi', 'gialli')}
                                                        style={{
                                                            background: '#FFD700',
                                                            border: 'none',
                                                            padding: '4px 12px',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            color: 'black'
                                                        }}
                                                    >
                                                        ← GIALLI
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {teamVerdi.length === 0 && (
                                            <p style={{ textAlign: 'center', opacity: 0.5 }}>Nessun giocatore</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => generateBalancedTeams(adminRegistrations[selectedMatchForTeams.id] || [])}
                                    style={{ marginRight: '10px' }}
                                >
                                    🔄 Bilancia Automaticamente
                                </button>
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowTeamAssignment(false);
                                    setSelectedMatchForTeams(null);
                                    setTeamGialli([]);
                                    setTeamVerdi([]);
                                }}>
                                    Annulla
                                </button>
                                <button className="btn btn-primary" onClick={handleSaveTeams}>
                                    ✓ Salva Squadre
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showScoreModal && selectedMatchForScore && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2>⚽ Inserisci Risultato - {utils.formatMatchDate(selectedMatchForScore.date)}</h2>

                            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ display: 'block', color: '#FFD700', marginBottom: '8px', fontWeight: 'bold' }}>
                                        🟡 GIALLI
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={scoreGialli}
                                        onChange={(e) => setScoreGialli(e.target.value)}
                                        style={{
                                            width: '80px',
                                            height: '60px',
                                            fontSize: '28px',
                                            textAlign: 'center',
                                            background: 'var(--bg-deep)',
                                            border: '2px solid #FFD700',
                                            color: 'white',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </div>

                                <span style={{ fontSize: '32px', fontWeight: 'bold' }}>-</span>

                                <div style={{ textAlign: 'center' }}>
                                    <label style={{ display: 'block', color: '#48bb78', marginBottom: '8px', fontWeight: 'bold' }}>
                                        🟢 VERDI
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={scoreVerdi}
                                        onChange={(e) => setScoreVerdi(e.target.value)}
                                        style={{
                                            width: '80px',
                                            height: '60px',
                                            fontSize: '28px',
                                            textAlign: 'center',
                                            background: 'var(--bg-deep)',
                                            border: '2px solid #48bb78',
                                            color: 'white',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '30px' }}>
                                <h4 style={{ marginBottom: '15px', color: 'var(--volt)' }}>🏆 Capocannoniere (opzionale)</h4>
                                <div className="form-group">
                                    <label>Nome Giocatore</label>
                                    <input
                                        type="text"
                                        value={topScorer}
                                        onChange={(e) => setTopScorer(e.target.value)}
                                        placeholder="Es: Mario Rossi"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Numero Gol</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={topScorerGoals}
                                        onChange={(e) => setTopScorerGoals(e.target.value)}
                                        placeholder="Es: 3"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => {
                                    setShowScoreModal(false);
                                    setSelectedMatchForScore(null);
                                    setScoreGialli('');
                                    setScoreVerdi('');
                                    setTopScorer('');
                                    setTopScorerGoals('');
                                }}>
                                    Annulla
                                </button>
                                <button className="btn btn-primary" onClick={handleSaveScore}>
                                    ✓ Salva Risultato
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// =========================================================================
// 3. DEBUG PAGE (Analisi Voti)
// =========================================================================

function DebugPage({ users, votes }) {
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [editingVote, setEditingVote] = useState(null);
    const [editVoteValues, setEditVoteValues] = useState({});

    const getVoteStats = (playerId) => {
        const playerVotes = votes.filter(v => v.playerId === playerId);
        const seedVotes = playerVotes.filter(v => v.voterId && v.voterId.startsWith('seed'));
        const realVotes = playerVotes.filter(v => v.voterId && !v.voterId.startsWith('seed'));
        return { total: playerVotes.length, seed: seedVotes.length, real: realVotes.length, allVotes: playerVotes };
    };

    const handleEditVote = (vote) => {
        setEditingVote(vote);
        setEditVoteValues(vote.ratings);
    };

    const handleSaveEditedVote = async () => {
        if (!editingVote.id) {
            alert('Impossibile modificare voti senza ID');
            return;
        }
        try {
            const voteRef = doc(db, 'votes', editingVote.id);
            await updateDoc(voteRef, { ratings: editVoteValues });
            alert('Voto aggiornato! Ricarica la pagina per vedere le modifiche.');
            setEditingVote(null);
        } catch (err) {
            alert('Errore durante il salvataggio: ' + err.message);
        }
    };

    const handleDeleteVote = async (voteId) => {
        if (!voteId) {
            alert('Impossibile eliminare voti senza ID');
            return;
        }
        if (!confirm('Eliminare questo voto?')) return;
        try {
            const voteRef = doc(db, 'votes', voteId);
            await deleteDoc(voteRef);
            alert('Voto eliminato! Ricarica la pagina.');
        } catch (err) {
            alert('Errore durante l\'eliminazione: ' + err.message);
        }
    };

    const players = users.filter(u => !u.id.startsWith('seed'));

    if (selectedPlayer) {
        const player = players.find(p => p.id === selectedPlayer);
        if (!player) {
            return (
                <div className="section-container">
                    <div className="section-header">
                        <h2>🐛 Debug - Giocatore non trovato</h2>
                        <button onClick={() => setSelectedPlayer(null)} className="btn-back">← Indietro</button>
                    </div>
                    <p>Giocatore con ID {selectedPlayer} non trovato</p>
                </div>
            );
        }
        const stats = getVoteStats(player.id);
        const averages = utils.calculateAverages(player.id, votes, player);
        const overall = utils.calculateOverall(averages);

        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>📊 Dettaglio: {player.name}</h2>
                    <button onClick={() => setSelectedPlayer(null)} className="btn-back">← Indietro</button>
                </div>

                <div className="debug-stats">
                    <div className="debug-stat-box"><div className="stat-value seed">{stats.seed}</div><div className="stat-label">Voti Seed</div></div>
                    <div className="debug-stat-box"><div className="stat-value real">{stats.real}</div><div className="stat-label">Voti Reali</div></div>
                    <div className="debug-stat-box"><div className="stat-value total">{stats.total}</div><div className="stat-label">Totale</div></div>
                    <div className="debug-stat-box"><div className="stat-value overall">{overall ? utils.toBase10(overall).toFixed(2) : '-'}</div><div className="stat-label">Overall</div></div>
                </div>

                <h3>🗳️ Tutti i Voti</h3>
                <div className="debug-table-wrapper">
                    <table className="debug-table">
                        <thead>
                            <tr>
                                <th>Votante</th>
                                <th>Tipo</th>
                                {(() => {
                                    const playerSkills = getSkillsForPlayer(player);
                                    return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => (<th key={skill}>{skill.substring(0, 6)}</th>));
                                })()}
                                <th>Azioni</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.allVotes.map((vote, index) => {
                                const isSeed = vote.voterId.startsWith('seed');
                                const voterName = isSeed ? '🤖 Seed' : (users.find(u => u.id === vote.voterId)?.name || 'Sconosciuto');
                                return (
                                    <tr key={index} className={index % 2 === 0 ? 'even' : 'odd'}>
                                        <td>{voterName}</td>
                                        <td><span className={`vote-type ${isSeed ? 'seed' : 'real'}`}>{isSeed ? 'Seed' : 'Reale'}</span></td>
                                        {(() => {
                                            const playerSkills = getSkillsForPlayer(player);
                                            return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => (<td key={skill}>{vote.ratings[skill] || '-'}</td>));
                                        })()}
                                        <td>
                                            <button onClick={() => handleEditVote(vote)} className="admin-btn" style={{ marginRight: '5px' }}>✏️</button>
                                            <button onClick={() => handleDeleteVote(vote.id)} className="admin-btn btn-delete">🗑️</button>
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="average-row">
                                <td>📊 MEDIA</td>
                                <td></td>
                                {(() => {
                                    const playerSkills = getSkillsForPlayer(player);
                                    return [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche].map(skill => {
                                        const skillVotes = stats.allVotes.map(v => v.ratings[skill]).filter(v => v !== undefined);
                                        const avg = skillVotes.length > 0 ? skillVotes.reduce((a, b) => a + b, 0) / skillVotes.length : 0;
                                        return (<td key={skill}>{avg > 0 ? `${avg.toFixed(2)}` : '-'}</td>);
                                    });
                                })()}
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {editingVote && (
                    <div className="modal-overlay">
                        <div className="modal-content modal-large">
                            <h2>✏️ Modifica Voto</h2>
                            <p>Votante: {editingVote.voterId.startsWith('seed') ? '🤖 Seed' : (users.find(u => u.id === editingVote.voterId)?.name || 'Sconosciuto')}</p>
                            {['tecniche', 'tattiche', 'fisiche'].map(category => (
                                <div key={category} className="vote-edit-category">
                                    <h4 className={`category-${category}`}>{category}</h4>
                                    <div className="vote-edit-grid">
                                        {SKILLS[category].map(skill => (
                                            <div key={skill} className="vote-edit-item">
                                                <label>{skill}</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="4"
                                                    step="0.01"
                                                    value={editVoteValues[skill] || ''}
                                                    onChange={(e) => setEditVoteValues({ ...editVoteValues, [skill]: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setEditingVote(null)}>Annulla</button>
                                <button className="btn btn-primary" onClick={handleSaveEditedVote}>Salva</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>🐛 Debug - Riepilogo Voti</h2>
            </div>

            <div className="debug-global-stats">
                <div className="debug-stat-box"><div className="stat-value seed">{votes.filter(v => v.voterId && v.voterId.startsWith('seed')).length}</div><div className="stat-label">Voti Seed Totali</div></div>
                <div className="debug-stat-box"><div className="stat-value real">{votes.filter(v => v.voterId && !v.voterId.startsWith('seed')).length}</div><div className="stat-label">Voti Reali Totali</div></div>
                <div className="debug-stat-box"><div className="stat-value total">{votes.length}</div><div className="stat-label">Voti Totali</div></div>
            </div>

            <div className="settings-group">
                <h3>👥 Dettaglio per Giocatore</h3>
                <div className="debug-player-list">
                    {players.map(player => {
                        const stats = getVoteStats(player.id);
                        const averages = utils.calculateAverages(player.id, votes, player);
                        const overall = utils.calculateOverall(averages);
                        return (
                            <div key={player.id} className="debug-player-item" onClick={() => setSelectedPlayer(player.id)}>
                                <span style={{ fontWeight: '600', minWidth: '150px' }}>{player.name}</span>
                                <span className="debug-badge seed">Seed: {stats.seed}</span>
                                <span className="debug-badge real">Reali: {stats.real}</span>
                                <span className="debug-badge total">Tot: {stats.total}</span>
                                <span style={{ color: '#667eea', fontSize: '14px' }}>OVR: {overall ? utils.toBase10(overall).toFixed(2) : '-'}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export { SettingsPage, AdminPage, DebugPage };