// server.js
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT 

// ==================== НАСТРОЙКИ TELEGRAM ====================
const TELEGRAM_BOT_TOKEN = '7950211944:AAGwDmV_XcS8K2nADlX2HoAkf9fTemcN-pI';
const ADMIN_CHAT_ID = '7879866656';

// ==================== MIDDLEWARE ====================
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

app.use(express.json());

// ==================== КОНСТАНТЫ ====================
const USERS_FILE = './users.json';
const ORDERS_FILE = './orders.json';
const SETTINGS_FILE = './settings.json';
const ORDER_TIMEOUT_MINUTES = 30;
const MIN_RUB = 1000;
const MAX_RUB = 1000000;
const MIN_USDT = 10;
const MAX_USDT = 10000;

// ==================== НАСТРОЙКИ ПО УМОЛЧАНИЮ ====================
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

// ==================== ИНИЦИАЛИЗАЦИЯ TELEGRAM БОТА ====================
console.log('🤖 Инициализация Telegram бота...');

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 3000,
        timeout: 10,
        params: {
            timeout: 10
        }
    }
});

// Хранилище состояний для чата
const userStates = new Map();

// Обработка ошибок бота
bot.on('polling_error', (error) => {
    console.log(`⚠️ Ошибка polling бота: ${error.code} - ${error.message}`);
});

bot.on('webhook_error', (error) => {
    console.log(`⚠️ Ошибка webhook бота: ${error.message}`);
});

// ==================== ФУНКЦИИ TELEGRAM БОТА ====================

async function safeBotSend(chatId, text, options = {}) {
    try {
        return await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.log('❌ Ошибка отправки в бота:', error.message);
        return null;
    }
}

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

// ==================== ГЛАВНОЕ МЕНЮ БОТА ====================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID) {
        return safeBotSend(chatId, '❌ У вас нет прав доступа');
    }
    
    await showMainMenu(chatId);
});

async function showMainMenu(chatId) {
    const message = `🤖 <b>ADMIN PANEL - TETHERBOT</b>\n\n` +
                   `Добро пожаловать в панель управления!\n\n` +
                   `⚡ <b>Выберите раздел:</b>`;

    const keyboard = {
        inline_keyboard: [
            [
                { text: '🔥 Активные заявки', callback_data: 'active_orders' },
                { text: '📊 Статистика', callback_data: 'stats' }
            ],
            [
                { text: '👥 Пользователи', callback_data: 'users' },
                { text: '🎛️ Управление системой', callback_data: 'system_control' }
            ],
            [
                { text: '⚙️ Настройки курсов', callback_data: 'settings' }
            ]
        ]
    };

    await safeBotSend(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

// ==================== ОБРАБОТКА CALLBACK БОТА ====================

bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    if (chatId.toString() !== ADMIN_CHAT_ID) {
        return bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Нет доступа' });
    }

    try {
        await bot.answerCallbackQuery(callbackQuery.id);

        if (data === 'main_menu') {
            await showMainMenu(chatId);
        }
        else if (data === 'active_orders') {
            await showActiveOrders(chatId);
        }
        else if (data === 'stats') {
            await showStats(chatId);
        }
        else if (data === 'users') {
            await showUsers(chatId);
        }
        else if (data === 'settings') {
            await showSettingsBot(chatId);
        }
        else if (data === 'system_control') {
            await showSystemControl(chatId);
        }
        else if (data === 'toggle_exchange') {
            await toggleExchange(chatId);
        }
        else if (data === 'toggle_quiet_hours') {
            await toggleQuietHours(chatId);
        }
        else if (data === 'set_quiet_hours') {
            await setQuietHours(chatId);
        }
        else if (data === 'edit_base_rate') {
            await editBaseRate(chatId);
        }
        else if (data === 'edit_spread') {
            await editSpread(chatId);
        }
        else if (data.startsWith('order_')) {
            const orderId = data.replace('order_', '');
            await showOrderDetails(chatId, orderId);
        }
        else if (data.startsWith('chat_')) {
            const orderId = data.replace('chat_', '');
            await startChatWithClient(chatId, orderId);
        }
        else if (data.startsWith('complete_')) {
            const orderId = data.replace('complete_', '');
            await completeOrder(chatId, orderId);
        }
        else if (data.startsWith('cancel_')) {
            const orderId = data.replace('cancel_', '');
            await askCancelReason(chatId, orderId);
        }
        else if (data.startsWith('paid_')) {
            const orderId = data.replace('paid_', '');
            await markOrderPaid(chatId, orderId);
        }

    } catch (error) {
        console.error('❌ Ошибка callback:', error.message);
        await safeBotSend(chatId, '❌ Ошибка обработки запроса');
    }
});

