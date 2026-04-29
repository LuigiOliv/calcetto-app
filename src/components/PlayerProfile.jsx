// src/components/PlayerProfile.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState } from 'react';
import utils from '../utils';
import { CLEAN_SHEET_MAX_GOALS } from '../constants';
import { getSkillsForPlayer, getShortSkillsForPlayer, CLASSIFICATION_FORMULA, VOTING, UI } from '../constants.js';
import RadarChart from './RadarChart.jsx';
import mvpIcon from '../assets/awards/mvp.png';
import topScorerIcon from '../assets/awards/top-scorer.png';
import cleanSheetIcon from '../assets/awards/clean-sheet.png';

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ data, width = 220, height = 52 }) {
    if (!data || data.length < 2) return null;
    const MIN_VOTE = 1, MAX_VOTE = 10;
    const padX = 6, padY = 6;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    const xs = data.map((_, i) => padX + (i / (data.length - 1)) * innerW);
    const ys = data.map(d => padY + innerH - ((d.avg - MIN_VOTE) / (MAX_VOTE - MIN_VOTE)) * innerH);
    const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
    const lastAvg = data[data.length - 1].avg;
    const color = lastAvg >= 7 ? '#48bb78' : lastAvg >= 5 ? '#f59e0b' : '#f56565';
    return (
        <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}>
            <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {xs.map((x, i) => (
                <circle key={i} cx={x} cy={ys[i]} r="3.5" fill={color} />
            ))}
        </svg>
    );
}

/**
 * Componente per la visualizzazione del profilo di un giocatore (proprio o altrui).
 */
