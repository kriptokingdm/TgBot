// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Лимиты и таймауты
const MIN_RUB = 1000;
const MAX_RUB = 1000000;
const MIN_USDT = 10;
const MAX_USDT = 10000;
const ORDER_TIMEOUT_MINUTES = 15;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Файлы для хранения данных
const USERS_FILE = './users.json';
const ORDERS_FILE = './orders.json';
const SETTINGS_FILE = './settings.json';

// ==================== TELEGRAM NOTIFICATIONS ====================

const TELEGRAM_BOT_TOKEN = '7950211944:AAGwDmV_XcS8K2nADlX2HoAkf9fTemcN-pI';
const ADMIN_CHAT_ID = '7879866656';

// Настройки курсов по умолчанию
const DEFAULT_SETTINGS = {
    baseRate: 85.0,
    spread: 2.0,
    tiers: [
        { range: "0-100$", multiplier: 1.08 },
        { range: "100-1000$", multiplier: 1.05 },
        { range: "1000-10000$", multiplier: 1.02 },
        { range: "10000$+", multiplier: 1.00 }
    ],
    lastUpdated: new Date().toISOString(),
    updatedBy: "system",
    exchangeEnabled: true,
    quietHours: {
        enabled: false,
        startTime: "23:00",
        endTime: "08:00"
    }
};

// ==================== ПРОВЕРКА ТИХОГО ЧАСА ====================

function isQuietHours(settings) {
    if (!settings.quietHours || !settings.quietHours.enabled) {
        return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMinute] = settings.quietHours.startTime.split(':').map(Number);
    const [endHour, endMinute] = settings.quietHours.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    if (startTime <= endTime) {
        return currentTime >= startTime && currentTime < endTime;
    } else {
        return currentTime >= startTime || currentTime < endTime;
    }
}

function getQuietHoursMessage(settings) {
    if (!settings.quietHours || !settings.quietHours.enabled) {
        return null;
    }
    
    return `⏰ <b>ТИХИЙ ЧАС АКТИВЕН</b>\n\n` +
           `🕒 Время: ${settings.quietHours.startTime} - ${settings.quietHours.endTime}\n` +
           `📋 Создание заявок временно приостановлено\n` +
           `🔄 Сервис возобновит работу в ${settings.quietHours.endTime}`;
}

//////////////////////////////////////////////////////////////////////////

async function sendTelegramNotification(message) {
    try {
        console.log('📨 Отправка уведомления в Telegram...');
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        if (result.ok) {
            console.log('✅ Уведомление отправлено в Telegram');
        } else {
            console.error('❌ Ошибка Telegram API:', result);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error);
    }
}

// ==================== СЕРВЕРНЫЕ ФУНКЦИИ ====================

function initializeDataFiles() {
    const files = [
        { file: USERS_FILE, defaultData: [] },
        { file: ORDERS_FILE, defaultData: [] },
        { file: SETTINGS_FILE, defaultData: DEFAULT_SETTINGS }
    ];

    files.forEach(({ file, defaultData }) => {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
            console.log(`✅ Создан файл: ${file}`);
        } else {
            console.log(`✅ Файл существует: ${file}`);
        }
    });

    const users = readData(USERS_FILE) || [];
    if (users.length === 0) {
        console.log('👤 Создаем тестового пользователя...');
        const testUser = {
            id: 'USER_TEST_' + Date.now(),
            username: 'testuser',
            password: 'testpass',
            email: 'test@tetherbot.com',
            registrationDate: new Date().toISOString(),
            stats: {
                totalTrades: 0,
                totalVolume: 0,
                successRate: 0
            },
            isVerified: true
        };
        users.push(testUser);
        writeData(USERS_FILE, users);
        console.log('✅ Тестовый пользователь создан:', testUser.username);
    }
}

function readData(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`❌ Ошибка чтения ${file}:`, error);
        return null;
    }
}

function writeData(file, data) {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`❌ Ошибка записи ${file}:`, error);
        return false;
    }
}

function getCurrentSettings() {
    const settings = readData(SETTINGS_FILE);
    return settings || DEFAULT_SETTINGS;
}

