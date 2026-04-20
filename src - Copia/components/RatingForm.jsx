// src/components/RatingForm.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import { useState } from 'react';
import utils from '../utils.js';
import { getSkillsForPlayer, RATING } from '../constants.js';

function RatingForm({ player, onSubmit, onCancel }) {
    const [ratings, setRatings] = useState({});
    const playerSkills = getSkillsForPlayer(player);

    const isComplete = () => {
        const allSkills = [...playerSkills.tecniche, ...playerSkills.tattiche, ...playerSkills.fisiche];
        return allSkills.every(skill => ratings[skill]);
    };

    const handleSubmit = () => {
        if (isComplete()) {
            onSubmit(player.id, ratings);
        } else {
            alert('Completa tutte le valutazioni prima di inviare');
        }
    };

    return (
        <div className="rating-form">
            <div className="form-header">
                <div className="avatar">
                    {player.avatar ? <img src={player.avatar} alt={player.name} /> : utils.getInitials(player.name)}
                </div>
                <h2>Valuta {player.name} {player.isGoalkeeper && '🧤'}</h2>
                <p>Scala: {RATING.RATING_MIN}=Il peggiore | {RATING.RATING_MAX}=Il migliore</p>
            </div>
            {Object.entries(playerSkills).map(([category, skills]) => (
                <div key={category} className="category-section">
                    <div className={`category-title category-${category}`}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </div>
                    {skills.map(skill => (
                        <div key={skill} className="skill-item">
                            <div className="skill-name">{skill}</div>
                            <div className="rating-buttons">
                                {Array.from({ length: RATING.RATING_MAX - RATING.RATING_MIN + 1 }, (_, i) => i + RATING.RATING_MIN).map(value => (<button
                                    key={value}
                                    className={`rating-btn ${ratings[skill] === value ? 'selected' : ''}`}
                                    onClick={() => setRatings(prev => ({ ...prev, [skill]: value }))}
                                >
                                    {value}
                                </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            <div className="form-actions">
                <button className="btn btn-secondary" onClick={onCancel}>Annulla</button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={!isComplete()}>
                    ✓ Invia Valutazione
                </button>
            </div>
        </div>
    );
}

export default RatingForm;