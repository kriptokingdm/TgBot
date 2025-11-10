// src/SupportChat.js
import React, { useState, useEffect, useRef } from 'react';
import './SupportChat.css';

function SupportChat({ orderId, onClose, exchangeData }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [chatAvailable, setChatAvailable] = useState(true);
    const messagesEndRef = useRef(null);

    // Функция для плавного закрытия
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 200);
    };

    // Автоматическая прокрутка к новым сообщениям
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Загрузка истории чата и проверка доступности
    useEffect(() => {
        console.log('💬 SupportChat mounted for order:', orderId);
        checkChatAvailability();
        loadChatHistory();

        // Авто-обновление чата каждые 3 секунды
        const interval = setInterval(() => {
            loadChatHistory();
        }, 3000);

        return () => clearInterval(interval);
    }, [orderId]);

    // Проверка доступности чата
    const checkChatAvailability = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://31.31.196.6:3000${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const currentOrder = data.orders.find(order => order.id === orderId);
                
                if (currentOrder) {
                    const isAvailable = currentOrder.status === 'pending' || 
                                      currentOrder.status === 'paid' || 
                                      currentOrder.status === 'processing';
                    setChatAvailable(isAvailable);
                    
                    if (!isAvailable) {
                        console.log('❌ Чат недоступен, статус:', currentOrder.status);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Ошибка проверки доступности чата:', error);
        }
    };

    // Загрузка истории чата
    const loadChatHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://31.31.196.6:3000${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages);
                } else {
                    setMessages([]);
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки чата:', error);
        }
    };

    // Отправка сообщения пользователем
    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;

        // Проверяем доступность чата перед отправкой
        if (!chatAvailable) {
            alert('❌ Чат недоступен для завершенных или отмененных заявок');
            return;
        }

        const userMessage = {
            id: Date.now(),
            text: newMessage,
            type: 'user',
            timestamp: new Date().toISOString()
        };

        // Оптимистичное обновление UI
        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://31.31.196.6:3000/api/chat/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderId,
                    message: newMessage,
                    type: 'user'
                })
            });

            if (response.ok) {
                console.log('✅ Сообщение пользователя отправлено');
                setIsLoading(false);
                // Обновляем историю
                loadChatHistory();
            } else {
                console.error('❌ Ошибка отправки сообщения');
                setIsLoading(false);
                // Удаляем сообщение из UI если ошибка
                setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
            }
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            setIsLoading(false);
            // Удаляем сообщение из UI если ошибка
            setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const openTelegram = () => {
        window.open('https://t.me/tetherbot_support', '_blank');
    };

    // Функция для форматирования сообщений
    const formatMessage = (message) => {
        return (
            <div className="message-content">
                <div className="message-text">
                    {message.text}
                </div>
                <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className={`support-chat-overlay ${isClosing ? 'closing' : ''}`}>
            <div className="support-chat">
                {/* Заголовок чата */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        <h3>💬 Поддержка по заявке #{orderId}</h3>
                        <span className="chat-status">
                            {chatAvailable ? '🟢 Чат активен' : '🔴 Чат завершен'}
                        </span>
                    </div>
                    <button className="close-chat" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                {/* Баннер если чат недоступен */}
                {!chatAvailable && (
                    <div className="chat-unavailable-banner">
                        <div className="unavailable-icon">🔒</div>
                        <div className="unavailable-text">
                            <strong>Чат недоступен</strong>
                            <span>Заявка завершена или отменена</span>
                        </div>
                    </div>
                )}

                {/* Сообщения */}
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.type}`}>
                            {formatMessage(msg)}
                        </div>
                    ))}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* Ввод сообщения (только если чат доступен) */}
                {chatAvailable ? (
                    <div className="chat-input-container">
                        <div className="chat-input">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Введите ваше сообщение..."
                                rows="1"
                                disabled={isLoading}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isLoading}
                                className="send-button"
                            >
                                {isLoading ? '⏳' : '📤'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="chat-disabled-message">
                        <p>💬 Чат доступен только для активных заявок</p>
                        <button onClick={openTelegram} className="telegram-button">
                            💬 Написать в Telegram для помощи
                        </button>
                    </div>
                )}

                {/* Альтернатива Telegram */}
                <div className="chat-alternative">
                    <button onClick={openTelegram} className="telegram-button">
                        💬 Написать в Telegram для быстрой помощи
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SupportChat;