function updateSettings(newSettings) {
    const currentSettings = getCurrentSettings();
    const updatedSettings = {
        ...currentSettings,
        ...newSettings,
        lastUpdated: new Date().toISOString()
    };
    return writeData(SETTINGS_FILE, updatedSettings);
}

// ==================== РАСЧЕТ КУРСОВ ====================

function calculateRates(amount, settings) {
    let tier;
    
    // Определяем тариф в зависимости от суммы
    if (amount < 100) {
        tier = settings.tiers[0];        // 0-100$: наименее выгодный
    } else if (amount < 1000) {
        tier = settings.tiers[1];        // 100-1000$: средняя выгода
    } else if (amount < 10000) {
        tier = settings.tiers[2];        // 1000-10000$: выгодно
    } else {
        tier = settings.tiers[3];        // 10000$+: максимальная выгода
    }
    
    // ПОКУПКА USDT: пользователь отдает RUB, хочет купить подешевле
    // Чем больше сумма - тем МЕНЬШЕ RUB за 1 USDT
    const buyRate = settings.baseRate * (2 - tier.multiplier);
    
    // ПРОДАЖА USDT: пользователь отдает USDT, хочет получить больше RUB
    // Чем больше сумма - тем БОЛЬШЕ RUB за 1 USDT
    const sellRate = settings.baseRate * tier.multiplier;
    
    return {
        buy: Math.round(buyRate * 100) / 100,
        sell: Math.round(sellRate * 100) / 100,
        tier: tier.range
    };
}

// ==================== АВТО-ОТМЕНА ЗАЯВОК ====================

function checkAndCancelExpiredOrders() {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const now = new Date();
        let changed = false;

        const updatedOrders = orders.map(order => {
            if ((order.status === 'pending' || order.status === 'paid') && order.createdAt) {
                const orderTime = new Date(order.createdAt);
                const diffMinutes = (now - orderTime) / (1000 * 60);
                
                if (diffMinutes > ORDER_TIMEOUT_MINUTES) {
                    console.log(`🕐 Авто-отмена просроченной заявки #${order.id}`);
                    changed = true;
                    
                    return {
                        ...order,
                        status: 'cancelled',
                        cancelledAt: new Date().toISOString(),
                        cancelReason: 'Автоматическая отмена: время истекло',
                        messages: [
                            ...(order.messages || []),
                            {
                                id: (order.messages?.length || 0) + 1,
                                text: `❌ Заявка автоматически отменена. Причина: время выполнения истекло (${ORDER_TIMEOUT_MINUTES} минут)`,
                                type: 'system',
                                timestamp: new Date().toISOString()
                            }
                        ]
                    };
                }
            }
            return order;
        });

        if (changed) {
            writeData(ORDERS_FILE, updatedOrders);
            console.log(`✅ Авто-отмена: обновлено ${updatedOrders.filter(o => o.status === 'cancelled' && o.cancelReason?.includes('Автоматическая')).length} заявок`);
        }

        return changed;
    } catch (error) {
        console.error('❌ Ошибка авто-отмены заявок:', error);
        return false;
    }
}

// Запуск авто-проверки каждую минуту
setInterval(() => {
    checkAndCancelExpiredOrders();
}, 60000);

// ==================== API ENDPOINTS ====================

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'TetherBot Server is running',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