// ==================== ФУНКЦИИ УПРАВЛЕНИЯ СИСТЕМОЙ (БОТ) ====================

async function showSystemControl(chatId) {
    try {
        const settings = getCurrentSettings();
        const quietHoursActive = isQuietHours(settings);
        
        const exchangeStatus = settings.exchangeEnabled ? '🟢 ВКЛЮЧЕН' : '🔴 ВЫКЛЮЧЕН';
        const quietHoursStatus = settings.quietHours.enabled ? '🟢 ВКЛЮЧЕН' : '🔴 ВЫКЛЮЧEN';
        const quietHoursActiveStatus = quietHoursActive ? '🔴 АКТИВЕН' : '🟢 НЕАКТИВЕН';
        
        const message = `🎛️ <b>УПРАВЛЕНИЕ СИСТЕМОЙ</b>\n\n` +
                       `💱 <b>Обмен:</b> ${exchangeStatus}\n` +
                       `⏰ <b>Тихий час:</b> ${quietHoursStatus}\n` +
                       `📊 <b>Статус тихого часа:</b> ${quietHoursActiveStatus}\n` +
                       (settings.quietHours.enabled ? 
                       `🕒 <b>Время тихого часа:</b> ${settings.quietHours.startTime} - ${settings.quietHours.endTime}\n` : '') +
                       `💰 <b>Базовый курс:</b> ${settings.baseRate} RUB\n` +
                       `📈 <b>Спред:</b> ${settings.spread} RUB\n\n` +
                       `⚡ <b>Выберите действие:</b>`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: settings.exchangeEnabled ? '⏸️ Приостановить обмен' : '▶️ Возобновить обмен', 
                      callback_data: 'toggle_exchange' }
                ],
                [
                    { text: settings.quietHours.enabled ? '🚫 Выключить тихий час' : '⏰ Включить тихий час', 
                      callback_data: 'toggle_quiet_hours' }
                ],
                [
                    { text: '🕒 Настроить время', callback_data: 'set_quiet_hours' }
                ],
                [
                    { text: '⚙️ Настройки курсов', callback_data: 'settings' },
                    { text: '🔄 Обновить', callback_data: 'system_control' }
                ],
                [
                    { text: '🏠 Главная', callback_data: 'main_menu' }
                ]
            ]
        };

        await safeBotSend(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки статуса:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки статуса системы');
    }
}

async function toggleExchange(chatId) {
    try {
        const settings = getCurrentSettings();
        const newEnabled = !settings.exchangeEnabled;
        
        const success = updateSettings({
            exchangeEnabled: newEnabled,
            updatedBy: 'admin'
        });

        if (success) {
            const message = newEnabled ? '✅ Обмен включен' : '⏸️ Обмен приостановлен';
            await safeBotSend(chatId, message);
            
            // Отправляем уведомление в телеграм
            const notification = newEnabled ? 
                `✅ <b>ОБМЕН ВКЛЮЧЕН</b>\n\nСистема готова к приему заявок` :
                `⏸️ <b>ОБМЕН ПРИОСТАНОВЛЕН</b>\n\nСоздание новых заявок временно недоступно`;
            
            await sendTelegramNotification(notification);
            
        } else {
            await safeBotSend(chatId, '❌ Ошибка обновления настроек');
        }
        
        await showSystemControl(chatId);
        
    } catch (error) {
        console.error('❌ Ошибка переключения обмена:', error.message);
        await safeBotSend(chatId, '❌ Ошибка переключения обмена');
    }
}

