import { useState } from 'react';
import storage from '../storage.js';

export function LoginPage({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const user = await storage.handleLogin();
            if (user && user.email) {
                onLogin(user.email);
            }
        } catch (e) {
            if (e.message === 'POPUP_BLOCKED') {
                setError("⚠️ Popup bloccato. Attiva 'Modalità Desktop' nelle impostazioni del browser e riprova.");
            } else if (e.code === 'auth/popup-closed-by-user') {
                setError("Login annullato.");
            } else {
                setError("Accesso fallito. Prova ad attivare 'Modalità Desktop' nel browser.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>⚽ Sportivity</h1>
                <p>Accedi per giocare con gli amici e sentirti dentro Fifa!</p>

                {error && <div className="error-message">{error}</div>}

                <button
                    className="google-btn"
                    onClick={handleGoogleLogin}
                    disabled={loading}>
                    <span>🔐</span>
                    {loading ? 'Accesso in corso...' : 'Accedi con Google'}
                </button>
                <p className="login-hint">Al primo accesso potrai associare il tuo profilo</p>
            </div>
        </div>
    );
}