app.get('/api/exchange-rate', (req, res) => {
    try {
        const { amount } = req.query;
        const requestAmount = amount ? parseFloat(amount) : 100;
        const settings = getCurrentSettings();

        const rates = calculateRates(requestAmount, settings);

        res.json({
            success: true,
            buy: rates.buy,
            sell: rates.sell,
            tier: rates.tier
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка расчета курса'
        });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;

        if (!username || !password) {
            return res.json({
                success: false,
                error: 'Заполните все поля'
            });
        }

        const users = readData(USERS_FILE) || [];
        
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.json({
                success: false,
                error: 'Пользователь уже существует'
            });
        }

        const newUser = {
            id: `USER${Date.now()}`,
            username: username,
            password: password,
            email: email || `${username}@tetherbot.com`,
            registrationDate: new Date().toISOString(),
            stats: {
                totalTrades: 0,
                totalVolume: 0,
                successRate: 0
            },
            isVerified: true
        };

        users.push(newUser);
        writeData(USERS_FILE, users);

        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

        res.json({
            success: true,
            user: newUser,
            token: token,
            message: 'Регистрация успешна'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка регистрации'
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({
                success: false,
                error: 'Заполните все поля'
            });
        }

        const users = readData(USERS_FILE) || [];
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return res.json({
                success: false,
                error: 'Неверный логин или пароль'
            });
        }

        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

        res.json({
            success: true,
            user: user,
            token: token,
            message: 'Авторизация успешна'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка авторизации'
        });
    }
});

app.get('/api/user/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const orders = readData(ORDERS_FILE) || [];
        const userOrders = orders.filter(order => order.userId === userId);
        
        const completedOrders = userOrders.filter(order => order.status === 'completed');
        const pendingOrders = userOrders.filter(order => order.status === 'pending' || order.status === 'paid');
        const cancelledOrders = userOrders.filter(order => order.status === 'cancelled');
        
        const totalTrades = userOrders.length;
        const successfulTrades = completedOrders.length;
        
        const successRate = totalTrades > 0 
            ? Math.round((successfulTrades / totalTrades) * 100)
            : 0;
        
        const totalVolume = completedOrders.reduce((sum, order) => {
            if (order.type === 'buy') {
                return sum + order.amount;
            } else {
                return sum + (order.amount * order.rate);
            }
        }, 0);
        
        const averageAmount = successfulTrades > 0 
            ? Math.round(totalVolume / successfulTrades)
            : 0;
        
        const activeTrades = pendingOrders.length;

        res.json({
            success: true,
            stats: {
                totalTrades,
                successfulTrades,
                successRate,
                totalVolume,
                averageAmount,
                activeTrades,
                cancelledTrades: cancelledOrders.length
            }
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки статистики'
        });
    }
});

app.get('/api/user', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Токен не предоставлен'
            });
        }

        const users = readData(USERS_FILE) || [];
        const [username] = Buffer.from(token, 'base64').toString().split(':');
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Неверный токен'
            });
        }

        res.json({
            success: true,
            user: user
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки пользователя'
        });
    }
});

// ==================== ОБНОВЛЕННЫЙ CREATE-ORDER С РЕКВИЗИТАМИ ====================

