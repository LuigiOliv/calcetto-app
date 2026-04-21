// src/components/Match/MatchDetails.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState, useEffect } from 'react';
import storage from '../../storage.js';
import utils from '../../utils.js';
import { VOTING, RATING } from '../../constants.js';

// ============================================================================
// VISTA RISULTATI PARTITA COMPLETED  
// ============================================================================

export function MatchResultsView({ match, users, onBack }) {
    const [matchVotes, setMatchVotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMatchVotes();
    }, [match.id]);

    const loadMatchVotes = async () => {
        setLoading(true);
        try {
            const votes = await storage.getMatchVotes(match.id);
            setMatchVotes(votes);
        } catch (error) {
            console.error('Errore caricamento voti partita:', error);
        }
        setLoading(false);
    };

    // Calcola la media voti per ogni giocatore
    const calculatePlayerAverage = (playerId) => {
        const playerVotes = matchVotes
            .map(v => v.votes[playerId])
            .filter(v => v !== undefined);

        if (playerVotes.length === 0) return null;
        return playerVotes.reduce((a, b) => a + b, 0) / playerVotes.length;
    };

    // Conta quanti voti ha ricevuto un giocatore
    const getVoteCount = (playerId) => {
        return matchVotes.filter(v => v.votes[playerId] !== undefined).length;
    };

    // Crea classifica MVP
    const getMVPRanking = () => {
        const allPlayers = [...match.teams.gialli, ...match.teams.verdi];

        return allPlayers
            .map(player => ({
                ...player,
                avgVote: calculatePlayerAverage(player.playerId),
                voteCount: getVoteCount(player.playerId),
                team: match.teams.gialli.find(p => p.playerId === player.playerId) ? 'gialli' : 'verdi'
            }))
            .filter(p => p.avgVote !== null)
            .sort((a, b) => b.avgVote - a.avgVote);
    };

    // Calcola media squadra
    const getTeamAverage = (team) => {
        const teamPlayers = match.teams[team];
        const averages = teamPlayers
            .map(p => calculatePlayerAverage(p.playerId))
            .filter(avg => avg !== null);

        if (averages.length === 0) return null;
        return averages.reduce((a, b) => a + b, 0) / averages.length;
    };

    if (loading) {
        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>Caricamento risultati...</h2>
                </div>
            </div>
        );
    }

    const mvpRanking = getMVPRanking();
    const gialliAvg = getTeamAverage('gialli');
    const verdiAvg = getTeamAverage('verdi');

    return (
        <div className="section-container">
            <div className="results-card">
                {/* HEADER RISULTATO */}
                <div className="results-header">
                    <span className="match-status completed">✅ PARTITA CONCLUSA</span>

                    <div className="results-score">
                        <div className="results-team gialli">
                            <span className="team-name">GIALLI</span>
                            <span className="team-score">{match.score.gialli}</span>
                            {gialliAvg && (
                                <span className="team-avg">Avg: {gialliAvg.toFixed(2)}</span>
                            )}
                        </div>

                        <span className="score-divider">-</span>

                        <div className="results-team verdi">
                            <span className="team-name">VERDI</span>
                            <span className="team-score">{match.score.verdi}</span>
                            {verdiAvg && (
                                <span className="team-avg">Avg: {verdiAvg.toFixed(2)}</span>
                            )}
                        </div>
                    </div>

                    <div className="results-info">
                        <div className="results-date">{utils.formatMatchDateFull(match.date)}</div>
                        {match.goals && match.goals.length > 0 ? (
                            <div className="results-scorers">
                                ⚽ Marcatori:
                                {match.goals
                                    .filter(g => g.count > 0)
                                    .sort((a, b) => b.count - a.count)
                                    .map((g, i) => (
                                        <span key={i} style={{ marginLeft: '6px' }}>
                                            {g.playerName} ({g.count}{g.isOwnGoal ? ' A.G.' : ''})
                                            {i < match.goals.filter(g2 => g2.count > 0).length - 1 ? ',' : ''}
                                        </span>
                                    ))}
                            </div>
                        ) : match.topScorer ? (
                            <div className="results-top-scorer">
                                🏆 Capocannoniere: {match.topScorer} ({match.topScorerGoals} gol)
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* CLASSIFICA MVP */}
                <div className="results-content">
                    <h3 style={{ textAlign: 'center', color: 'var(--volt)', marginBottom: '20px' }}>
                        ⭐ CLASSIFICA MVP DELLA PARTITA
                    </h3>

                    {mvpRanking.length === 0 ? (
                        <div className="no-votes">
                            <p>Nessun voto disponibile per questa partita</p>
                        </div>
                    ) : (
                        <div className="mvp-ranking">
                            {mvpRanking.map((player, index) => (
                                <div
                                    key={player.playerId}
                                    className={`mvp-item ${index < 3 ? `mvp-rank-${index + 1}` : ''}`}
                                >
                                    <div className="mvp-rank">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                    </div>

                                    <div className="mvp-player-info">
                                        <div className="mvp-player-name">
                                            {player.playerName}
                                            {player.isGoalkeeper && ' 🧤'}
                                        </div>
                                        <div className="mvp-player-team">
                                            {player.team === 'gialli' ? '🟡 Gialli' : '🟢 Verdi'}
                                        </div>
                                    </div>

                                    <div className="mvp-stats">
                                        <div className="mvp-vote">{player.avgVote.toFixed(2)}</div>
                                        <div className="mvp-vote-count">({player.voteCount} voti)</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* STATISTICHE SQUADRE */}
                    <div style={{ marginTop: '40px' }}>
                        <h3 style={{ textAlign: 'center', color: 'var(--volt)', marginBottom: '20px' }}>
                            📊 STATISTICHE SQUADRE
                        </h3>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: '20px'
                        }}>
                            {/* SQUADRA GIALLI */}
                            <div style={{
                                background: 'rgba(255, 215, 0, 0.1)',
                                border: '2px solid #FFD700',
                                borderRadius: '8px',
                                padding: '20px'
                            }}>
                                <h4 style={{
                                    color: '#FFD700',
                                    fontSize: '1.3rem',
                                    marginBottom: '15px',
                                    textAlign: 'center'
                                }}>
                                    🟡 GIALLI
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {match.teams.gialli.map(player => {
                                        const avg = calculatePlayerAverage(player.playerId);
                                        return (
                                            <div key={player.playerId} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '4px'
                                            }}>
                                                <span>
                                                    {player.playerName}
                                                    {player.isGoalkeeper && ' 🧤'}
                                                </span>
                                                <span style={{
                                                    fontWeight: 'bold',
                                                    color: avg && avg >= RATING.EXCELLENT_THRESHOLD ? '#48bb78' : avg && avg >= RATING.GOOD_THRESHOLD ? '#f59e0b' : '#f56565'
                                                }}>
                                                    {avg ? avg.toFixed(2) : '-'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SQUADRA VERDI */}
                            <div style={{
                                background: 'rgba(72, 187, 120, 0.1)',
                                border: '2px solid #48bb78',
                                borderRadius: '8px',
                                padding: '20px'
                            }}>
                                <h4 style={{
                                    color: '#48bb78',
                                    fontSize: '1.3rem',
                                    marginBottom: '15px',
                                    textAlign: 'center'
                                }}>
                                    🟢 VERDI
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {match.teams.verdi.map(player => {
                                        const avg = calculatePlayerAverage(player.playerId);
                                        return (
                                            <div key={player.playerId} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '4px'
                                            }}>
                                                <span>
                                                    {player.playerName}
                                                    {player.isGoalkeeper && ' 🧤'}
                                                </span>
                                                <span style={{
                                                    fontWeight: 'bold',
                                                    color: avg && avg >= RATING.EXCELLENT_THRESHOLD ? '#48bb78' : avg && avg >= RATING.GOOD_THRESHOLD ? '#f59e0b' : '#f56565'
                                                }}>
                                                    {avg ? avg.toFixed(2) : '-'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="btn-group" style={{ marginTop: '30px' }}>
                        <button className="btn btn-secondary" onClick={onBack}>
                            ← TORNA ALLE PARTITE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// VISTA VOTAZIONI PARTITA
// ============================================================================

export function MatchVotingView({ match, currentUser, users, onBack }) {
    const [votes, setVotes] = useState({});
    const [hasVoted, setHasVoted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // --- pre-vote score report ---
    const [hasReportedScore, setHasReportedScore] = useState(false);
    const [reportStep, setReportStep] = useState(1); // 1=risultato, 2=gol
    const [reportScoreGialli, setReportScoreGialli] = useState(0);
    const [reportScoreVerdi, setReportScoreVerdi] = useState(0);
    const [reportGoals, setReportGoals] = useState([]);
    const [savingReport, setSavingReport] = useState(false);

    useEffect(() => {
        loadVotingData();
    }, [match.id]);

    const loadVotingData = async () => {
        setLoading(true);
        try {
            // Controlla se ho già inviato il report risultato
            const myReport = await storage.getMyScoreReport(match.id, currentUser.id);
            if (myReport) setHasReportedScore(true);

            // Controlla se ho già votato
            const myVote = await storage.getMyMatchVote(match.id, currentUser.id);
            if (myVote) {
                setVotes(myVote.votes);
                setHasVoted(true);
            } else {
                // Inizializza tutti i voti con il valore default
                const playersToVote = [...match.teams.gialli, ...match.teams.verdi]
                    .filter(p => p.playerId !== currentUser.id);

                const initialVotes = {};
                playersToVote.forEach(player => {
                    initialVotes[player.playerId] = VOTING.DEFAULT_VOTE;
                });
                setVotes(initialVotes);
            }
        } catch (error) {
            console.error('Errore caricamento voti:', error);
        }
        setLoading(false);
    };

    const handleSubmitScoreReport = async (skipGoals = false) => {
        setSavingReport(true);
        try {
            await storage.saveScoreReport(match.id, currentUser.id, {
                scoreGialli: reportScoreGialli,
                scoreVerdi: reportScoreVerdi,
                goals: skipGoals ? [] : reportGoals.filter(g => g.playerId && g.count > 0)
            });
            setHasReportedScore(true);
        } catch (error) {
            console.error('Errore salvataggio report:', error);
        }
        setSavingReport(false);
    };

    // Determina il team dell'utente
    const getUserTeam = () => {
        const gialliIds = match.teams.gialli.map(p => p.playerId);
        const verdiIds = match.teams.verdi.map(p => p.playerId);
        if (gialliIds.includes(currentUser.id)) return 'gialli';
        if (verdiIds.includes(currentUser.id)) return 'verdi';
        return null;
    };

    // Ottieni lista giocatori da votare (tutti tranne me stesso)
    const getPlayersToVote = () => {
        const allPlayers = [...match.teams.gialli, ...match.teams.verdi];
        return allPlayers.filter(p => p.playerId !== currentUser.id);
    };

    // Ottieni team di un giocatore
    const getPlayerTeam = (player) => {
        const gialliIds = match.teams.gialli.map(p => p.playerId);
        if (gialliIds.includes(player.playerId)) return 'gialli';
        return 'verdi';
    };

    const handleVoteChange = (playerId, value) => {
        setVotes(prev => ({
            ...prev,
            [playerId]: parseFloat(value)
        }));
    };

    const isComplete = () => {
        const playersToVote = getPlayersToVote();
        return playersToVote.every(player => votes[player.playerId] !== undefined);
    };

    const handleSubmit = async () => {
        if (!isComplete()) {
            alert('Devi votare tutti i giocatori prima di inviare!');
            return;
        }

        setSubmitting(true);
        try {
            const userTeam = getUserTeam();
            await storage.saveMatchVote(match.id, currentUser.id, userTeam, votes);
            setHasVoted(true);
            alert('✅ Voti inviati con successo!');
        } catch (error) {
            console.error('Errore invio voti:', error);
            alert('Errore durante l\'invio dei voti. Riprova.');
        }
        setSubmitting(false);
    };

    const handleModify = () => {
        setHasVoted(false);
    };

    const isDeadlinePassed = () => {
        return new Date() > new Date(match.votingDeadline);
    };

    const canModify = hasVoted && !isDeadlinePassed();
    const isLocked = hasVoted && isDeadlinePassed();

    // CONTROLLO: Solo chi ha giocato può votare
    const userTeam = getUserTeam();
    const isRegistered = userTeam !== null;

    if (!isRegistered) {
        return (
            <div className="section-container">
                <div className="section-header">
                    <button className="btn-back" onClick={onBack}>← Indietro</button>
                    <h2>⭐ Votazione Partita</h2>
                </div>
                <div className="no-votes">
                    <h3>🚫 Accesso Negato</h3>
                    <p>Solo i giocatori che hanno partecipato a questa partita possono votare.</p>
                    <p style={{ marginTop: '20px', opacity: 0.7 }}>
                        Non risulti iscritto tra i Gialli o i Verdi di questa partita.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="section-container">
                <div className="section-header">
                    <h2>Caricamento...</h2>
                </div>
            </div>
        );
    }

    const playersToVote = getPlayersToVote();
    const gialliToVote = playersToVote.filter(p => getPlayerTeam(p) === 'gialli');
    const verdiToVote = playersToVote.filter(p => getPlayerTeam(p) === 'verdi');
    const allMatchPlayers = [...(match.teams.gialli || []), ...(match.teams.verdi || [])];

    // --- Schermata pre-voto: inserimento risultato e gol ---
    if (!hasReportedScore) {
        return (
            <div className="section-container">
                <div className="section-header">
                    <button className="btn-back" onClick={onBack}>← Indietro</button>
                    <h2>{reportStep === 1 ? '⚽ Che risultato è stato?' : '⚽ Chi ha segnato?'}</h2>
                </div>

                {reportStep === 1 && (
                    <div className="voting-card">
                        <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px', fontSize: '15px' }}>
                                Inserisci il risultato come lo ricordi. Prima di votare vogliamo raccogliere qualche dato sulla partita.
                            </p>

                            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', justifyContent: 'center', marginBottom: '36px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', letterSpacing: '1px' }}>🟡 GIALLI</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button
                                            onClick={() => setReportScoreGialli(Math.max(0, reportScoreGialli - 1))}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                                        >-</button>
                                        <span style={{ fontSize: '48px', fontWeight: 'bold', minWidth: '52px', textAlign: 'center' }}>{reportScoreGialli}</span>
                                        <button
                                            onClick={() => setReportScoreGialli(reportScoreGialli + 1)}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                                        >+</button>
                                    </div>
                                </div>

                                <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-muted)', marginTop: '28px' }}>-</span>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#48bb78', fontWeight: 'bold', marginBottom: '12px', fontSize: '14px', letterSpacing: '1px' }}>🟢 VERDI</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button
                                            onClick={() => setReportScoreVerdi(Math.max(0, reportScoreVerdi - 1))}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                                        >-</button>
                                        <span style={{ fontSize: '48px', fontWeight: 'bold', minWidth: '52px', textAlign: 'center' }}>{reportScoreVerdi}</span>
                                        <button
                                            onClick={() => setReportScoreVerdi(reportScoreVerdi + 1)}
                                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'white', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
                                        >+</button>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', maxWidth: '320px' }}
                                onClick={() => setReportStep(2)}
                            >
                                Avanti →
                            </button>
                        </div>
                    </div>
                )}

                {reportStep === 2 && (
                    <div className="voting-card">
                        <div style={{ padding: '20px 16px' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '14px' }}>
                                Aggiungi i gol che ricordi. Non è obbligatorio inserirli tutti.
                            </p>

                            {reportGoals.map((goal, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                                    <select
                                        value={goal.playerId}
                                        onChange={(e) => {
                                            const player = allMatchPlayers.find(p => p.playerId === e.target.value);
                                            const updated = [...reportGoals];
                                            updated[idx] = { ...updated[idx], playerId: e.target.value, playerName: player?.playerName || '' };
                                            setReportGoals(updated);
                                        }}
                                        style={{ flex: '1', minWidth: '140px', padding: '8px', background: 'var(--bg-deep)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}
                                    >
                                        <option value="">Seleziona giocatore</option>
                                        {allMatchPlayers.map(p => (
                                            <option key={p.playerId} value={p.playerId}>{p.playerName}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" min="1" value={goal.count}
                                        onChange={(e) => {
                                            const updated = [...reportGoals];
                                            updated[idx] = { ...updated[idx], count: parseInt(e.target.value) || 0 };
                                            setReportGoals(updated);
                                        }}
                                        style={{ width: '60px', padding: '8px', textAlign: 'center', background: 'var(--bg-deep)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px' }}
                                        placeholder="Gol"
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                        <input
                                            type="checkbox"
                                            checked={goal.isOwnGoal || false}
                                            onChange={(e) => {
                                                const updated = [...reportGoals];
                                                updated[idx] = { ...updated[idx], isOwnGoal: e.target.checked };
                                                setReportGoals(updated);
                                            }}
                                        />
                                        A.G.
                                    </label>
                                    <button
                                        onClick={() => setReportGoals(reportGoals.filter((_, i) => i !== idx))}
                                        style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                                    >✕</button>
                                </div>
                            ))}

                            <button
                                onClick={() => setReportGoals([...reportGoals, { playerId: '', playerName: '', count: 1, isOwnGoal: false }])}
                                style={{ padding: '6px 14px', background: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--volt)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: '28px', display: 'block' }}
                            >
                                ➕ Aggiungi marcatore
                            </button>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => handleSubmitScoreReport(true)}
                                    disabled={savingReport}
                                >
                                    Salta → Vai a votare
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    onClick={() => handleSubmitScoreReport(false)}
                                    disabled={savingReport}
                                >
                                    {savingReport ? 'Salvataggio...' : '✓ Conferma e vota'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="section-container">
            <div className="voting-card">
                <div className="voting-header">
                    <span className="match-status voting">⭐ DA VOTARE</span>

                    <div className="voting-score">
                        <span className="team-name gialli">GIALLI</span>
                        <span className="score">{match.score.gialli} - {match.score.verdi}</span>
                        <span className="team-name verdi">VERDI</span>
                    </div>

                    <div className="voting-info">
                        <div className="voting-date">{utils.formatMatchDateFull(match.date)}</div>
                        <div className="voting-note">💡 Vota tutti i giocatori eccetto te stesso</div>
                    </div>
                </div>

                <div className="voting-content">
                    {!hasVoted && (
                        <>
                            {/* SQUADRA GIALLI */}
                            <div className="team-voting-section">
                                <h3 className="team-section-title gialli">🟡 GIALLI</h3>
                                {gialliToVote.map(player => (
                                    <div key={player.playerId} className="vote-row">
                                        <div className="vote-row-name">
                                            {player.playerName}
                                            {player.isGoalkeeper && ' 🧤'}
                                        </div>
                                        <input
                                            type="range"
                                            min={VOTING.VOTE_MIN}
                                            max={VOTING.VOTE_MAX}
                                            step={VOTING.VOTE_STEP}
                                            value={votes[player.playerId] || VOTING.DEFAULT_VOTE}
                                            onChange={(e) => handleVoteChange(player.playerId, e.target.value)}
                                            className="vote-slider"
                                        />
                                        <div className="vote-value">
                                            {votes[player.playerId] ? votes[player.playerId].toFixed(1) : VOTING.DEFAULT_VOTE.toFixed(1)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* SQUADRA VERDI */}
                            <div className="team-voting-section">
                                <h3 className="team-section-title verdi">🟢 VERDI</h3>
                                {verdiToVote.map(player => (
                                    <div key={player.playerId} className="vote-row">
                                        <div className="vote-row-name">
                                            {player.playerName}
                                            {player.isGoalkeeper && ' 🧤'}
                                        </div>
                                        <input
                                            type="range"
                                            min={VOTING.VOTE_MIN}
                                            max={VOTING.VOTE_MAX}
                                            step={VOTING.VOTE_STEP}
                                            value={votes[player.playerId] || VOTING.DEFAULT_VOTE}
                                            onChange={(e) => handleVoteChange(player.playerId, e.target.value)}
                                            className="vote-slider"
                                        />
                                        <div className="vote-value">
                                            {votes[player.playerId] ? votes[player.playerId].toFixed(1) : VOTING.DEFAULT_VOTE.toFixed(1)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {hasVoted && (
                        <>
                            {/* VOTI GIÀ INVIATI */}
                            <div className="team-voting-section">
                                <h3 className="team-section-title gialli">🟡 GIALLI</h3>
                                {gialliToVote.map(player => (
                                    <div key={player.playerId} className="vote-row readonly">
                                        <div className="vote-row-name">
                                            {player.playerName}
                                            {player.isGoalkeeper && ' 🧤'}
                                        </div>
                                        <div className="vote-readonly-value">
                                            {votes[player.playerId] ? votes[player.playerId].toFixed(1) : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="team-voting-section">
                                <h3 className="team-section-title verdi">🟢 VERDI</h3>
                                {verdiToVote.map(player => (
                                    <div key={player.playerId} className="vote-row readonly">
                                        <div className="vote-row-name">
                                            {player.playerName}
                                            {player.isGoalkeeper && ' 🧤'}
                                        </div>
                                        <div className="vote-readonly-value">
                                            {votes[player.playerId] ? votes[player.playerId].toFixed(1) : '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {canModify && (
                                <div className="deadline-msg">
                                    Puoi modificare fino a prima di {utils.formatDeadlineDisplay(match.votingDeadline)}.
                                </div>
                            )}

                            {isLocked && (
                                <div className="deadline-msg closed">
                                    Le votazioni sono chiuse!
                                </div>
                            )}
                        </>
                    )}

                    <div className="btn-group">
                        <button className="btn btn-secondary" onClick={onBack}>
                            ← INDIETRO
                        </button>
                        {!hasVoted && (
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={!isComplete() || submitting}
                            >
                                {submitting ? 'Invio...' : '✓ INVIA VOTI'}
                            </button>
                        )}
                        {canModify && (
                            <button className="btn btn-primary" onClick={handleModify}>
                                ✏️ MODIFICA VOTI
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}