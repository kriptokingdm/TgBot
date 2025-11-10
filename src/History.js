// src/History.js
import React, { useState, useEffect } from 'react';
import './History.css';
import SupportChat from './SupportChat';

function History({ navigateTo }) {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeChat, setActiveChat] = useState(null);
    const [viewMode, setViewMode] = useState('active');

    useEffect(() => {
        fetchUserOrders();
    }, []);

    const fetchUserOrders = async () => {
        try {
            console.log('🔄 Начинаем загрузку истории...');

            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('currentUser');

            console.log('🔑 Токен:', token ? 'Есть' : 'Нет');
            console.log('👤 Данные пользователя:', userData);

            if (!token) {
                setError('Не авторизован');
                setIsLoading(false);
                return;
            }

            let username;
            try {
                const decoded = atob(token);
                username = decoded.split(':')[0];
                console.log('👤 Username из токена:', username);
            } catch (e) {
                console.log('❌ Ошибка декодирования токена:', e);
                setError('Ошибка авторизации');
                setIsLoading(false);
                return;
            }

            const response = await fetch(`http://31.31.196.6:3000${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Ответ сервера:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('📦 Данные с сервера:', data);

            if (data.success) {
                const sortedOrders = (data.orders || []).sort((a, b) =>
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                console.log('✅ Отсортированные ордера:', sortedOrders);
                setOrders(sortedOrders);
            } else {
                setError(data.error || 'Ошибка загрузки');
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки истории:', error);
            setError('Ошибка соединения с сервером');

            const testOrders = [
                {
                    id: 'TEST001',
                    type: 'buy',
                    amount: 5000,
                    rate: 92.5,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    cryptoAddress: {
                        network: 'TRC20',
                        address: 'TEst12345678901234567890'
                    }
                },
                {
                    id: 'TEST002',
                    type: 'sell',
                    amount: 100,
                    rate: 87.5,
                    status: 'pending',
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    paymentMethod: {
                        name: 'Сбербанк',
                        number: '1234'
                    }
                }
            ];
            setOrders(testOrders);
        } finally {
            setIsLoading(false);
        }
    };

    const getFilteredOrders = () => {
        if (viewMode === 'active') {
            return orders.filter(order =>
                order.status === 'pending' || order.status === 'paid' || order.status === 'processing'
            );
        }
        return orders;
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'completed':
                return { class: 'status-completed', text: 'Завершено', icon: '✅' };
            case 'paid':
                return { class: 'status-paid', text: 'Оплачено', icon: '💰' };
            case 'pending':
                return { class: 'status-pending', text: 'Ожидание', icon: '⏳' };
            case 'processing':
                return { class: 'status-pending', text: 'В обработке', icon: '⚡' };
            case 'cancelled':
                return { class: 'status-cancelled', text: 'Отменено', icon: '❌' };
            default:
                return { class: 'status-pending', text: status, icon: '⚡' };
        }
    };

    const calculateTotal = (order) => {
        if (order.type === 'buy') {
            return (order.amount / order.rate).toFixed(2) + ' USDT';
        } else {
            return (order.amount * order.rate).toFixed(2) + ' RUB';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getNetworkIcon = (network) => {
        const icons = {
            'ERC20': '⛓️',
            'TRC20': '⚡',
            'TON': '💎',
            'SOL': '🔥'
        };
        return icons[network] || '🔗';
    };

    const canOpenChat = (order) => {
        console.log('🔍 Проверка чата для ордера:', order.id, 'Статус:', order.status);

        // Чат доступен ТОЛЬКО для активных статусов
        const canChat = order.status === 'pending' || order.status === 'paid' || order.status === 'processing';
        console.log('✅ Чат доступен:', canChat);

        return canChat;
    };

    const openOrderChat = (order) => {
        console.log('💬 Пытаемся открыть чат для заявки:', order);
        console.log('📊 ID:', order.id, 'Статус:', order.status, 'Тип:', order.type);

        if (!canOpenChat(order)) {
            console.log('❌ Чат недоступен! Статус:', order.status);
            alert(`❌ Чат недоступен для заявок со статусом "${order.status}"`);
            return;
        }

        console.log('✅ Открываем чат для заявки:', order.id);

        const exchangeData = {
            type: order.type,
            amount: order.amount,
            rate: order.rate,
            convertedAmount: calculateTotal(order)
        };

        setActiveChat({
            orderId: order.id,
            exchangeData: exchangeData
        });

        console.log('🎯 Чат установлен:', order.id);
    };

    const closeChat = () => {
        setActiveChat(null);
    };

    const copyOrderId = (orderId) => {
        navigator.clipboard.writeText(orderId);
        alert('✅ ID заявки скопирован!');
    };

    const getOrdersStats = () => {
        const activeOrders = orders.filter(order =>
            order.status === 'pending' || order.status === 'paid' || order.status === 'processing'
        );
        const completedOrders = orders.filter(order => order.status === 'completed');

        return {
            total: orders.length,
            active: activeOrders.length,
            completed: completedOrders.length
        };
    };

    const stats = getOrdersStats();
    const filteredOrders = getFilteredOrders();

    return (
        <div className="home-container">
            <div className="page-header">
                <h1>История операций</h1>
            </div>

            <div className="history-content">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-icon">💫</div>
                        <p>Загрузка истории...</p>
                        <button
                            className="start-exchange-button"
                            onClick={fetchUserOrders}
                            style={{ marginTop: '10px', background: '#666' }}
                        >
                            🔄 Обновить
                        </button>
                    </div>
                ) : error ? (
                    <div className="no-history-message">
                        <div className="no-history-icon">⚠️</div>
                        <p>Ошибка загрузки</p>
                        <p className="history-subtext">{error}</p>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                            <button
                                className="start-exchange-button"
                                onClick={fetchUserOrders}
                                style={{ background: '#007cff' }}
                            >
                                🔄 Повторить
                            </button>
                            <button
                                className="start-exchange-button"
                                onClick={() => navigateTo('home')}
                                style={{ background: '#009F00' }}
                            >
                                🏠 На главную
                            </button>
                        </div>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="no-history-message">
                        <div className="no-history-icon">📊</div>
                        <p>История операций пуста</p>
                        <p className="history-subtext">Совершите первую операцию обмена</p>
                        <button
                            className="start-exchange-button"
                            onClick={() => navigateTo('home')}
                        >
                            💰 Начать обмен
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="history-header">
                            <h2 style={{ margin: 0, fontSize: '18px' }}>Мои операции</h2>
                            <div className="history-stats">
                                <div className="stat-badge">
                                    Всего: {stats.total}
                                </div>
                                <div className="stat-badge" style={{ background: 'rgba(0, 124, 255, 0.1)', color: '#007CFF' }}>
                                    Активных: {stats.active}
                                </div>
                            </div>
                        </div>

                        <div className="view-mode-switcher">
                            <button
                                className={`view-mode-button ${viewMode === 'active' ? 'active' : ''}`}
                                onClick={() => setViewMode('active')}
                            >
                                🔥 Активные ({stats.active})
                            </button>
                            <button
                                className={`view-mode-button ${viewMode === 'all' ? 'active' : ''}`}
                                onClick={() => setViewMode('all')}
                            >
                                📋 Все операции ({stats.total})
                            </button>
                        </div>

                        <div className="orders-list">
                            {filteredOrders.length === 0 ? (
                                <div className="no-orders-message">
                                    <div className="no-orders-icon">🔍</div>
                                    <p>
                                        {viewMode === 'active'
                                            ? 'Нет активных операций'
                                            : 'Операции не найдены'
                                        }
                                    </p>
                                    <p className="no-orders-subtext">
                                        {viewMode === 'active'
                                            ? 'Все операции завершены или отменены'
                                            : 'Попробуйте изменить фильтр'
                                        }
                                    </p>
                                    <button
                                        className="start-exchange-button"
                                        onClick={() => setViewMode('all')}
                                        style={{ marginTop: '10px', background: '#666' }}
                                    >
                                        📋 Показать все
                                    </button>
                                </div>
                            ) : (
                                filteredOrders.map((order) => {
                                    const statusInfo = getStatusInfo(order.status);
                                    const isBuy = order.type === 'buy';
                                    const canChat = canOpenChat(order);
                                    const isActive = order.status === 'pending' || order.status === 'paid' || order.status === 'processing';

                                    return (
                                        <div key={order.id} className={`order-item ${isActive ? 'active-order' : ''}`}>
                                            {isActive && (
                                                <div className="active-badge">🔥 Активно</div>
                                            )}

                                            <div className="order-header">
                                                <div className="order-id">#{order.id}</div>
                                                <div className={`order-status ${statusInfo.class}`}>
                                                    {statusInfo.icon} {statusInfo.text}
                                                </div>
                                            </div>

                                            <div className="order-main">
                                                <div className="order-type-amount">
                                                    <div className="order-type">
                                                        <span className={isBuy ? 'buy-icon' : 'sell-icon'}>
                                                            {isBuy ? 'B' : 'S'}
                                                        </span>
                                                        {isBuy ? 'Покупка USDT' : 'Продажа USDT'}
                                                    </div>
                                                    <div className="order-amount">
                                                        {order.amount} {isBuy ? 'RUB' : 'USDT'}
                                                    </div>
                                                </div>

                                                <div className="order-conversion">
                                                    <div className="order-rate">
                                                        Курс: {order.rate} RUB
                                                    </div>
                                                    <div className="order-total">
                                                        → {calculateTotal(order)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="order-details">
                                                <div className="detail-item">
                                                    <div className="detail-label">Сеть/Банк</div>
                                                    <div className="detail-value">
                                                        {order.cryptoAddress ? (
                                                            <>
                                                                {getNetworkIcon(order.cryptoAddress.network)} {order.cryptoAddress.network}
                                                            </>
                                                        ) : order.paymentMethod ? (
                                                            order.paymentMethod.type === 'sbp' ?
                                                                `📱 СБП: ${order.paymentMethod.number}` :
                                                                `💳 ${order.paymentMethod.name || 'Банковская карта'}`
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="detail-item">
                                                    <div className="detail-label">Создана</div>
                                                    <div className="detail-value">
                                                        {formatDate(order.createdAt)}
                                                    </div>
                                                </div>
                                            </div>

                                            {(order.completedAt || order.cancelledAt) && (
                                                <div className="order-details">
                                                    <div className="detail-item">
                                                        <div className="detail-label">
                                                            {order.completedAt ? 'Завершена' : 'Отменена'}
                                                        </div>
                                                        <div className="detail-value">
                                                            {order.cryptoAddress ? (
                                                                <>
                                                                    {getNetworkIcon(order.cryptoAddress.network)} {order.cryptoAddress.network}
                                                                </>
                                                            ) : order.paymentMethod ? (
                                                                order.paymentMethod.type === 'sbp' ?
                                                                    `📱 СБП: ${order.paymentMethod.number}` :
                                                                    `💳 ${order.paymentMethod.name || 'Банковская карта'}`
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="order-footer">
                                                <div className="order-date">
                                                    {formatDate(order.createdAt)}
                                                </div>
                                                <div className="order-actions">
                                                    <button
                                                        className="action-button"
                                                        onClick={() => copyOrderId(order.id)}
                                                    >
                                                        📋 ID
                                                    </button>

                                                    {canChat && (
                                                        <button
                                                            className="action-button chat-button-active"
                                                            onClick={() => openOrderChat(order)}
                                                        >
                                                            💬 Чат поддержки
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {activeChat && (
                <SupportChat
                    orderId={activeChat.orderId}
                    onClose={closeChat}
                    exchangeData={activeChat.exchangeData}
                />
            )}

            <div className="bottom-nav">
                <button className="nav-button" onClick={() => navigateTo('home')}>
                    <span>🏠</span>
                    <span>Обмен</span>
                </button>

                <button className="nav-button" onClick={() => navigateTo('profile')}>
                    <span>👤</span>
                    <span>Профиль</span>
                </button>

                <button className="nav-button active">
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

export default History;

