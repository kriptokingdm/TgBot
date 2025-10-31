// src/Welcome.js
import React, { useState } from 'react';
import './Welcome.css';

function Welcome({ navigateTo }) {
    const [username, setUsername] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (username.trim()) {
            localStorage.setItem('currentUser', JSON.stringify({
                username: username.trim(),
                id: Date.now()
            }));
            localStorage.setItem('isLoggedIn', 'true');
            navigateTo();
        }
    };

    return (
        <div className="welcome-container">
            <div style={{
                background: 'white',
                padding: '40px',
                borderRadius: '20px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
            }}>
                <h1 style={{ color: '#333', marginBottom: '20px' }}>
                    Добро пожаловать! 🎉
                </h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Введите никнейм"
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '16px'
                        }}
                    />
                    <button 
                        type="submit"
                        style={{
                            background: '#007cff',
                            color: 'white',
                            border: 'none',
                            padding: '15px 30px',
                            borderRadius: '10px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        Начать обмен
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Welcome;