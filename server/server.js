// server.js
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

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
        const quietHoursStatus = settings.quietHours.enabled ? '🟢 ВКЛЮЧЕН' : '🔴 ВЫКЛЮЧЕН';
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

// ==================== СЕРВЕРНЫЕ ФУНКЦИИ (ОСТАВЛЯЕМ ИЗ ПРЕДЫДУЩЕГО ФАЙЛА) ====================

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

// ==================== API ENDPOINTS (ОСТАВЛЯЕМ ИЗ ПРЕДЫДУЩЕГО ФАЙЛА) ====================

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

// ... (ВСЕ ОСТАЛЬНЫЕ API ENDPOINTS ИЗ ПРЕДЫДУЩЕГО server.js ФАЙЛА)
// ВСТАВЬТЕ СЮДА ВСЕ ОСТАВШИЕСЯ API ENDPOINTS ИЗ ВАШЕГО ИСХОДНОГО server.js

// ==================== ЗАПУСК СЕРВЕРА И БОТА ====================

app.listen(PORT, () => {
    initializeDataFiles();
    console.log('=== ЗАПУСК TETHERBOT SERVER ===');
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 API доступно по http://localhost:${PORT}`);
    console.log(`🤖 Telegram бот: ✅ ЗАПУЩЕН И РАБОТАЕТ`);
    console.log(`💳 Система отправки реквизитов администратору: ✅ АКТИВНА`);
    console.log(`🔗 Бот готов принимать команды: /start`);
});

console.log('✅ Telegram бот инициализирован!');