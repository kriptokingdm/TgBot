// src/Profile.js
import React, { useState, useEffect } from 'react';
import './Profile.css';

function Profile({ navigateTo }) {
    const [userData, setUserData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('token');
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            
            if (!token || !currentUser) {
                throw new Error('No token found');
            }

            console.log('🔄 Загрузка данных пользователя...');
            
            // Загружаем основные данные пользователя
            const userResponse = await fetch('`http://31.31.196.6:3000/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!userResponse.ok) {
                throw new Error(`HTTP ${userResponse.status}`);
            }
            
            const userDataResult = await userResponse.json();
            
            // Загружаем реальную статистику
            const statsResponse = await fetch(`http://31.31.196.6:3000/api/user/stats/${currentUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            let statsData = { stats: {} };
            if (statsResponse.ok) {
                statsData = await statsResponse.json();
            }

            // Объединяем данные
            const completeUserData = {
                ...userDataResult.user,
                stats: statsData.stats || { 
                    totalVolume: 0, 
                    totalTrades: 0, 
                    successRate: 0 
                },
                fromStorage: false
            };

            console.log('✅ Данные пользователя:', completeUserData);
            setUserData(completeUserData);
            
            // Сохраняем в localStorage
            localStorage.setItem('currentUser', JSON.stringify(completeUserData));
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            setError('Ошибка загрузки данных');
            
            // Пробуем взять данные из localStorage
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                console.log('⚠️ Использую данные из localStorage');
                const userFromStorage = JSON.parse(savedUser);
                // Добавляем недостающие поля
                const userWithDefaults = {
                    ...userFromStorage,
                    stats: userFromStorage.stats || { 
                        totalVolume: 0, 
                        totalTrades: 0, 
                        successRate: 0 
                    },
                    fromStorage: true
                };
                setUserData(userWithDefaults);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        console.log('🚪 Выход из системы');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        navigateTo('welcome');
    };

    if (isLoading) {
        return (
            <div className="home-container">
                <div className="page-header">
                    <h1>Профиль</h1>
                </div>
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#666'
                }}>
                    <div>⏳ Загрузка данных...</div>
                </div>
            </div>
        );
    }

    if (error && !userData) {
        return (
            <div className="home-container">
                <div className="page-header">
                    <h1>Профиль</h1>
                </div>
                <div style={{ 
                    textAlign: 'center', 
                    padding: '40px',
                    color: '#ff3b30'
                }}>
                    <div>❌ {error}</div>
                    <button 
                        onClick={fetchUserData}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            background: '#007cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        Повторить
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="home-container">
            <div className="page-header">
                <h1>Профиль</h1>
                <div style={{
                    fontSize: '14px',
                    color: '#007cff',
                    background: 'rgba(0, 124, 255, 0.1)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    marginTop: '5px'
                }}>
                    ID: {userData?.id || 'N/A'}
                </div>
            </div>
            
            <div className="profile-content">
                {/* Основная информация пользователя */}
                <div className="profile-section">
                    <div className="profile-item">
                        <span className="profile-label">👤 Никнейм</span>
                        <span className="profile-value">{userData?.username || 'N/A'}</span>
                    </div>
                    <div className="profile-item">
                        <span className="profile-label">📧 Email</span>
                        <span className="profile-value">{userData?.email || 'N/A'}</span>
                    </div>
                    <div className="profile-item">
                        <span className="profile-label">📅 Дата регистрации</span>
                        <span className="profile-value">{userData?.registrationDate || 'N/A'}</span>
                    </div>
                    <div className="profile-item">
                        <span className="profile-label">🟢 Статус</span>
                        <span className="profile-value verified">Верифицирован</span>
                    </div>
                </div>

                {/* Статистика */}
                <div className="profile-section">
                    <div className="stats-header">
                        <h3>📊 Статистика обменов</h3>
                        <span className="stats-date">Актуально</span>
                    </div>
                    
                    <div className="stats-grid">
                        <div className="stat-item">
                            <div className="stat-label">Всего сделок</div>
                            <div className="stat-value">{userData?.stats?.totalTrades || 0}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Успешных</div>
                            <div className="stat-value">{userData?.stats?.successfulTrades || 0}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Успешность</div>
                            <div className="stat-value">{userData?.stats?.successRate || 0}%</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Общий оборот</div>
                            <div className="stat-value">{(userData?.stats?.totalVolume || 0).toLocaleString()} ₽</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Средняя сумма</div>
                            <div className="stat-value">{(userData?.stats?.averageAmount || 0).toLocaleString()} ₽</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-label">Активных сделок</div>
                            <div className="stat-value">{userData?.stats?.activeTrades || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Кнопка выхода */}
                <div className="profile-section">
                    <button 
                        onClick={handleLogout}
                        className="logout-button"
                    >
                        🚪 Выйти из системы
                    </button>
                </div>

                {/* Отладочная информация */}
                <div style={{ 
                    background: '#f5f5f5', 
                    padding: '10px', 
                    borderRadius: '8px', 
                    marginTop: '10px',
                    fontSize: '12px',
                    color: '#666'
                }}>
                    <strong>Отладка:</strong> Данные {userData?.fromStorage ? 'из localStorage' : 'с сервера'}
                </div>
            </div>

            {/* Нижняя навигация */}
            <div className="bottom-nav">
                <button className="nav-button" onClick={() => navigateTo('home')}>
                    <span>🏠</span>
                    <span>Обмен</span>
                </button>
                
                <button className="nav-button active">
                    <span>👤</span>
                    <span>Профиль</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('history')}>
                    <span>📊</span>
                    <span>История</span>
                </button>
                
                <button className="nav-button" onClick={() => navigateTo('help')}>
                    <span>❓</span>
                    <span>Справка</span>
                </button>
            </div>
        </div>
    );
}

export default Profile;