async function toggleQuietHours(chatId) {
    try {
        const settings = getCurrentSettings();
        const newEnabled = !settings.quietHours.enabled;
        
        const quietHours = {
            enabled: newEnabled,
            startTime: settings.quietHours.startTime,
            endTime: settings.quietHours.endTime
        };
        
        const success = updateSettings({
            quietHours: quietHours,
            updatedBy: 'admin'
        });

        if (success) {
            const message = newEnabled ? 
                `✅ Тихий час включен (${quietHours.startTime} - ${quietHours.endTime})` : 
                '✅ Тихий час выключен';
            await safeBotSend(chatId, message);
            
            // Отправляем уведомление в телеграм
            if (newEnabled) {
                const notification = `🌙 <b>ТИХИЙ ЧАС АКТИВИРОВАН</b>\n\n` +
                                   `🕒 Время: ${quietHours.startTime} - ${quietHours.endTime}\n` +
                                   `📋 Создание заявок приостановлено`;
                await sendTelegramNotification(notification);
            } else {
                await sendTelegramNotification('☀️ <b>ТИХИЙ ЧАС ОТКЛЮЧЕН</b>\n\nСистема возобновила работу');
            }
            
        } else {
            await safeBotSend(chatId, '❌ Ошибка обновления настроек');
        }
        
        await showSystemControl(chatId);
        
    } catch (error) {
        console.error('❌ Ошибка переключения тихого часа:', error.message);
        await safeBotSend(chatId, '❌ Ошибка переключения тихого часа');
    }
}

