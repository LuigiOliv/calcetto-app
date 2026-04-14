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
    const topScorerCount = utils.calculateTopScorerCount(player.name, playerMatches);
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

            <div className="profile-header">
                <div className="avatar profile-avatar">
                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                </div>
                <div className="profile-header-info">
                    <h2>{player.name} {player.isGoalkeeper && '🧤'}</h2>
                    <div className="votes-count">Sulla base di {voteCount} valutazioni ricevute</div>
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
            <div className="profile-stats-row">
                {/* Badge Statistiche - A SINISTRA */}
                {(mvpCount > 0 || topScorerCount > 0 || cleanSheetCount > 0) && (
                    <div className="award-cards-container">
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
                {/* Overall Rating - AL CENTRO */}
                {hasEnoughVotes && overall && (
                    <div className="overall-container">
                        <div className="overall-main">{utils.toBase10(overall).toFixed(2)}</div>
                        <div className="overall-label">Overall Rating</div>
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