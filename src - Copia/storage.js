// src/storage.js
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { db } from './firebase.js';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    limit,
    writeBatch
} from 'firebase/firestore';
import { MATCH, DEADLINES } from './constants.js';

const storage = {
    getUsers: async () => {
        const snapshot = await getDocs(collection(db, 'users'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    setUsers: async (users) => {
        const batch = writeBatch(db);
        users.forEach(user => {
            const ref = doc(db, 'users', user.id);
            batch.set(ref, user);
        });
        await batch.commit();
    },
    updateUser: async (user) => {
        await setDoc(doc(db, 'users', user.id), user);
    },
    getVotes: async () => {
        const snapshot = await getDocs(collection(db, 'votes'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    addVote: async (vote) => {
        await addDoc(collection(db, 'votes'), vote);
    },
    setVotes: async (votes) => {
        const batch = writeBatch(db);
        votes.forEach((vote, index) => {
            const ref = doc(db, 'votes', `vote_${Date.now()}_${index}`);
            batch.set(ref, vote);
        });
        await batch.commit();
    },
    getCurrentUser: () => {
        const user = localStorage.getItem('calcetto_current_user');
        return user ? JSON.parse(user) : null;
    },
    setCurrentUser: (user) => {
        if (user) {
            localStorage.setItem('calcetto_current_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('calcetto_current_user');
        }
    },
    clearAll: () => {
        localStorage.removeItem('calcetto_current_user');
    },

    // ✅ Login intelligente: popup desktop, redirect mobile
    handleLogin: async () => {
        const { auth } = await import('./firebase.js');
        const { GoogleAuthProvider, signInWithPopup, signInWithRedirect, setPersistence, browserLocalPersistence } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();

        // 🔧 Prova SEMPRE popup prima (molti mobile moderni lo supportano)
        try {
            const result = await signInWithPopup(auth, provider);
            return result.user;
        } catch (popupError) {

            // Se popup è bloccato/chiuso dall'utente, NON usare redirect
            if (popupError.code === 'auth/popup-closed-by-user' ||
                popupError.code === 'auth/cancelled-popup-request') {
                throw popupError; // L'utente ha cancellato
            }

            // Per altri errori (popup bloccato), mostra messaggio
            if (popupError.code === 'auth/popup-blocked') {
                throw new Error('POPUP_BLOCKED');
            }

            // Fallback redirect solo se proprio necessario
            await setPersistence(auth, browserLocalPersistence);
            sessionStorage.setItem('calcetto_redirect_pending', 'true');
            await signInWithRedirect(auth, provider);
            return null;
        }
    },

    getMatches: async () => {
        const q = query(
            collection(db, 'matches'),
            orderBy('date', 'desc'),
            limit(MATCH.MATCHES_QUERY_LIMIT)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    getMatch: async (matchId) => {
        const docSnap = await getDoc(doc(db, 'matches', matchId));
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },
    createMatch: async (matchData) => {
        const docRef = await addDoc(collection(db, 'matches'), {
            ...matchData,
            status: 'OPEN',
            teams: { gialli: [], verdi: [] },
            score: null,
            topScorer: null,
            topScorerGoals: null,
            goals: [],
            createdAt: Date.now()
        });
        return docRef.id;
    },
    updateMatch: async (matchId, updates) => {
        await updateDoc(doc(db, 'matches', matchId), updates);
    },

    deleteMatch: async (matchId) => {
        const batch = writeBatch(db);

        // Cancella registrations (sotto-collezione)
        const regsSnapshot = await getDocs(
            collection(db, 'matches', matchId, 'registrations')
        );
        regsSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

        // Cancella match_votes (sotto-collezione)
        const votesSnapshot = await getDocs(
            collection(db, 'matches', matchId, 'match_votes')
        );
        votesSnapshot.forEach(docSnap => batch.delete(docSnap.ref));

        // Cancella match
        batch.delete(doc(db, 'matches', matchId));

        await batch.commit();
    },

    // ============================================================================
    // FUNZIONI REGISTRATIONS
    // ============================================================================

    getRegistrations: async (matchId) => {
        const snapshot = await getDocs(
            collection(db, 'matches', matchId, 'registrations')
        );
        const registrations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ordina lato client per evitare indice composito
        return registrations.sort((a, b) => a.registeredAt - b.registeredAt);
    },

    registerPlayer: async (matchId, player) => {
        await setDoc(doc(db, 'matches', matchId, 'registrations', player.id), {
            playerId: player.id,
            playerName: player.name,
            isGoalkeeper: player.isGoalkeeper || false,
            registeredAt: Date.now(),
            registeredBy: player.id
        });
    },

    registerPlayerByAdmin: async (matchId, player, adminId) => {
        await setDoc(doc(db, 'matches', matchId, 'registrations', player.id), {
            playerId: player.id,
            playerName: player.name,
            isGoalkeeper: player.isGoalkeeper || false,
            registeredAt: Date.now(),
            registeredBy: adminId
        });
    },

    unregisterPlayer: async (matchId, playerId) => {
        await deleteDoc(doc(db, 'matches', matchId, 'registrations', playerId));
    },

    // ============================================================================
    // FUNZIONI MATCH_VOTES
    // ============================================================================

    getMatchVotes: async (matchId) => {
        const snapshot = await getDocs(
            collection(db, 'matches', matchId, 'match_votes')
        );
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    getMyMatchVote: async (matchId, voterId) => {
        const docSnap = await getDoc(
            doc(db, 'matches', matchId, 'match_votes', voterId)
        );
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    },

    saveMatchVote: async (matchId, voterId, voterTeam, votes) => {
        await setDoc(doc(db, 'matches', matchId, 'match_votes', voterId), {
            voterId,
            voterTeam,
            votes,
            submittedAt: Date.now(),
            lastModifiedAt: Date.now()
        });
    },

    updateMatchVote: async (matchId, voterId, votes) => {
        await updateDoc(doc(db, 'matches', matchId, 'match_votes', voterId), {
            votes,
            lastModifiedAt: Date.now()
        });
    },

    checkAndUpdateMatchStatus: async (match) => {
        if (!match) return match;

        // Rispetta override manuale admin
        if (match.manualOverride && match.manualOverrideUntil) {
            if (Date.now() < match.manualOverrideUntil) {
                console.log(`🛡️ Manual override attivo fino a ${new Date(match.manualOverrideUntil).toLocaleString()}`);
                console.log(`🛡️ Salto auto-update per match ${match.id}`);
                return match;
            } else {
                console.log(`⏰ Manual override scaduto, rimuovo flag`);
                await updateDoc(doc(db, 'matches', match.id), {
                    manualOverride: false,
                    manualOverrideUntil: null
                });
            }
        }

        const now = new Date();
        const matchDate = new Date(match.date);
        const votingDeadline = new Date(match.votingDeadline);

        let newStatus = match.status;
        let needsUpdate = false;

        // OPEN → CLOSED: 50 minuti prima della partita
        if (match.status === 'OPEN') {
            const closingTime = new Date(matchDate.getTime() - DEADLINES.REG_DEADLINE_FORCED_MINUTES * 60 * 1000);
            if (now >= closingTime) {
                newStatus = 'CLOSED';
                needsUpdate = true;
            }
        }

        // CLOSED → VOTING: 2 ore dopo la partita (solo se ci sono squadre E risultato)
        if (match.status === 'CLOSED') {
            const votingOpenTime = new Date(matchDate.getTime() + DEADLINES.VOTING_OPENS_AFTER_HOURS * 60 * 60 * 1000);
            const hasTeams = match.teams &&
                match.teams.gialli &&
                match.teams.gialli.length > 0 &&
                match.teams.verdi &&
                match.teams.verdi.length > 0;
            const hasScore = match.score &&
                match.score.gialli !== null &&
                match.score.verdi !== null;

            if (now >= votingOpenTime && hasTeams && hasScore) {
                newStatus = 'VOTING';
                needsUpdate = true;
            }
        }

        // VOTING → COMPLETED: quando passa la deadline (6 giorni dopo partita)
        if (match.status === 'VOTING') {
            if (now >= votingDeadline) {
                newStatus = 'COMPLETED';
                needsUpdate = true;
            }
        }

        // Aggiorna se necessario
        if (needsUpdate) {
            await updateDoc(doc(db, 'matches', match.id), { status: newStatus });
            return { ...match, status: newStatus };
        }

        return match;
    },

    // ============================================================================
    // FUNZIONE ELIMINAZIONE ACCOUNT (Soft Delete con possibilità di recupero)
    // ============================================================================

    deleteAccount: async (userId) => {
        const batch = writeBatch(db);

        // Ottieni i dati correnti dell'utente
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();

        // 1. Trasforma l'utente in profilo "unclaimed" ma SALVA l'email per recupero
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
            claimed: false,
            deletedEmail: userData.email,     // ← SALVA email per recupero futuro
            email: null,                      // ← Rimuovi email visibile
            avatar: null,
            preferredRole: null,
            otherRoles: [],
            isAdmin: false,
            deletedAt: Date.now()
        });

        // 2. Elimina le registrazioni alle partite (solo future/in corso)
        const matchesSnapshot = await getDocs(collection(db, 'matches'));
        for (const matchDoc of matchesSnapshot.docs) {
            const registrationsSnapshot = await getDocs(
                collection(db, 'matches', matchDoc.id, 'registrations')
            );
            registrationsSnapshot.docs.forEach(regDoc => {
                if (regDoc.data().playerId === userId) {
                    batch.delete(doc(db, 'matches', matchDoc.id, 'registrations', regDoc.id));
                }
            });
        }

        // 3. I voti DATI e RICEVUTI rimangono nel database
        // Il playerId rimane invariato

        // Esegui tutte le modifiche
        await batch.commit();
    },

    // ============================================================================
    // FUNZIONE RECUPERO ACCOUNT (Riattiva profilo eliminato)
    // ============================================================================

    recoverAccount: async (email, newData = {}) => {
        // Cerca un profilo unclaimed con deletedEmail uguale all'email
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const deletedProfile = usersSnapshot.docs.find(docSnap => {
            const data = docSnap.data();
            return !data.claimed && data.deletedEmail === email;
        });

        if (deletedProfile) {
            const profileData = deletedProfile.data();
            const restoredUser = {
                ...profileData,
                claimed: true,
                email: email,
                deletedEmail: null,
                deletedAt: null,
                restoredAt: Date.now(),
                ...newData  // Nuovi dati (avatar, displayName, etc.)
            };

            await updateDoc(doc(db, 'users', deletedProfile.id), restoredUser);
            return { id: deletedProfile.id, ...restoredUser };
        }

        return null;
    }
};

export default storage;