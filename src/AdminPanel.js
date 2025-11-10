// src/AdminPanel.js
import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ navigateTo }) {
    const [activeChats, setActiveChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка активных чатов
    const loadActiveChats = async () => {
        try {
            const response = await fetch('http://31.31.196.6:3000/api/admin/chats');
            if (response.ok) {
                const data = await response.json();
                setActiveChats(data.chats);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки чатов:', error);
        }
    };

    // Загрузка сообщений выбранного чата   
    const loadChatMessages = async (orderId) => {
        try {
            const response = await fetch(`http://31.31.196.6:3000/api/admin/chat/${orderId}`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
                setSelectedChat(orderId);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений:', error);
        }
    };

    // Отправка сообщения от оператора
    const sendOperatorMessage = async () => {
        if (!newMessage.trim() || !selectedChat) return;

        try {
            setIsLoading(true);
            const response = await fetch('http://31.31.196.6:3000/api/admin/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId: selectedChat,
                    message: newMessage,
                    type: 'support'
                })
            });

            if (response.ok) {
                const operatorMessage = {
                    id: Date.now(),
                    text: newMessage,
                    type: 'support',
                    timestamp: new Date().toISOString(),
                    isOperator: true
                };

                setMessages(prev => [...prev, operatorMessage]);
                setNewMessage('');
            }
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // WebSocket для реального времени
    useEffect(() => {
        loadActiveChats();
        
        // Опрашиваем новые сообщения каждые 5 секунд
        const interval = setInterval(() => {
            if (selectedChat) {
                loadChatMessages(selectedChat);
            }
            loadActiveChats();
        }, 5000);

        return () => clearInterval(interval);
    }, [selectedChat]);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendOperatorMessage();
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="admin-panel">
            <div className="admin-header">
                <h1>🛠️ Панель оператора</h1>
                <div className="admin-stats">
                    <span>Активных чатов: {activeChats.length}</span>
                    <button onClick={loadActiveChats} className="refresh-button">
                        🔄 Обновить
                    </button>
                </div>
            </div>

            <div className="admin-content">
                {/* Список чатов */}
                <div className="chats-list">
                    <h3>💬 Активные чаты</h3>
                    {activeChats.length === 0 ? (
                        <div className="no-chats">
                            <div className="no-chats-icon">💤</div>
                            <p>Нет активных чатов</p>
                        </div>
                    ) : (
                        activeChats.map(chat => (
                            <div
                                key={chat.orderId}
                                className={`chat-item ${selectedChat === chat.orderId ? 'selected' : ''}`}
                                onClick={() => loadChatMessages(chat.orderId)}
                            >
                                <div className="chat-header">
                                    <span className="chat-order">#{chat.orderId}</span>
                                    <span className="chat-time">{formatTime(chat.lastActivity)}</span>
                                </div>
                                <div className="chat-info">
                                    <span className="chat-type">
                                        {chat.exchangeData?.type === 'buy' ? '🟢 Покупка' : '🔴 Продажа'}
                                    </span>
                                    <span className="chat-amount">
                                        {chat.exchangeData?.amount} {chat.exchangeData?.type === 'buy' ? 'RUB' : 'USDT'}
                                    </span>
                                </div>
                                <div className="chat-preview">
                                    {chat.lastMessage ? (
                                        <>
                                            <span className="last-message">
                                                {chat.lastMessage.text.length > 50 
                                                    ? chat.lastMessage.text.substring(0, 50) + '...' 
                                                    : chat.lastMessage.text
                                                }
                                            </span>
                                            <span className="unread-count">
                                                {chat.unreadCount > 0 && `(${chat.unreadCount})`}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="no-messages">Нет сообщений</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Окно чата */}
                <div className="chat-window">
                    {selectedChat ? (
                        <>
                            <div className="chat-window-header">
                                <h3>Чат #{selectedChat}</h3>
                                <div className="chat-actions">
                                    <button className="action-button" title="Закрыть заявку">
                                        ✅ Завершить
                                    </button>
                                    <button className="action-button" title="Шаблоны ответов">
                                        📋 Шаблоны
                                    </button>
                                </div>
                            </div>

                            <div className="chat-messages">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`message ${msg.type} ${msg.isOperator ? 'operator' : ''}`}>
                                        <div className="message-content">
                                            <div className="message-text" 
                                                 dangerouslySetInnerHTML={{ __html: msg.text }} />
                                            <div className="message-time">
                                                {formatTime(msg.timestamp)}
                                                {msg.isOperator && ' 👨‍💼'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="chat-input-container">
                                <div className="chat-input">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Введите ответ..."
                                        rows="2"
                                        disabled={isLoading}
                                    />
                                    <button 
                                        onClick={sendOperatorMessage}
                                        disabled={!newMessage.trim() || isLoading}
                                        className="send-button"
                                    >
                                        {isLoading ? '⏳' : '📤'}
                                    </button>
                                </div>
                                <div className="quick-responses">
                                    <button 
                                        className="quick-response"
                                        onClick={() => setNewMessage('✅ Ваша заявка принята в обработку. Ожидайте перевод в течение 15-30 минут.')}
                                    >
                                        Заявка принята
                                    </button>
                                    <button 
                                        className="quick-response"
                                        onClick={() => setNewMessage('📋 Предоставьте реквизиты для перевода.')}
                                    >
                                        Запрос реквизитов
                                    </button>
                                    <button 
                                        className="quick-response"
                                        onClick={() => setNewMessage('💎 Перевод выполнен. Проверьте получение средств.')}
                                    >
                                        Перевод выполнен
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="no-chat-selected">
                            <div className="no-chat-icon">💬</div>
                            <h3>Выберите чат для общения</h3>
                            <p>Выберите чат из списка слева чтобы начать общение с клиентом</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Кнопка возврата */}
            <div className="admin-footer">
                <button onClick={() => navigateTo('home')} className="back-button">
                    ← Назад к обменнику
                </button>
            </div>
        </div>
    );
}

export default AdminPanel;

