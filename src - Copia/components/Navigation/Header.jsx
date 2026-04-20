// src/components/Navigation/Header.jsx
// © 2025 Luigi Oliviero | Calcetto Rating App | Tutti i diritti riservati

import React, { useState, useEffect, useRef } from 'react';
import utils from '../../utils.js';

function Header({ user, onLogout, onOpenSettings, setActiveTab }) {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    // ✅ Chiudi menu con ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && showMenu) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('keydown', handleEsc);
        }

        return () => {
            document.removeEventListener('keydown', handleEsc);
        };
    }, [showMenu]);

    // ✅ Chiudi menu con click outside
    useEffect(() => {
        if (!showMenu) return;

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);  // Per mobile

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showMenu]);

    // CLAUSOLA DI PROTEZIONE (GUARD CLAUSE)
    if (!user) {
        return null;
    }

    return (
        <div className="header">
            <div className="header-left">
                <h1>⚽ Sport<span style={{ color: 'var(--volt)' }}>ivity</span></h1>
                <p>Giocare con gli amici e sentirsi dentro Fifa!</p>
            </div>
            <div className="user-info" style={{ position: 'relative' }} ref={menuRef}>
                <div
                    className="avatar"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {user.avatar ? <img src={user.avatar} alt={user.name} /> : utils.getInitials(user.name)}
                </div>
                <div onClick={() => setShowMenu(!showMenu)} style={{ cursor: 'pointer' }}>
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email || 'Email non disponibile'}</div>
                </div>
                <button
                    className="user-menu-btn"
                    onClick={() => setShowMenu(!showMenu)}
                >
                    {showMenu ? '✕' : '☰'}
                </button>
                {showMenu && (
                    <div className="user-dropdown-menu">
                        <button className="dropdown-item" onClick={() => { onOpenSettings(); setShowMenu(false); }}>
                            ⚙️ Impostazioni
                        </button>
                        {user.isAdmin && (
                            <>
                                <button className="dropdown-item" onClick={() => { setActiveTab('admin'); setShowMenu(false); }}>
                                    🔧 Pannello Admin
                                </button>
                                <button className="dropdown-item" onClick={() => { setActiveTab('debug'); setShowMenu(false); }}>
                                    🛠 Debug
                                </button>
                            </>
                        )}
                        <button className="dropdown-item logout" onClick={() => { onLogout(); setShowMenu(false); }}>
                            🚪 Esci
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Header;