app.post('/api/create-order', async (req, res) => {
    try {
        const { type, amount, rate, userId, paymentMethod, cryptoAddress } = req.body;
        
        console.log('🔄 CREATE ORDER - Входные данные:', { 
            type, 
            amount, 
            rate, 
            userId,
            paymentMethod,
            cryptoAddress
        });

        // ПРОВЕРКА ДОСТУПНОСТИ ОБМЕНА
        const settings = getCurrentSettings();
        
        if (!settings.exchangeEnabled) {
            return res.status(403).json({
                success: false,
                error: '❌ Обмен временно приостановлен администратором. Пожалуйста, попробуйте позже.'
            });
        }

        if (isQuietHours(settings)) {
            const quietMessage = getQuietHoursMessage(settings);
            return res.status(403).json({
                success: false,
                error: quietMessage || '❌ Создание заявок временно приостановлено (тихий час). Пожалуйста, попробуйте в рабочее время.'
            });
        }

        if (!type || !amount || !rate || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Не все обязательные поля заполнены'
            });
        }

        if (type !== 'buy' && type !== 'sell') {
            return res.status(400).json({
                success: false,
                error: 'Неверный тип заявки'
            });
        }

        const numAmount = parseFloat(amount);
        const numRate = parseFloat(rate);
        
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Неверная сумма'
            });
        }

        if (isNaN(numRate) || numRate <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Неверный курс'
            });
        }

        // Проверка лимитов
        if (type === 'buy') {
            if (numAmount < MIN_RUB) {
                return res.status(400).json({
                    success: false,
                    error: `Минимальная сумма для покупки: ${MIN_RUB.toLocaleString()} RUB`
                });
            }
            if (numAmount > MAX_RUB) {
                return res.status(400).json({
                    success: false,
                    error: `Максимальная сумма для покупки: ${MAX_RUB.toLocaleString()} RUB`
                });
            }
        } else {
            const rubAmount = numAmount * numRate;
            if (numAmount < MIN_USDT) {
                return res.status(400).json({
                    success: false,
                    error: `Минимальная сумма для продажи: ${MIN_USDT} USDT (≈${MIN_RUB.toLocaleString()} RUB)`
                });
            }
            if (numAmount > MAX_USDT) {
                return res.status(400).json({
                    success: false,
                    error: `Максимальная сумма для продажи: ${MAX_USDT} USDT (≈${MAX_RUB.toLocaleString()} RUB)`
                });
            }
        }

        const users = readData(USERS_FILE) || [];
        const user = users.find(u => u.id === userId || u.username === userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Пользователь не найден'
            });
        }

        const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
        
        const newOrder = {
            id: orderId,
            type: type,
            amount: numAmount,
            rate: numRate,
            userId: user.id,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            },
            status: 'pending',
            createdAt: new Date().toISOString(),
            paymentMethod: paymentMethod || null,
            cryptoAddress: cryptoAddress || null,
            expiresAt: new Date(Date.now() + ORDER_TIMEOUT_MINUTES * 60 * 1000).toISOString(),
            messages: [
                {
                    id: 1,
                    text: type === 'buy' 
                        ? `Хочу купить ${numAmount} USDT за RUB` 
                        : `Хочу продать ${numAmount} USDT за RUB`,
                    type: 'user',
                    timestamp: new Date().toISOString()
                },
                {
                    id: 2,
                    text: `⏰ Время на выполнение: ${ORDER_TIMEOUT_MINUTES} минут. Заявка будет автоматически отменена по истечении времени.`,
                    type: 'system',
                    timestamp: new Date().toISOString()
                }
            ]
        };

        console.log('✅ Создана заявка:', {
            id: newOrder.id,
            type: newOrder.type,
            amount: newOrder.amount,
            user: newOrder.user.username
        });

        let orders = readData(ORDERS_FILE) || [];
        orders.push(newOrder);
        
        const writeSuccess = writeData(ORDERS_FILE, orders);
        if (!writeSuccess) {
            return res.status(500).json({
                success: false,
                error: 'Ошибка сохранения заявки'
            });
        }

        console.log('✅ Заявка сохранена в базу');

        // ==================== ОБНОВЛЕННАЯ ОТПРАВКА УВЕДОМЛЕНИЯ С РЕКВИЗИТАМИ ====================
        try {
            const typeText = type === 'buy' ? '🟢 ПОКУПКА' : '🔴 ПРОДАЖА';
            
            // Формируем сообщение с реквизитами
            let requisitesText = '';
            
            if (type === 'buy') {
                // Покупка - показываем крипто-адрес
                if (cryptoAddress) {
                    requisitesText = `💳 <b>КРИПТО-АДРЕС ДЛЯ ПОЛУЧЕНИЯ:</b>\n` +
                                   `📝 Название: ${cryptoAddress.name}\n` +
                                   `🔗 Адрес: <code>${cryptoAddress.address}</code>\n` +
                                   `⛓️ Сеть: ${cryptoAddress.network}`;
                } else {
                    requisitesText = `⚠️ <b>КРИПТО-АДРЕС НЕ УКАЗАН</b>`;
                }
            } else {
                // Продажа - показываем банковские реквизиты
                if (paymentMethod) {
                    if (paymentMethod.type === 'sbp') {
                        requisitesText = `💳 <b>РЕКВИЗИТЫ СБП ДЛЯ ОПЛАТЫ:</b>\n` +
                                       `🏦 Банк: ${paymentMethod.name}\n` +
                                       `📱 Телефон: <code>${paymentMethod.fullNumber || paymentMethod.number}</code>`;
                    } else {
                        requisitesText = `💳 <b>БАНКОВСКИЕ РЕКВИЗИТЫ ДЛЯ ОПЛАТЫ:</b>\n` +
                                       `🏦 Банк: ${paymentMethod.name}\n` +
                                       `💳 Карта: <code>${paymentMethod.fullNumber || '•••• ' + paymentMethod.number}</code>`;
                    }
                } else {
                    requisitesText = `⚠️ <b>БАНКОВСКИЕ РЕКВИЗИТЫ НЕ УКАЗАНЫ</b>`;
                }
            }

            const message = `🔥 <b>НОВАЯ ЗАЯВКА #{orderId}</b>\n\n` +
                          `${typeText} USDT\n` +
                          `💰 Сумма: ${numAmount} ${type === 'buy' ? 'RUB' : 'USDT'}\n` +
                          `💱 Курс: ${rate} RUB\n` +
                          `🎯 Получает: ${type === 'buy' ? (numAmount / rate).toFixed(2) + ' USDT' : (numAmount * rate).toFixed(2) + ' RUB'}\n` +
                          `👤 Клиент: ${user.username}\n` +
                          `📧 Email: ${user.email || 'Не указан'}\n` +
                          `🆔 ID: #${orderId}\n\n` +
                          `${requisitesText}\n\n` +
                          `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
            
            await sendTelegramNotification(message);
            console.log('✅ Реквизиты отправлены администратору');
        } catch (telegramError) {
            console.error('❌ Ошибка отправки уведомления с реквизитами:', telegramError);
        }

        res.json({
            success: true,
            order: newOrder,
            message: 'Заявка создана успешно'
        });

    } catch (error) {
        console.error('❌ Ошибка создания заявки:', error);
        res.status(500).json({
            success: false,
            error: 'Внутренняя ошибка сервера: ' + error.message
        });
    }
});

app.get('/api/chat/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        const orders = readData(ORDERS_FILE) || [];
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
        }

        res.json({
            success: true,
            orderId: orderId,
            messages: order.messages || [],
            exchangeData: {
                type: order.type,
                amount: order.amount,
                rate: order.rate
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки чата'
        });
    }
});

app.post('/api/chat/send', async (req, res) => {
    try {
        const { orderId, message, type = 'user' } = req.body;
        
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Chat not found'
            });
        }

        if (!orders[orderIndex].messages) {
            orders[orderIndex].messages = [];
        }

        const newMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: message,
            type: type,
            timestamp: new Date().toISOString()
        };

        orders[orderIndex].messages.push(newMessage);
        writeData(ORDERS_FILE, orders);

        // ОТПРАВКА УВЕДОМЛЕНИЯ В ТЕЛЕГРАМ ПРИ СООБЩЕНИИ ОТ КЛИЕНТА
        if (type === 'user') {
            try {
                const order = orders[orderIndex];
                const notification = `💬 <b>НОВОЕ СООБЩЕНИЕ ОТ КЛИЕНТА</b>\n\n` +
                                   `📋 Заявка: #${orderId}\n` +
                                   `👤 От: ${order.user?.username || 'Клиент'}\n` +
                                   `💬 Сообщение: ${message}\n\n` +
                                   `⏰ ${new Date().toLocaleTimeString('ru-RU')}`;
                
                await sendTelegramNotification(notification);
            } catch (telegramError) {
                console.error('❌ Ошибка отправки уведомления о сообщении:', telegramError);
            }
        }

        res.json({
            success: true,
            message: newMessage
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка отправки сообщения'
        });
    }
});