async function setQuietHours(chatId) {
    userStates.set(chatId, {
        waitingForQuietHours: true
    });
    
    await safeBotSend(chatId,
        `🕒 <b>НАСТРОЙКА ТИХОГО ЧАСА</b>\n\n` +
        `✏️ <b>Введите время в формате:</b>\n\n` +
        `<code>ЧЧ:ММ ЧЧ:ММ</code>\n\n` +
        `<b>Пример:</b>\n` +
        `<code>23:00 08:00</code>\n\n` +
        `<i>Первое время - начало, второе - конец тихого часа</i>\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        {
            parse_mode: 'HTML'
        }
    );
}

// ==================== ФУНКЦИИ НАСТРОЕК КУРСОВ (БОТ) ====================

async function showSettingsBot(chatId) {
    try {
        const settings = getCurrentSettings();
        
        const message = `⚙️ <b>НАСТРОЙКИ КУРСОВ</b>\n\n` +
                       `💰 <b>Базовый курс:</b> ${settings.baseRate} RUB\n` +
                       `📊 <b>Спред:</b> ${settings.spread} RUB\n` +
                       `⏰ <b>Обновлено:</b> ${formatTime(settings.lastUpdated)}\n` +
                       `👤 <b>Кем:</b> ${settings.updatedBy || 'system'}\n\n` +
                       `<b>Текущие тарифы:</b>\n` +
                       settings.tiers.map((tier, index) => 
                           `${index + 1}. ${tier.range}: множитель ${tier.multiplier}`
                       ).join('\n') +
                       `\n\n⚡ <b>Выберите действие:</b>`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✏️ Изменить базовый курс', callback_data: 'edit_base_rate' },
                    { text: '📊 Изменить спред', callback_data: 'edit_spread' }
                ],
                [
                    { text: '🎛️ Управление системой', callback_data: 'system_control' }
                ],
                [
                    { text: '🔄 Обновить', callback_data: 'settings' },
                    { text: '🏠 Главная', callback_data: 'main_menu' }
                ]
            ]
        };

        await safeBotSend(chatId, message, { 
            parse_mode: 'HTML',
            reply_markup: keyboard 
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки настроек');
    }
}

async function editBaseRate(chatId) {
    userStates.set(chatId, { 
        waitingForBaseRate: true 
    });
    
    const settings = getCurrentSettings();
    
    await safeBotSend(chatId, 
        `💰 <b>Текущий базовый курс:</b> ${settings.baseRate} RUB\n\n` +
        `✏️ <b>Введите новый базовый курс в RUB:</b>\n\n` +
        `<i>Пример: 85.5 или 90.0</i>\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

async function editSpread(chatId) {
    userStates.set(chatId, { 
        waitingForSpread: true 
    });
    
    const settings = getCurrentSettings();
    
    await safeBotSend(chatId, 
        `📊 <b>Текущий спред:</b> ${settings.spread} RUB\n\n` +
        `✏️ <b>Введите новый спред в RUB:</b>\n\n` +
        `<i>Спред - это разница между курсом покупки и продажи</i>\n` +
        `<i>Пример: 3.5 или 5.0</i>\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

// ==================== ФУНКЦИИ АКТИВНЫХ ОРДЕРОВ (БОТ) ====================

async function showActiveOrders(chatId) {
    try {
        console.log('🔄 Загрузка активных ордеров...');
        
        const orders = readData(ORDERS_FILE) || [];
        const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid');
        
        console.log(`✅ Найдено активных ордеров: ${activeOrders.length}`);

        if (activeOrders.length === 0) {
            return await safeBotSend(chatId, 
                '✅ <b>Активных заявок нет</b>\n\nВсе операции завершены или обрабатываются',
                { parse_mode: 'HTML' }
            );
        }

        let message = `🔥 <b>АКТИВНЫЕ ЗАЯВКИ (${activeOrders.length})</b>\n\n`;
        
        activeOrders.forEach((order, index) => {
            const typeIcon = order.type === 'buy' ? '🟢' : '🔴';
            const statusIcon = order.status === 'pending' ? '⏳' : '💰';
            const messageCount = order.messages ? order.messages.length : 0;
            
            message += `<b>${index + 1}. ${typeIcon} #${order.id}</b>\n`;
            message += `   ${order.type === 'buy' ? 'Покупка' : 'Продажа'} ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n`;
            message += `   👤 ${order.user?.username || 'Клиент'}\n`;
            message += `   💬 Сообщений: ${messageCount}\n`;
            message += `   ${statusIcon} ${order.status === 'pending' ? 'Ожидает оплаты' : 'Оплачено'}\n\n`;
        });

        const keyboard = {
            inline_keyboard: [
                ...activeOrders.slice(0, 5).map(order => [
                    { 
                        text: `#${order.id} ${order.type === 'buy' ? '🟢' : '🔴'}`, 
                        callback_data: `order_${order.id}` 
                    }
                ]),
                [
                    { text: '🔄 Обновить', callback_data: 'active_orders' },
                    { text: '🏠 Главная', callback_data: 'main_menu' }
                ]
            ]
        };

        await safeBotSend(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки ордеров:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки заявок. Проверьте сервер.');
    }
}

// ==================== ФУНКЦИИ ДЕТАЛЕЙ ОРДЕРА (БОТ) ====================

async function showOrderDetails(chatId, orderId) {
    try {
        console.log(`🔄 Загрузка деталей ордера ${orderId}...`);
        
        const orders = readData(ORDERS_FILE) || [];
        const order = orders.find(o => o.id === orderId);
        
        if (!order) {
            return await safeBotSend(chatId, '❌ Заявка не найдена');
        }

        const typeIcon = order.type === 'buy' ? '🟢' : '🔴';
        const typeText = order.type === 'buy' ? 'ПОКУПКА USDT' : 'ПРОДАЖА USDT';

        let message = `${typeIcon} <b>ЗАЯВКА #${order.id}</b>\n\n` +
                     `👤 <b>Клиент:</b> ${order.user?.username || 'Неизвестно'}\n` +
                     `📧 <b>Email:</b> ${order.user?.email || 'Не указан'}\n` +
                     `💼 <b>Тип:</b> ${typeText}\n` +
                     `💰 <b>Сумма:</b> ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                     `💱 <b>Курс:</b> ${order.rate} RUB\n` +
                     `🎯 <b>Получает:</b> ${calculateTotal(order)}\n` +
                     `⏰ <b>Создана:</b> ${formatTime(order.createdAt)}\n` +
                     `📊 <b>Статус:</b> ${getStatusText(order.status)}\n`;

        // Показываем историю чата
        if (order.messages && order.messages.length > 0) {
            message += `\n💬 <b>История чата:</b>\n`;
            const lastMessages = order.messages.slice(-3);
            
            lastMessages.forEach(msg => {
                const sender = msg.type === 'user' ? '👤 Клиент' : 
                              msg.type === 'support' ? '🛠️ Поддержка' : '⚡ Система';
                const time = formatTime(msg.timestamp);
                const text = msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;
                message += `\n${sender} (${time}):\n${text}\n`;
            });
        } else {
            message += `\n💬 <b>Чат:</b> Нет сообщений`;
        }

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '💬 Ответить клиенту', callback_data: `chat_${orderId}` },
                    { text: '🔄 Обновить', callback_data: `order_${orderId}` }
                ]
            ]
        };

        // Добавляем кнопки действий в зависимости от статуса
        if (order.status === 'pending') {
            keyboard.inline_keyboard.unshift([
                { text: '✅ Подтвердить оплату', callback_data: `paid_${orderId}` },
                { text: '❌ Отменить', callback_data: `cancel_${orderId}` }
            ]);
        } else if (order.status === 'paid') {
            keyboard.inline_keyboard.unshift([
                { text: '🚀 Завершить', callback_data: `complete_${orderId}` },
                { text: '❌ Отменить', callback_data: `cancel_${orderId}` }
            ]);
        }

        keyboard.inline_keyboard.push([
            { text: '📋 К списку', callback_data: 'active_orders' }
        ]);

        await safeBotSend(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки деталей:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки деталей.');
    }
}

// ==================== ФУНКЦИИ ЧАТА С КЛИЕНТОМ (БОТ) ====================

async function startChatWithClient(chatId, orderId) {
    userStates.set(chatId, { 
        waitingForChat: true, 
        orderId: orderId 
    });
    
    await safeBotSend(chatId, 
        `💬 <b>Введите сообщение для заявки #${orderId}:</b>\n\n` +
        `Сообщение будет отправлено клиенту в чат поддержки.\n\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

async function sendMessageToClient(chatId, orderId, messageText) {
    try {
        console.log(`📨 Отправка сообщения для ордера ${orderId}: ${messageText}`);
        
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            await safeBotSend(chatId, '❌ Заявка не найдена');
            return;
        }

        if (!orders[orderIndex].messages) {
            orders[orderIndex].messages = [];
        }

        const newMessage = {
            id: orders[orderIndex].messages.length + 1,
            text: messageText,
            type: 'support',
            timestamp: new Date().toISOString()
        };

        orders[orderIndex].messages.push(newMessage);
        writeData(ORDERS_FILE, orders);

        console.log(`✅ Сообщение отправлено в ордер ${orderId}`);
        
        await safeBotSend(chatId, 
            `✅ <b>Сообщение отправлено!</b>\n\n` +
            `📨 <b>Заявка:</b> #${orderId}\n` +
            `💬 <b>Ваше сообщение:</b>\n${messageText}`,
            { parse_mode: 'HTML' }
        );
        
        // Показываем обновленные детали ордера
        setTimeout(() => {
            showOrderDetails(chatId, orderId);
        }, 1000);
        
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения:', error.message);
        await safeBotSend(chatId, '❌ Ошибка отправки сообщения.');
    }
}

