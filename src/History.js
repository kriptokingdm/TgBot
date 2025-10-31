// src/History.js
import React from 'react';
import './History.css';

function History({ navigateTo }) {
    return (
        <div className="home-container">
            <div className="page-header">
                <h1>История операций</h1>
            </div>
            
            <div className="history-content">
                <div className="no-history-message">
                    <div className="no-history-icon">📊</div>
                    <p>Здесь будет история ваших операций</p>
                    <p className="history-subtext">Совершите первую операцию обмена</p>
                </div>
            </div>

            {/* НИЖНЯЯ НАВИГАЦИЯ - ИСПРАВЛЕННАЯ */}
            <div className="bottom-nav">
                <button className="nav-button" onClick={() => navigateTo('home')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 7v6h2V9h-2zm1 11c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="#858589"/>
                        <path d="M11 7h2v6h-2z" fill="#858589"/>
                    </svg>
                    <span>Обмен</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('profile')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="#858589"/>
                    </svg>
                    <span>Профиль</span>
                </button>
                
                <button className="nav-button active">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#007CFF"/>
                        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z" fill="#007CFF"/>
                    </svg>
                    <span>История</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('help')}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="#858589"/>
                    </svg>
                    <span>Справка</span>
                </button>
            </div>
        </div>
    );
}

export default History;