app.get('/api/user/orders', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Токен не предоставлен' 
            });
        }

        let username;
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf8');
            username = decoded.split(':')[0];
        } catch (decodeError) {
            return res.status(401).json({ 
                success: false, 
                error: 'Неверный формат токена' 
            });
        }

        const users = readData(USERS_FILE) || [];
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Пользователь не найден' 
            });
        }

        const orders = readData(ORDERS_FILE) || [];
        const userOrders = orders.filter(order => {
            return order.userId === user.id;
        });

        const sortedOrders = userOrders.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.json({
            success: true,
            orders: sortedOrders
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки истории'
        });
    }
});

app.get('/api/settings', (req, res) => {
    try {
        const settings = getCurrentSettings();
        res.json({
            success: true,
            settings: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка загрузки настроек'
        });
    }
});

app.post('/api/settings/update', (req, res) => {
    try {
        const { baseRate, spread, tiers, updatedBy } = req.body;
        
        const newSettings = {};
        if (baseRate !== undefined) newSettings.baseRate = parseFloat(baseRate);
        if (spread !== undefined) newSettings.spread = parseFloat(spread);
        if (tiers !== undefined) newSettings.tiers = tiers;
        if (updatedBy) newSettings.updatedBy = updatedBy;

        const success = updateSettings(newSettings);

        if (success) {
            const updatedSettings = getCurrentSettings();
            res.json({
                success: true,
                message: 'Настройки обновлены',
                settings: updatedSettings
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ошибка сохранения настроек'
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка обновления настроек'
        });
    }
});

// ==================== АДМИН ENDPOINTS ====================

app.get('/api/admin/chats', (req, res) => {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const activeChats = orders.map(order => ({
            orderId: order.id,
            exchangeData: {
                type: order.type,
                amount: order.amount,
                currency: order.type === 'buy' ? 'RUB' : 'USDT'
            },
            messageCount: order.messages ? order.messages.length : 0,
            status: order.status,
            lastActivity: order.messages && order.messages.length > 0 
                ? order.messages[order.messages.length - 1].timestamp 
                : order.createdAt
        }));

        res.json({
            success: true,
            chats: activeChats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/admin/order/:orderId', (req, res) => {
    try {
        const { orderId } = req.params;
        const orders = readData(ORDERS_FILE) || [];
        const order = orders.find(o => o.id === orderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== УПРАВЛЕНИЕ СИСТЕМОЙ ====================

app.get('/api/admin/system-status', (req, res) => {
    try {
        const settings = getCurrentSettings();
        const quietHoursActive = isQuietHours(settings);
        
        res.json({
            success: true,
            status: {
                exchangeEnabled: settings.exchangeEnabled !== undefined ? settings.exchangeEnabled : true,
                quietHours: settings.quietHours || { enabled: false, startTime: "23:00", endTime: "08:00" },
                quietHoursActive: quietHoursActive,
                baseRate: settings.baseRate,
                spread: settings.spread,
                lastUpdated: settings.lastUpdated
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/toggle-exchange', (req, res) => {
    try {
        const { enabled } = req.body;
        
        const success = updateSettings({
            exchangeEnabled: enabled,
            updatedBy: 'admin'
        });

        if (success) {
            res.json({
                success: true,
                message: enabled ? '✅ Обмен включен' : '⏸️ Обмен приостановлен',
                exchangeEnabled: enabled
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ошибка обновления настроек'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/toggle-quiet-hours', (req, res) => {
    try {
        const { enabled, startTime, endTime } = req.body;
        const settings = getCurrentSettings();
        
        const quietHours = {
            enabled: enabled,
            startTime: startTime || (settings.quietHours ? settings.quietHours.startTime : '23:00'),
            endTime: endTime || (settings.quietHours ? settings.quietHours.endTime : '08:00')
        };
        
        const success = updateSettings({
            quietHours: quietHours,
            updatedBy: 'admin'
        });

        if (success) {
            res.json({
                success: true,
                message: enabled ? 
                    `✅ Тихий час включен (${quietHours.startTime} - ${quietHours.endTime})` : 
                    '✅ Тихий час выключен',
                quietHours: quietHours
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ошибка обновления настроек'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/send-message', async (req, res) => {
    try {
        const { orderId, message, type = 'support' } = req.body;
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        if (!orders[orderIndex].messages) {
            orders[orderIndex].messages = [];
        }

        const newMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: message,
            type: type,
            timestamp: new Date().toISOString()
        };

        orders[orderIndex].messages.push(newMessage);
        writeData(ORDERS_FILE, orders);

        res.json({
            success: true,
            message: newMessage
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/mark-paid', async (req, res) => {
    try {
        const { orderId } = req.body;
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        orders[orderIndex].status = 'paid';
        orders[orderIndex].paidAt = new Date().toISOString();
        
        const systemMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: '✅ Оператор подтвердил оплату. Средства будут зачислены в ближайшее время.',
            type: 'system',
            timestamp: new Date().toISOString()
        };
        orders[orderIndex].messages.push(systemMessage);
        
        writeData(ORDERS_FILE, orders);

        // Уведомление в телеграм
        try {
            const order = orders[orderIndex];
            const message = `💰 <b>ОПЛАТА ПОДТВЕРЖДЕНА</b>\n\n` +
                          `📋 Заявка: #${orderId}\n` +
                          `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                          `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                          `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('❌ Ошибка отправки уведомления:', telegramError);
        }

        res.json({
            success: true,
            order: orders[orderIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/complete-order', async (req, res) => {
    try {
        const { orderId, comment } = req.body;
        
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        orders[orderIndex].status = 'completed';
        orders[orderIndex].completedAt = new Date().toISOString();
        orders[orderIndex].comment = comment;
        
        if (!orders[orderIndex].messages) {
            orders[orderIndex].messages = [];
        }
        
        const systemMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: '🎉 Сделка завершена! Средства зачислены.',
            type: 'system',
            timestamp: new Date().toISOString()
        };
        
        orders[orderIndex].messages.push(systemMessage);

        writeData(ORDERS_FILE, orders);

        // Уведомление в телеграм
        try {
            const order = orders[orderIndex];
            const message = `✅ <b>ЗАЯВКА ЗАВЕРШЕНА</b>\n\n` +
                          `📋 Заявка: #${orderId}\n` +
                          `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                          `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                          `💬 Комментарий: ${comment || 'Без комментария'}\n` +
                          `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('❌ Ошибка отправки уведомления:', telegramError);
        }

        res.json({
            success: true,
            order: orders[orderIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/admin/cancel-order', async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        orders[orderIndex].status = 'cancelled';
        orders[orderIndex].cancelledAt = new Date().toISOString();
        orders[orderIndex].cancelReason = reason;
        
        const systemMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: `❌ Оператор отменил заявку. Причина: ${reason}`,
            type: 'system',
            timestamp: new Date().toISOString()
        };
        orders[orderIndex].messages.push(systemMessage);
        
        writeData(ORDERS_FILE, orders);

        // Уведомление в телеграм
        try {
            const order = orders[orderIndex];
            const message = `❌ <b>ЗАЯВКА ОТМЕНЕНА</b>\n\n` +
                          `📋 Заявка: #${orderId}\n` +
                          `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                          `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                          `📝 Причина: ${reason}\n` +
                          `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
            
            await sendTelegramNotification(message);
        } catch (telegramError) {
            console.error('❌ Ошибка отправки уведомления:', telegramError);
        }

        res.json({
            success: true,
            order: orders[orderIndex]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/admin/stats', (req, res) => {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        res.json({
            success: true,
            stats: {
                total: totalOrders,
                pending: pendingOrders,
                completed: completedOrders,
                cancelled: cancelledOrders,
                completionRate: totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/debug/orders', (req, res) => {
    try {
        const orders = readData(ORDERS_FILE) || [];
        res.json({
            success: true,
            total: orders.length,
            orders: orders.map(o => ({
                id: o.id,
                type: o.type,
                amount: o.amount,
                status: o.status,
                userId: o.userId,
                user: o.user,
                createdAt: o.createdAt,
                messages: o.messages ? o.messages.length : 0
            }))
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/debug/users', (req, res) => {
    try {
        const users = readData(USERS_FILE) || [];
        res.json({
            success: true,
            users: users.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                registrationDate: u.registrationDate
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/create-test-data', (req, res) => {
    try {
        const users = readData(USERS_FILE) || [];
        const orders = readData(ORDERS_FILE) || [];

        if (!users.find(u => u.username === 'test')) {
            const testUser = {
                id: 'USER_TEST',
                username: 'test',
                password: 'test',
                email: 'test@tetherbot.com',
                registrationDate: new Date().toISOString(),
                stats: {
                    totalTrades: 5,
                    totalVolume: 25000,
                    successRate: 80
                },
                isVerified: true
            };
            users.push(testUser);
            writeData(USERS_FILE, users);
        }

        if (orders.length === 0) {
            const testOrders = [
                {
                    id: 'TEST001',
                    type: 'buy',
                    amount: 5000,
                    rate: 92.5,
                    status: 'completed',
                    userId: 'USER_TEST',
                    user: {
                        id: 'USER_TEST',
                        username: 'test',
                        email: 'test@tetherbot.com'
                    },
                    createdAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    cryptoAddress: {
                        network: 'TRC20',
                        address: 'TEst12345678901234567890'
                    },
                    messages: [
                        {
                            id: 1,
                            text: 'Хочу купить 5000 USDT за RUB',
                            type: 'user',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                {
                    id: 'TEST002',
                    type: 'sell',
                    amount: 100,
                    rate: 87.5,
                    status: 'pending',
                    userId: 'USER_TEST',
                    user: {
                        id: 'USER_TEST',
                        username: 'test',
                        email: 'test@tetherbot.com'
                    },
                    createdAt: new Date(Date.now() - 3600000).toISOString(),
                    paymentMethod: {
                        name: 'Сбербанк',
                        number: '1234'
                    },
                    messages: [
                        {
                            id: 1,
                            text: 'Хочу продать 100 USDT за RUB',
                            type: 'user',
                            timestamp: new Date().toISOString()
                        }
                    ]
                }
            ];
            
            testOrders.forEach(order => orders.push(order));
            writeData(ORDERS_FILE, orders);
        }

        res.json({
            success: true,
            message: 'Тестовые данные созданы',
            testUser: {
                username: 'test',
                password: 'test'
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Ошибка создания тестовых данных'
        });
    }
});

// Обработка 404 для API
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>TetherBot Server</title>
            <style>
                body { font-family: Arial; margin: 40px; background: #f5f5f5; }
                .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
                .status.active { background: #d4edda; color: #155724; }
                .btn { display: inline-block; padding: 10px 20px; background: #007cff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 TetherBot Server</h1>
                <p>Сервер работает на порту ${PORT}</p>
                
                <div class="status active">
                    <strong>Status:</strong> ✅ Активен
                </div>
                
                <p><a href="/api/health" class="btn">🔍 Проверить здоровье</a></p>
                <p><a href="/api/debug/orders" class="btn">📋 Просмотреть заявки</a></p>
                <p><a href="/api/debug/users" class="btn">👥 Просмотреть пользователей</a></p>
                <p><a href="/api/settings" class="btn">⚙️ Настройки курсов</a></p>
                
                <button onclick="createTestData()" class="btn">🧪 Создать тестовые данные</button>
                
                <h3>🚀 Доступные endpoint'ы:</h3>
                <ul>
                    <li><code>POST /api/register</code> - Регистрация</li>
                    <li><code>POST /api/login</code> - Авторизация</li>
                    <li><code>POST /api/create-order</code> - Создание заявки</li>
                    <li><code>GET /api/user/orders</code> - История заявок</li>
                    <li><code>GET /api/exchange-rate</code> - Курсы обмена</li>
                    <li><code>GET /api/chat/:orderId</code> - Чат заявки</li>
                </ul>
            </div>
            
            <script>
                async function createTestData() {
                    const response = await fetch('/api/create-test-data', { method: 'POST' });
                    const data = await response.json();
                    alert(data.message);
                    if (data.success) {
                        window.location.reload();
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// ==================== ЗАПУСК СЕРВЕРА ====================

app.listen(PORT, () => {
    initializeDataFiles();
    console.log('=== ЗАПУСК TETHERBOT SERVER ===');
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 API доступно по http://localhost:${PORT}`);
    console.log(`🤖 Бот готов получать уведомления`);
    console.log(`💳 Система отправки реквизитов администратору: ✅ АКТИВНА`);
});