function PlayerProfile({ player, votes = [], matches = [], matchVotes = [], isOwnProfile, onBack }) {
    const voteCount = utils.countVotes(player.id, votes);
    const hasEnoughVotes = voteCount >= VOTING.MIN_VOTES_FOR_DISPLAY;
    const averages = utils.calculateAverages(player.id, votes, player);
    const overall = matches.length > 0
        ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
        : utils.calculateOverall(averages);
    const playerMatches = utils.getPlayerMatchHistory(player.id, matches);
    const mvpCount = utils.calculateMVPCount(player.id, playerMatches, matchVotes);
    const topScorerCount = utils.calculateTopScorerCount(player.id, player.name, playerMatches);
    const cleanSheetCount = player.isGoalkeeper
        ? utils.calculateCleanSheets(player.id, player.name, playerMatches, CLEAN_SHEET_MAX_GOALS)
        : 0;

    // ── Statistiche avanzate ──────────────────────────────────────────────────
    const wdl = utils.calculateWDL(player.id, playerMatches);
    const formStreak = utils.getFormStreak(player.id, playerMatches);
    const voteHistory = utils.getMatchVoteHistory(player.id, playerMatches, matchVotes);
    const totalGoals = utils.calculatePlayerGoals(player.id, playerMatches);
    const totalOwnGoals = utils.calculatePlayerOwnGoals(player.id, playerMatches);
    const hasGoalData = playerMatches.some(m => m.goals && m.goals.length > 0);
    const winPct = wdl.total > 0 ? Math.round((wdl.wins / wdl.total) * 100) : 0;

    // Stat tiles per la seconda riga (gol/clean sheet)
    const extraStats = [];
    if (player.isGoalkeeper && (cleanSheetCount > 0 || wdl.total > 0)) {
        extraStats.push({ label: 'CLEAN SHEET', value: cleanSheetCount, icon: '🧤', color: '#48bb78' });
    }
    if (hasGoalData) {
        extraStats.push({ label: 'GOL SEGNATI', value: totalGoals, icon: '⚽', color: 'var(--volt)' });
        if (totalOwnGoals > 0) {
            extraStats.push({ label: 'AUTOGOAL', value: totalOwnGoals, icon: '🔄', color: '#f56565' });
        }
    }

    const [flippedCard, setFlippedCard] = useState(null);
    const handleCardClick = (category) => {
        if (window.innerWidth <= UI.MOBILE_BREAKPOINT_PX) {
            setFlippedCard(flippedCard === category ? null : category);
        }
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Profilo Giocatore</h2>
                {onBack && (
                    <button className="btn-back" onClick={onBack}>← Indietro</button>
                )}
            </div>

            {/* ── HEADER: avatar + nome + ruoli ────────────────────────────── */}
            <div className="player-profile">
                <div className="player-info">
                    <div className="avatar profile-info">
                        {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                    </div>
                    {(mvpCount > 0 || topScorerCount > 0 || cleanSheetCount > 0) && (
                        <div className="badges profile-info">
                            {mvpCount > 0 && (
                                <div className="award-card mvp">
                                    <div className="award-inner">
                                        <img src={mvpIcon} alt="MVP" className="award-icon" />
                                        <div className="title">x{mvpCount}</div>
                                    </div>
                                </div>
                            )}
                            {topScorerCount > 0 && (
                                <div className="award-card scorer">
                                    <div className="award-inner">
                                        <img src={topScorerIcon} alt="Top Scorer" className="award-icon" />
                                        <div className="title">x{topScorerCount}</div>
                                    </div>
                                </div>
                            )}
                            {player.isGoalkeeper && cleanSheetCount > 0 && (
                                <div className="award-card clean-sheet">
                                    <div className="award-inner">
                                        <img src={cleanSheetIcon} alt="Clean Sheet" className="award-icon" />
                                        <div className="title">x{cleanSheetCount}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="name profile-info">
                    <h2>{player.name} {player.isGoalkeeper && '🧤'}</h2>
                </div>
                {(player.preferredRole || (player.otherRoles && player.otherRoles.length > 0)) && (
                    <div className="role-info">
                        {player.preferredRole && (
                            <div className="role-item">
                                <div className="role-label">Ruolo preferito</div>
                                <div className="role-value">{player.preferredRole}</div>
                            </div>
                        )}
                        {player.otherRoles && player.otherRoles.length > 0 && (
                            <div className="role-item">
                                <div className="role-label">Mi adatto anche a</div>
                                <div className="role-badges">
                                    {player.otherRoles.map(role => (<span key={role} className="role-badge">{role}</span>))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── OVERALL ──────────────────────────────────────────────────── */}
            <div className="player-stats">
                {hasEnoughVotes && overall && (
                    <div className="overall-container">
                        <div className="overall-main">{utils.toBase10(overall).toFixed(2)}</div>
                        <div className="overall-label">Overall Rating</div>
                        <div className="votes-count">(Sulla base di {voteCount} valutazioni ricevute)</div>
                    </div>
                )}
            </div>

            {/* ── STATISTICHE PARTITE ──────────────────────────────────────── */}
            {wdl.total > 0 && (
                <div style={{ margin: '0 0 28px', padding: '20px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>

                    {/* W / D / L / % */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: extraStats.length > 0 || formStreak.length > 0 || voteHistory.length >= 2 ? '16px' : '0' }}>
                        {[
                            { label: 'VITTORIE', value: wdl.wins, color: '#48bb78' },
                            { label: 'PAREGGI', value: wdl.draws, color: '#f59e0b' },
                            { label: 'SCONFITTE', value: wdl.losses, color: '#f56565' },
                            { label: '% VITTORIA', value: `${winPct}%`, color: 'var(--volt)' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center', padding: '12px 4px', background: 'var(--bg-deep)', borderRadius: '8px' }}>
                                <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.5px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Gol / Clean sheet */}
                    {extraStats.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${extraStats.length}, 1fr)`, gap: '10px', marginBottom: formStreak.length > 0 || voteHistory.length >= 2 ? '16px' : '0' }}>
                            {extraStats.map(s => (
                                <div key={s.label} style={{ textAlign: 'center', padding: '12px 4px', background: 'var(--bg-deep)', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: s.color }}>{s.icon} {s.value}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.5px' }}>{s.label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Form streak */}
                    {formStreak.length > 0 && (
                        <div style={{ marginBottom: voteHistory.length >= 2 ? '16px' : '0' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '10px' }}>ULTIME {formStreak.length} PARTITE (più recente a destra)</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {formStreak.map((result, i) => {
                                    const c = result === 'V' ? '#48bb78' : result === 'P' ? '#f59e0b' : '#f56565';
                                    return (
                                        <div key={i} style={{
                                            width: '36px', height: '36px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '13px',
                                            background: `${c}22`,
                                            color: c, border: `2px solid ${c}`
                                        }}>{result}</div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Andamento voti */}
                    {voteHistory.length >= 2 && (
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '10px' }}>ANDAMENTO VOTI ({voteHistory.length} partite)</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <Sparkline data={voteHistory} width={Math.min(260, 30 + voteHistory.length * 28)} height={52} />
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                                    <div>Ultimo: <span style={{ color: 'var(--volt)', fontWeight: 'bold' }}>{voteHistory[voteHistory.length - 1].avg.toFixed(1)}</span></div>
                                    <div>Media: <span style={{ color: 'white', fontWeight: 'bold' }}>{(voteHistory.reduce((s, v) => s + v.avg, 0) / voteHistory.length).toFixed(1)}</span></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── RADAR CHARTS ─────────────────────────────────────────────── */}
            {hasEnoughVotes && averages ? (
                <div className="charts-container">
                    {Object.entries(getSkillsForPlayer(player)).map(([category, skills]) => {
                        const shortSkills = getShortSkillsForPlayer(player)[category];
                        const catOverall = utils.calculateCategoryOverall(averages, category, player);
                        return (
                            <div
                                key={category}
                                className={`chart-box ${flippedCard === category ? 'flipped' : ''}`}
                                onClick={() => handleCardClick(category)}
                            >
                                <div className="chart-box-inner">
                                    <div className="chart-box-front">
                                        <h3 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h3>
                                        {catOverall && (
                                            <div className="category-overall">
                                                {utils.toBase10(catOverall).toFixed(2)}
                                            </div>
                                        )}
                                        <RadarChart
                                            data={averages}
                                            labels={skills}
                                            shortLabels={shortSkills}
                                            category={category}
                                        />
                                    </div>
                                    <div className="chart-box-back">
                                        <h4 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h4>
                                        <div className="chart-detail-list">
                                            {skills.map(skill => (
                                                <div key={skill} className="chart-detail-item">
                                                    <span>{skill}</span>
                                                    <span className={`category-${category}`}>
                                                        {averages[skill]
                                                            ? utils.toBase10(averages[skill]).toFixed(2)
                                                            : '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="no-votes">
                    <h3>📊 Grafici non disponibili</h3>
                    <p>{isOwnProfile ? "Chiedi ai tuoi compagni di valutarti!" : "Questo giocatore ha bisogno di più valutazioni"}</p>
                    <p>Servono almeno {VOTING.MIN_VOTES_FOR_DISPLAY} valutazioni (attualmente: {voteCount})</p>
                </div>
            )}
        </div>
    );
}

export default PlayerProfile;

/**
 * Componente per la visualizzazione del profilo di un giocatore (proprio o altrui).
 * @param {object} player - L'oggetto utente da visualizzare.
 * @param {Array<object>} votes - Lista di tutti i voti.
 * @param {boolean} isOwnProfile - True se è il profilo dell'utente loggato.
 * @param {function} onBack - Callback per tornare indietro (se non è il proprio profilo).
 */
function PlayerProfile({ player, votes = [], matches = [], matchVotes = [], isOwnProfile, onBack }) {
    const playerVotes = votes.filter(v => v.playerId === player.id);
    const voteCount = utils.countVotes(player.id, votes);
    const hasEnoughVotes = voteCount >= VOTING.MIN_VOTES_FOR_DISPLAY;
    const averages = utils.calculateAverages(player.id, votes, player);
    const overall = matches.length > 0
        ? utils.calculateFormulaBasedOverall(averages, player.id, matches, matchVotes, CLASSIFICATION_FORMULA)
        : utils.calculateOverall(averages);
    const playerMatches = utils.getPlayerMatchHistory(player.id, matches);
    const mvpCount = utils.calculateMVPCount(player.id, playerMatches, matchVotes);
    const topScorerCount = utils.calculateTopScorerCount(player.id, player.name, playerMatches);
    const cleanSheetCount = player.isGoalkeeper
        ? utils.calculateCleanSheets(player.id, player.name, playerMatches, CLEAN_SHEET_MAX_GOALS)
        : 0;
    const [flippedCard, setFlippedCard] = useState(null);
    const handleCardClick = (category) => {
        if (window.innerWidth <= UI.MOBILE_BREAKPOINT_PX) {
            setFlippedCard(flippedCard === category ? null : category);
        }
    };

    return (
        <div className="section-container">
            <div className="section-header">
                <h2>Profilo Giocatore</h2>
                {onBack && (
                    <button className="btn-back" onClick={onBack}>← Indietro</button>
                )}
            </div>

            <div className="player-profile">
                <div className="player-info">
                    <div className="avatar profile-info">
                        {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                    </div>
                    {/* Badge Statistiche - A SINISTRA */}
                    {(mvpCount > 0 || topScorerCount > 0 || cleanSheetCount > 0) && (
                        <div className="badges profile-info">
                            {mvpCount > 0 && (
                                <div className="award-card mvp">
                                    <div className="award-inner">
                                        <img src={mvpIcon} alt="MVP" className="award-icon" />
                                        <div className="title">x{mvpCount}</div>
                                    </div>
                                </div>
                            )}
                            {topScorerCount > 0 && (
                                <div className="award-card scorer">
                                    <div className="award-inner">
                                        <img src={topScorerIcon} alt="Top Scorer" className="award-icon" />
                                        <div className="title">x{topScorerCount}</div>
                                    </div>
                                </div>
                            )}
                            {player.isGoalkeeper && cleanSheetCount > 0 && (
                                <div className="award-card clean-sheet">
                                    <div className="award-inner">
                                        <img src={cleanSheetIcon} alt="Clean Sheet" className="award-icon" />
                                        <div className="title">x{cleanSheetCount}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="name profile-info">
                    <h2>{player.name} {player.isGoalkeeper && '🧤'}</h2>
                </div>
                {(player.preferredRole || (player.otherRoles && player.otherRoles.length > 0)) && (
                    <div className="role-info">
                        {player.preferredRole && (
                            <div className="role-item">
                                <div className="role-label">Ruolo preferito</div>
                                <div className="role-value">{player.preferredRole}</div>
                            </div>
                        )}
                        {player.otherRoles && player.otherRoles.length > 0 && (
                            <div className="role-item">
                                <div className="role-label">Mi adatto anche a</div>
                                <div className="role-badges">
                                    {player.otherRoles.map(role => (<span key={role} className="role-badge">{role}</span>))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Container con Badge a sinistra e OVR al centro */}
            <div className="player-stats">

                {/* Overall Rating - AL CENTRO */}
                {hasEnoughVotes && overall && (
                    <div className="overall-container">
                        <div className="overall-main">{utils.toBase10(overall).toFixed(2)}</div>
                        <div className="overall-label">Overall Rating</div>
                        <div className="votes-count">(Sulla base di {voteCount} valutazioni ricevute)</div>

                    </div>
                )}
            </div>

            {/* Grafici Radar delle skill */}
            {hasEnoughVotes && averages ? (
                <div className="charts-container">
                    {Object.entries(getSkillsForPlayer(player)).map(([category, skills]) => {
                        const shortSkills = getShortSkillsForPlayer(player)[category];
                        const catOverall = utils.calculateCategoryOverall(averages, category, player);

                        return (
                            <div
                                key={category}
                                className={`chart-box ${flippedCard === category ? 'flipped' : ''}`}
                                onClick={() => handleCardClick(category)}
                            >
                                <div className="chart-box-inner">

                                    {/* FRONT (Radar) */}
                                    <div className="chart-box-front">
                                        <h3 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h3>

                                        {catOverall && (
                                            <div className="category-overall">
                                                {utils.toBase10(catOverall).toFixed(2)}
                                            </div>
                                        )}

                                        <RadarChart
                                            data={averages}
                                            labels={skills}         // skill estese → per i valori
                                            shortLabels={shortSkills} // abbreviazioni → per visualizzare
                                            category={category}
                                        />
                                    </div>

                                    {/* BACK (Lista dettagliata con label estese) */}
                                    <div className="chart-box-back">
                                        <h4 className={`category-${category}`}>
                                            {category.charAt(0).toUpperCase() + category.slice(1)}
                                        </h4>
                                        <div className="chart-detail-list">
                                            {skills.map(skill => (
                                                <div key={skill} className="chart-detail-item">
                                                    <span>{skill}</span>
                                                    <span className={`category-${category}`}>
                                                        {averages[skill]
                                                            ? utils.toBase10(averages[skill]).toFixed(2)
                                                            : '-'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="no-votes">
                    <h3>📊 Grafici non disponibili</h3>
                    <p>{isOwnProfile ? "Chiedi ai tuoi compagni di valutarti!" : "Questo giocatore ha bisogno di più valutazioni"}</p>
                    <p>Servono almeno {VOTING.MIN_VOTES_FOR_DISPLAY} valutazioni (attualmente: {voteCount})</p>                </div>
            )}
        </div>
    );
}

export default PlayerProfile;