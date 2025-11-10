// src/Welcome.js
import React, { useState } from 'react';
import './Welcome.css';

function Welcome({ navigateTo }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true); // true = логин, false = регистрация

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!username.trim() || !password.trim()) {
            setError('Заполните все поля');
            setIsLoading(false);
            return;
        }

        try {
            const endpoint = isLogin ? '/api/login' : '/api/register';

            console.log('🔄 Отправка запроса на:', endpoint);

            // Строка ~20:
            const response = await fetch(`http://31.31.196.6:3000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password.trim(),
                    email: isLogin ? undefined : `${username.trim()}@tetherbot.com`
                })
            });

            const data = await response.json();
            console.log('📡 Ответ сервера:', data);

            if (data.success) {
                console.log('✅ Успешная авторизация:', data.user);

                // Сохраняем в localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                localStorage.setItem('isLoggedIn', 'true');

                navigateTo('home');
            } else {
                setError(data.error || 'Ошибка авторизации');
            }
        } catch (error) {
            console.error('❌ Ошибка:', error);
            setError('Ошибка соединения с сервером');
        } finally {
            setIsLoading(false);
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
                width: '100%',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                <div style={{ marginBottom: '30px' }}>
                    <h1 style={{
                        color: '#333',
                        marginBottom: '10px',
                        fontSize: '28px',
                        fontWeight: '700'
                    }}>
                        {isLogin ? 'Вход в TetherBot' : 'Регистрация'}
                    </h1>
                    <p style={{
                        color: '#666',
                        margin: 0,
                        fontSize: '16px'
                    }}>
                        {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    console.log('🔄 Пытаюсь подключиться к:', `http://31.31.196.6:3000${endpoint}`);
                    <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#333',
                            fontSize: '14px'
                        }}>
                            Имя пользователя
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Введите имя пользователя"
                            style={{
                                width: '100%',
                                padding: '14px',
                                border: '2px solid #e1e1e1',
                                borderRadius: '10px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#007cff'}
                            onBlur={(e) => e.target.style.borderColor = '#e1e1e1'}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '30px', textAlign: 'left' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: '600',
                            color: '#333',
                            fontSize: '14px'
                        }}>
                            Пароль
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Введите пароль"
                            style={{
                                width: '100%',
                                padding: '14px',
                                border: '2px solid #e1e1e1',
                                borderRadius: '10px',
                                fontSize: '16px',
                                transition: 'border-color 0.3s',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#007cff'}
                            onBlur={(e) => e.target.style.borderColor = '#e1e1e1'}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: '#ff3b30',
                            marginBottom: '20px',
                            padding: '12px',
                            background: 'rgba(255, 59, 48, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 59, 48, 0.2)',
                            fontSize: '14px'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            background: isLoading ? '#ccc' : '#007cff',
                            color: 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: '12px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            width: '100%',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.3s',
                            marginBottom: '20px'
                        }}
                        onMouseOver={(e) => !isLoading && (e.target.style.background = '#0066cc')}
                        onMouseOut={(e) => !isLoading && (e.target.style.background = '#007cff')}
                    >
                        {isLoading ? (
                            <span>⏳ Загрузка...</span>
                        ) : (
                            <span>{isLogin ? '🔐 Войти' : '🚀 Зарегистрироваться'}</span>
                        )}
                    </button>
                </form>

                <div style={{
                    borderTop: '1px solid #e1e1e1',
                    paddingTop: '20px'
                }}>
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setUsername('');
                            setPassword('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#007cff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}
                    >
                        {isLogin ? '📝 Нет аккаунта? Зарегистрироваться' : '🔐 Есть аккаунт? Войти'}
                    </button>
                </div>

                {/* Тестовые данные для быстрой проверки */}
                {isLogin && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f8f9fa',
                        borderRadius: '10px',
                        border: '1px solid #e1e1e1',
                        fontSize: '12px',
                        color: '#666'
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                            🧪 Тестовые аккаунты:
                        </div>
                        <div>👑 admin / admin123</div>
                        <div>👤 user1 / user123</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Welcome;