// ==================== ФУНКЦИИ ДЕЙСТВИЙ С ОРДЕРАМИ (БОТ) ====================

async function markOrderPaid(chatId, orderId) {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            await safeBotSend(chatId, '❌ Заявка не найдена');
            return;
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

        await safeBotSend(chatId, `✅ Заявка #${orderId} отмечена как оплаченная`);
        
        // Уведомление в телеграм
        const order = orders[orderIndex];
        const message = `💰 <b>ОПЛАТА ПОДТВЕРЖДЕНА</b>\n\n` +
                      `📋 Заявка: #${orderId}\n` +
                      `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                      `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                      `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
        
        await sendTelegramNotification(message);
        
        await showOrderDetails(chatId, orderId);
    } catch (error) {
        console.error('❌ Ошибка mark-paid:', error.message);
        await safeBotSend(chatId, '❌ Ошибка обновления статуса');
    }
}

async function completeOrder(chatId, orderId) {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            await safeBotSend(chatId, '❌ Заявка не найдена');
            return;
        }

        orders[orderIndex].status = 'completed';
        orders[orderIndex].completedAt = new Date().toISOString();
        orders[orderIndex].comment = 'Завершено через Telegram бот';
        
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

        await safeBotSend(chatId, `✅ Заявка #${orderId} завершена`);
        
        // Уведомление в телеграм
        const order = orders[orderIndex];
        const message = `✅ <b>ЗАЯВКА ЗАВЕРШЕНА</b>\n\n` +
                      `📋 Заявка: #${orderId}\n` +
                      `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                      `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                      `💬 Комментарий: Завершено через бот\n` +
                      `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
        
        await sendTelegramNotification(message);
        
        await showOrderDetails(chatId, orderId);
    } catch (error) {
        console.error('❌ Ошибка complete-order:', error.message);
        await safeBotSend(chatId, '❌ Ошибка завершения');
    }
}

async function askCancelReason(chatId, orderId) {
    userStates.set(chatId, { 
        waitingForCancel: true, 
        orderId: orderId 
    });
    
    await safeBotSend(chatId, 
        `❌ <b>Укажите причину отмены заявки #${orderId}:</b>\n\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

async function cancelOrder(chatId, orderId, reason) {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const orderIndex = orders.findIndex(o => o.id === orderId);

        if (orderIndex === -1) {
            await safeBotSend(chatId, '❌ Заявка не найдена');
            return;
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

        await safeBotSend(chatId, 
            `❌ Заявка #${orderId} отменена\nПричина: ${reason}`,
            { parse_mode: 'HTML' }
        );
        
        // Уведомление в телеграм
        const order = orders[orderIndex];
        const message = `❌ <b>ЗАЯВКА ОТМЕНЕНА</b>\n\n` +
                      `📋 Заявка: #${orderId}\n` +
                      `👤 Клиент: ${order.user?.username || 'Неизвестно'}\n` +
                      `💵 Сумма: ${order.amount} ${order.type === 'buy' ? 'RUB' : 'USDT'}\n` +
                      `📝 Причина: ${reason}\n` +
                      `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
        
        await sendTelegramNotification(message);
        
        await showOrderDetails(chatId, orderId);
    } catch (error) {
        console.error('❌ Ошибка cancel-order:', error.message);
        await safeBotSend(chatId, '❌ Ошибка отмены');
    }
}

// ==================== ДРУГИЕ ФУНКЦИИ БОТА ====================

async function showStats(chatId) {
    try {
        const orders = readData(ORDERS_FILE) || [];
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

        const message = `📈 <b>СТАТИСТИКА СИСТЕМЫ</b>\n\n` +
                       `📊 <b>Всего ордеров:</b> ${totalOrders}\n` +
                       `🔥 <b>Активных:</b> ${pendingOrders}\n` +
                       `✅ <b>Завершенных:</b> ${completedOrders}\n` +
                       `❌ <b>Отмененных:</b> ${cancelledOrders}\n` +
                       `📈 <b>Процент завершения:</b> ${totalOrders > 0 ? (completedOrders / totalOrders * 100).toFixed(1) : 0}%`;

        await safeBotSend(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('❌ Ошибка stats:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки статистики');
    }
}

async function showUsers(chatId) {
    try {
        const users = readData(USERS_FILE) || [];
        
        const message = `👥 <b>ПОЛЬЗОВАТЕЛИ</b>\n\nВсего: ${users.length}\n\n` +
                       users.slice(0, 8).map(user => 
                         `• ${user.username} (${user.email || 'нет email'})`
                       ).join('\n');

        await safeBotSend(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('❌ Ошибка users:', error.message);
        await safeBotSend(chatId, '❌ Ошибка загрузки пользователей');
    }
}

async function showHelp(chatId) {
    const helpText = `🤖 <b>Команды админ-бота:</b>\n\n` +
                    `<b>Быстрые ответы:</b>\n` +
                    `<code>#ORD12345 Ваше сообщение</code>\n\n` +
                    `<b>Основные команды:</b>\n` +
                    `/start - Главное меню\n` +
                    `/cancel - Отменить текущее действие\n\n` +
                    `<b>Автоматически приходят уведомления о новых заявках!</b>`;
    
    await safeBotSend(chatId, helpText, { parse_mode: 'HTML' });
}

// ==================== ОБРАБОТКА СООБЩЕНИЙ ОТ АДМИНА ====================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId.toString() !== ADMIN_CHAT_ID || !text) return;
    
    // Пропускаем команды
    if (text.startsWith('/')) {
        if (text === '/cancel') {
            userStates.delete(chatId);
            await safeBotSend(chatId, '❌ Действие отменено');
            await showMainMenu(chatId);
        }
        return;
    }

    const state = userStates.get(chatId);

    // Обработка сообщения для клиента
    if (state && state.waitingForChat && state.orderId) {
        await sendMessageToClient(chatId, state.orderId, text);
        userStates.delete(chatId);
        return;
    }

    // Обработка причины отмены
    if (state && state.waitingForCancel && state.orderId) {
        await cancelOrder(chatId, state.orderId, text);
        userStates.delete(chatId);
        return;
    }

    // Обработка изменения базового курса
    if (state && state.waitingForBaseRate) {
        const newRate = parseFloat(text.replace(',', '.'));
        if (!isNaN(newRate) && newRate > 0) {
            try {
                const success = updateSettings({
                    baseRate: newRate,
                    updatedBy: 'admin'
                });

                if (success) {
                    await safeBotSend(chatId, `✅ Базовый курс обновлен: ${newRate} RUB`);
                    
                    // Уведомление в телеграм
                    const notification = `💰 <b>ОБНОВЛЕНИЕ КУРСА</b>\n\n` +
                                       `Новый базовый курс: ${newRate} RUB\n` +
                                       `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
                    await sendTelegramNotification(notification);
                    
                } else {
                    await safeBotSend(chatId, '❌ Ошибка обновления курса');
                }
            } catch (error) {
                console.error('❌ Ошибка обновления курса:', error.message);
                await safeBotSend(chatId, '❌ Ошибка обновления курса');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат курса. Введите число, например: 85.5');
        }
        userStates.delete(chatId);
        await showSettingsBot(chatId);
        return;
    }

    // Обработка изменения спреда
    if (state && state.waitingForSpread) {
        const newSpread = parseFloat(text.replace(',', '.'));
        if (!isNaN(newSpread) && newSpread > 0) {
            try {
                const success = updateSettings({
                    spread: newSpread,
                    updatedBy: 'admin'
                });

                if (success) {
                    await safeBotSend(chatId, `✅ Спред обновлен: ${newSpread} RUB`);
                    
                    // Уведомление в телеграм
                    const notification = `📊 <b>ОБНОВЛЕНИЕ СПРЕДА</b>\n\n` +
                                       `Новый спред: ${newSpread} RUB\n` +
                                       `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
                    await sendTelegramNotification(notification);
                    
                } else {
                    await safeBotSend(chatId, '❌ Ошибка обновления спреда');
                }
            } catch (error) {
                console.error('❌ Ошибка обновления спреда:', error.message);
                await safeBotSend(chatId, '❌ Ошибка обновления спреда');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат спреда. Введите число, например: 3.5');
        }
        userStates.delete(chatId);
        await showSettingsBot(chatId);
        return;
    }

    // Обработка настройки тихого часа
    if (state && state.waitingForQuietHours) {
        const times = text.split(' ');
        if (times.length === 2) {
            const startTime = times[0];
            const endTime = times[1];
            
            // Простая валидация времени
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            
            if (timeRegex.test(startTime) && timeRegex.test(endTime)) {
                try {
                    const success = updateSettings({
                        quietHours: {
                            enabled: true,
                            startTime: startTime,
                            endTime: endTime
                        },
                        updatedBy: 'admin'
                    });

                    if (success) {
                        await safeBotSend(chatId, `✅ Тихий час настроен: ${startTime} - ${endTime}`);
                        
                        // Уведомление в телеграм
                        const notification = `🌙 <b>НАСТРОЙКА ТИХОГО ЧАСА</b>\n\n` +
                                           `🕒 Время установлено: ${startTime} - ${endTime}\n` +
                                           `📋 Создание заявок будет приостанавливаться в указанный период`;
                        await sendTelegramNotification(notification);
                        
                    } else {
                        await safeBotSend(chatId, '❌ Ошибка настройки тихого часа');
                    }
                } catch (error) {
                    console.error('❌ Ошибка настройки тихого часа:', error.message);
                    await safeBotSend(chatId, '❌ Ошибка настройки тихого часа');
                }
            } else {
                await safeBotSend(chatId, '❌ Неверный формат времени. Используйте ЧЧ:ММ, например: 23:00 08:00');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат. Введите два времени через пробел, например: 23:00 08:00');
        }
        userStates.delete(chatId);
        await showSystemControl(chatId);
        return;
    }

    // Быстрый ответ через хештег
    if (text.startsWith('#')) {
        const parts = text.split(' ');
        const orderId = parts[0].substring(1);
        const messageText = parts.slice(1).join(' ');
        
        if (orderId && messageText.trim()) {
            await sendMessageToClient(chatId, orderId, messageText);
        }
        return;
    }

    // Если непонятное сообщение - показываем помощь
    await showHelp(chatId);
});

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ БОТА ====================

function formatTime(dateString) {
    try {
        return new Date(dateString).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return '--:--';
    }
}

function calculateTotal(order) {
    if (order.type === 'buy') {
        return (order.amount / order.rate).toFixed(2) + ' USDT';
    } else {
        return (order.amount * order.rate).toFixed(2) + ' RUB';
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ Ожидает оплаты',
        'paid': '💰 Оплачено',
        'completed': '✅ Завершено',
        'cancelled': '❌ Отменено'
    };
    return statusMap[status] || status;
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

function calculateRates(amount, settings) {
    let tier;
    
    if (amount < 100) {
        tier = settings.tiers[0];
    } else if (amount < 1000) {
        tier = settings.tiers[1];
    } else if (amount < 10000) {
        tier = settings.tiers[2];
    } else {
        tier = settings.tiers[3];
    }
    
    const buyRate = settings.baseRate * (2 - tier.multiplier);
    const sellRate = settings.baseRate * tier.multiplier;
    
    return {
        buy: Math.round(buyRate * 100) / 100,
        sell: Math.round(sellRate * 100) / 100,
        tier: tier.range
    };
}

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
            const quietMessage = `⏰ <b>ТИХИЙ ЧАС АКТИВЕН</b>\n\n` +
                               `🕒 Время: ${settings.quietHours.startTime} - ${settings.quietHours.endTime}\n` +
                               `📋 Создание заявок временно приостановлено\n` +
                               `🔄 Сервис возобновит работу в ${settings.quietHours.endTime}`;
            return res.status(403).json({
                success: false,
                error: quietMessage
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

        // ==================== ОТПРАВКА УВЕДОМЛЕНИЯ С РЕКВИЗИТАМИ ====================
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

            const message = `🔥 <b>НОВАЯ ЗАЯВКА #${orderId}</b>\n\n` +
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

// ==================== DEBUG ENDPOINTS ====================

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

// ==================== 404 HANDLER ====================

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

// ==================== ЗАПУСК СЕРВЕРА И БОТА ====================

app.listen(PORT, '0.0.0.0', () => {
    initializeDataFiles();
    console.log('=== ЗАПУСК TETHERBOT SERVER ===');
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 API доступно по https://tgbot-l516.onrender.com`);
    console.log(`🤖 Telegram бот: ✅ ЗАПУЩЕН И РАБОТАЕТ`);
});

console.log('✅ Telegram бот инициализирован!');