// server/admin-server.js
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const TELEGRAM_TOKEN = '7950211944:AAGwDmV_XcS8K2nADlX2HoAkf9fTemcN-pI';
const ADMIN_CHAT_ID = '7879866656';
const SERVER_URL = 'http://localhost:5000';

// Создаем бота с улучшенными настройками
const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: {
        interval: 2000,
        timeout: 10,
        params: {
            timeout: 10
        }
    }
});

// Хранилище состояний для чата
const userStates = new Map();

console.log('🚀 Admin Bot запущен...');

// Обработка ошибок бота
bot.on('polling_error', (error) => {
    console.log(`⚠️ Ошибка polling: ${error.code} - ${error.message}`);
});

bot.on('webhook_error', (error) => {
    console.log(`⚠️ Ошибка webhook: ${error.message}`);
});

// ==================== ГЛАВНОЕ МЕНЮ ====================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_CHAT_ID) {
        return bot.sendMessage(chatId, '❌ У вас нет прав доступа');
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

    await safeSendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
    });
}

// ==================== ОБРАБОТКА CALLBACK ====================

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
            await showSettings(chatId);
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
        await safeSendMessage(chatId, '❌ Ошибка обработки запроса');
    }
});

// ==================== УПРАВЛЕНИЕ СИСТЕМОЙ ====================

async function showSystemControl(chatId) {
    try {
        const response = await axios.get(`${SERVER_URL}/api/admin/system-status`, {
            timeout: 5000
        });
        const status = response.data.status;
        
        const exchangeStatus = status.exchangeEnabled ? '🟢 ВКЛЮЧЕН' : '🔴 ВЫКЛЮЧЕН';
        const quietHoursStatus = status.quietHours.enabled ? '🟢 ВКЛЮЧЕН' : '🔴 ВЫКЛЮЧЕН';
        const quietHoursActive = status.quietHoursActive ? '🔴 АКТИВЕН' : '🟢 НЕАКТИВЕН';
        
        const message = `🎛️ <b>УПРАВЛЕНИЕ СИСТЕМОЙ</b>\n\n` +
                       `💱 <b>Обмен:</b> ${exchangeStatus}\n` +
                       `⏰ <b>Тихий час:</b> ${quietHoursStatus}\n` +
                       `📊 <b>Статус тихого часа:</b> ${quietHoursActive}\n` +
                       (status.quietHours.enabled ? 
                       `🕒 <b>Время тихого часа:</b> ${status.quietHours.startTime} - ${status.quietHours.endTime}\n` : '') +
                       `💰 <b>Базовый курс:</b> ${status.baseRate} RUB\n` +
                       `📈 <b>Спред:</b> ${status.spread} RUB\n\n` +
                       `⚡ <b>Выберите действие:</b>`;

        const keyboard = {
            inline_keyboard: [
                [
                    { text: status.exchangeEnabled ? '⏸️ Приостановить обмен' : '▶️ Возобновить обмен', 
                      callback_data: 'toggle_exchange' }
                ],
                [
                    { text: status.quietHours.enabled ? '🚫 Выключить тихий час' : '⏰ Включить тихий час', 
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

        await safeSendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки статуса:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки статуса системы');
    }
}

async function toggleExchange(chatId) {
    try {
        const statusResponse = await axios.get(`${SERVER_URL}/api/admin/system-status`, {
            timeout: 5000
        });
        const currentStatus = statusResponse.data.status.exchangeEnabled;
        
        const response = await axios.post(`${SERVER_URL}/api/admin/toggle-exchange`, {
            enabled: !currentStatus
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            await safeSendMessage(chatId, response.data.message);
            
            // Отправляем уведомление в телеграм
            const notification = response.data.exchangeEnabled ? 
                `✅ <b>ОБМЕН ВКЛЮЧЕН</b>\n\nСистема готова к приему заявок` :
                `⏸️ <b>ОБМЕН ПРИОСТАНОВЛЕН</b>\n\nСоздание новых заявок временно недоступно`;
            
            await sendTelegramNotification(notification);
            
        } else {
            await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
        }
        
        await showSystemControl(chatId);
        
    } catch (error) {
        console.error('❌ Ошибка переключения обмена:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка переключения обмена');
    }
}

async function toggleQuietHours(chatId) {
    try {
        const statusResponse = await axios.get(`${SERVER_URL}/api/admin/system-status`, {
            timeout: 5000
        });
        const currentStatus = statusResponse.data.status.quietHours.enabled;
        
        const response = await axios.post(`${SERVER_URL}/api/admin/toggle-quiet-hours`, {
            enabled: !currentStatus
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            await safeSendMessage(chatId, response.data.message);
            
            // Отправляем уведомление в телеграм
            if (!currentStatus) { // Если включаем
                const notification = `🌙 <b>ТИХИЙ ЧАС АКТИВИРОВАН</b>\n\n` +
                                   `🕒 Время: ${response.data.quietHours.startTime} - ${response.data.quietHours.endTime}\n` +
                                   `📋 Создание заявок приостановлено`;
                await sendTelegramNotification(notification);
            } else {
                await sendTelegramNotification('☀️ <b>ТИХИЙ ЧАС ОТКЛЮЧЕН</b>\n\nСистема возобновила работу');
            }
            
        } else {
            await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
        }
        
        await showSystemControl(chatId);
        
    } catch (error) {
        console.error('❌ Ошибка переключения тихого часа:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка переключения тихого часа');
    }
}

async function setQuietHours(chatId) {
    userStates.set(chatId, {
        waitingForQuietHours: true
    });
    
    await safeSendMessage(chatId,
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

// ==================== НАСТРОЙКИ КУРСОВ ====================

async function showSettings(chatId) {
    try {
        const response = await axios.get(`${SERVER_URL}/api/settings`, {
            timeout: 5000
        });
        const settings = response.data.settings;
        
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

        await safeSendMessage(chatId, message, { 
            parse_mode: 'HTML',
            reply_markup: keyboard 
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки настроек');
    }
}

async function editBaseRate(chatId) {
    userStates.set(chatId, { 
        waitingForBaseRate: true 
    });
    
    try {
        const response = await axios.get(`${SERVER_URL}/api/settings`, {
            timeout: 5000
        });
        const settings = response.data.settings;
        
        await safeSendMessage(chatId, 
            `💰 <b>Текущий базовый курс:</b> ${settings.baseRate} RUB\n\n` +
            `✏️ <b>Введите новый базовый курс в RUB:</b>\n\n` +
            `<i>Пример: 85.5 или 90.0</i>\n` +
            `<i>Для отмены отправьте /cancel</i>`,
            { 
                parse_mode: 'HTML'
            }
        );
    } catch (error) {
        await safeSendMessage(chatId, 
            `✏️ <b>Введите новый базовый курс в RUB:</b>\n\n` +
            `<i>Пример: 85.5 или 90.0</i>\n` +
            `<i>Для отмены отправьте /cancel</i>`,
            { 
                parse_mode: 'HTML'
            }
        );
    }
}

async function editSpread(chatId) {
    userStates.set(chatId, { 
        waitingForSpread: true 
    });
    
    try {
        const response = await axios.get(`${SERVER_URL}/api/settings`, {
            timeout: 5000
        });
        const settings = response.data.settings;
        
        await safeSendMessage(chatId, 
            `📊 <b>Текущий спред:</b> ${settings.spread} RUB\n\n` +
            `✏️ <b>Введите новый спред в RUB:</b>\n\n` +
            `<i>Спред - это разница между курсом покупки и продажи</i>\n` +
            `<i>Пример: 3.5 или 5.0</i>\n` +
            `<i>Для отмены отправьте /cancel</i>`,
            { 
                parse_mode: 'HTML'
            }
        );
    } catch (error) {
        await safeSendMessage(chatId, 
            `✏️ <b>Введите новый спред в RUB:</b>\n\n` +
            `<i>Спред - это разница между курсом покупки и продажи</i>\n` +
            `<i>Пример: 3.5 или 5.0</i>\n` +
            `<i>Для отмены отправьте /cancel</i>`,
            { 
                parse_mode: 'HTML'
            }
        );
    }
}

// ==================== АКТИВНЫЕ ОРДЕРА ====================

async function showActiveOrders(chatId) {
    try {
        console.log('🔄 Загрузка активных ордеров...');
        
        const response = await axios.get(`${SERVER_URL}/api/debug/orders`, {
            timeout: 5000
        });
        
        const orders = response.data.orders || [];
        const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'paid');
        
        console.log(`✅ Найдено активных ордеров: ${activeOrders.length}`);

        if (activeOrders.length === 0) {
            return await safeSendMessage(chatId, 
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

        await safeSendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки ордеров:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки заявок. Проверьте сервер.');
    }
}

// ==================== ДЕТАЛИ ОРДЕРА С ЧАТОМ ====================

async function showOrderDetails(chatId, orderId) {
    try {
        console.log(`🔄 Загрузка деталей ордера ${orderId}...`);
        
        const response = await axios.get(`${SERVER_URL}/api/admin/order/${orderId}`, {
            timeout: 5000
        });
        
        const order = response.data.order;
        
        if (!order) {
            return await safeSendMessage(chatId, '❌ Заявка не найдена');
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
            const lastMessages = order.messages.slice(-3); // Последние 3 сообщения
            
            lastMessages.forEach(msg => {
                const sender = msg.type === 'user' ? '👤 Клиент' : 
                              msg.type === 'support' ? '🛠️ Поддержка' : '⚡ Система';
                const time = formatTime(msg.timestamp);
                // Обрезаем длинные сообщения
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

        await safeSendMessage(chatId, message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки деталей:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки деталей. Проверьте соединение с сервером.');
    }
}

// ==================== ЧАТ С КЛИЕНТОМ ====================

async function startChatWithClient(chatId, orderId) {
    userStates.set(chatId, { 
        waitingForChat: true, 
        orderId: orderId 
    });
    
    await safeSendMessage(chatId, 
        `💬 <b>Введите сообщение для заявки #${orderId}:</b>\n\n` +
        `Сообщение будет отправлено клиенту в чат поддержки.\n\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

// Функция отправки сообщения клиенту
async function sendMessageToClient(chatId, orderId, messageText) {
    try {
        console.log(`📨 Отправка сообщения для ордера ${orderId}: ${messageText}`);
        
        const response = await axios.post(`${SERVER_URL}/api/admin/send-message`, {
            orderId: orderId,
            message: messageText,
            type: 'support'
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            console.log(`✅ Сообщение отправлено в ордер ${orderId}`);
            
            await safeSendMessage(chatId, 
                `✅ <b>Сообщение отправлено!</b>\n\n` +
                `📨 <b>Заявка:</b> #${orderId}\n` +
                `💬 <b>Ваше сообщение:</b>\n${messageText}`,
                { parse_mode: 'HTML' }
            );
            
            // Показываем обновленные детали ордера
            setTimeout(() => {
                showOrderDetails(chatId, orderId);
            }, 1000);
            
        } else {
            await safeSendMessage(chatId, `❌ Ошибка сервера: ${response.data.error}`);
        }
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка отправки сообщения. Проверьте сервер.');
    }
}

// ==================== ДЕЙСТВИЯ С ОРДЕРАМИ ====================

async function markOrderPaid(chatId, orderId) {
    try {
        const response = await axios.post(`${SERVER_URL}/api/admin/mark-paid`, {
            orderId: orderId
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            await safeSendMessage(chatId, `✅ Заявка #${orderId} отмечена как оплаченная`);
            await showOrderDetails(chatId, orderId);
        } else {
            await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
        }
    } catch (error) {
        console.error('❌ Ошибка mark-paid:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка обновления статуса');
    }
}

async function completeOrder(chatId, orderId) {
    try {
        const response = await axios.post(`${SERVER_URL}/api/admin/complete-order`, {
            orderId: orderId,
            comment: 'Завершено через Telegram бот'
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            await safeSendMessage(chatId, `✅ Заявка #${orderId} завершена`);
            await showOrderDetails(chatId, orderId);
        } else {
            await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
        }
    } catch (error) {
        console.error('❌ Ошибка complete-order:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка завершения');
    }
}

async function askCancelReason(chatId, orderId) {
    userStates.set(chatId, { 
        waitingForCancel: true, 
        orderId: orderId 
    });
    
    await safeSendMessage(chatId, 
        `❌ <b>Укажите причину отмены заявки #${orderId}:</b>\n\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

async function cancelOrder(chatId, orderId, reason) {
    try {
        const response = await axios.post(`${SERVER_URL}/api/admin/cancel-order`, {
            orderId: orderId,
            reason: reason
        }, {
            timeout: 5000
        });

        if (response.data.success) {
            await safeSendMessage(chatId, 
                `❌ Заявка #${orderId} отменена\nПричина: ${reason}`,
                { parse_mode: 'HTML' }
            );
            await showOrderDetails(chatId, orderId);
        } else {
            await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
        }
    } catch (error) {
        console.error('❌ Ошибка cancel-order:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка отмены');
    }
}

// ==================== ДРУГИЕ ФУНКЦИИ ====================

async function showStats(chatId) {
    try {
        const response = await axios.get(`${SERVER_URL}/api/admin/stats`, {
            timeout: 5000
        });
        const stats = response.data.stats;
        
        const message = `📈 <b>СТАТИСТИКА СИСТЕМЫ</b>\n\n` +
                       `📊 <b>Всего ордеров:</b> ${stats.total}\n` +
                       `🔥 <b>Активных:</b> ${stats.pending}\n` +
                       `✅ <b>Завершенных:</b> ${stats.completed}\n` +
                       `❌ <b>Отмененных:</b> ${stats.cancelled}\n` +
                       `📈 <b>Процент завершения:</b> ${stats.completionRate}%`;

        await safeSendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('❌ Ошибка stats:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки статистики');
    }
}

async function showUsers(chatId) {
    try {
        const response = await axios.get(`${SERVER_URL}/api/debug/users`, {
            timeout: 5000
        });
        const users = response.data.users || [];
        
        const message = `👥 <b>ПОЛЬЗОВАТЕЛИ</b>\n\nВсего: ${users.length}\n\n` +
                       users.slice(0, 8).map(user => 
                         `• ${user.username} (${user.email || 'нет email'})`
                       ).join('\n');

        await safeSendMessage(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        console.error('❌ Ошибка users:', error.message);
        await safeSendMessage(chatId, '❌ Ошибка загрузки пользователей');
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
    
    await safeSendMessage(chatId, helpText, { parse_mode: 'HTML' });
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
            await safeSendMessage(chatId, '❌ Действие отменено');
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
                const response = await axios.post(`${SERVER_URL}/api/settings/update`, {
                    baseRate: newRate,
                    updatedBy: 'admin'
                }, {
                    timeout: 5000
                });

                if (response.data.success) {
                    await safeSendMessage(chatId, `✅ Базовый курс обновлен: ${newRate} RUB`);
                    
                    // Уведомление в телеграм
                    const notification = `💰 <b>ОБНОВЛЕНИЕ КУРСА</b>\n\n` +
                                       `Новый базовый курс: ${newRate} RUB\n` +
                                       `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
                    await sendTelegramNotification(notification);
                    
                } else {
                    await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
                }
            } catch (error) {
                console.error('❌ Ошибка обновления курса:', error.message);
                await safeSendMessage(chatId, '❌ Ошибка обновления курса');
            }
        } else {
            await safeSendMessage(chatId, '❌ Неверный формат курса. Введите число, например: 85.5');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
        return;
    }

    // Обработка изменения спреда
    if (state && state.waitingForSpread) {
        const newSpread = parseFloat(text.replace(',', '.'));
        if (!isNaN(newSpread) && newSpread > 0) {
            try {
                const response = await axios.post(`${SERVER_URL}/api/settings/update`, {
                    spread: newSpread,
                    updatedBy: 'admin'
                }, {
                    timeout: 5000
                });

                if (response.data.success) {
                    await safeSendMessage(chatId, `✅ Спред обновлен: ${newSpread} RUB`);
                    
                    // Уведомление в телеграм
                    const notification = `📊 <b>ОБНОВЛЕНИЕ СПРЕДА</b>\n\n` +
                                       `Новый спред: ${newSpread} RUB\n` +
                                       `⏰ Время: ${new Date().toLocaleTimeString('ru-RU')}`;
                    await sendTelegramNotification(notification);
                    
                } else {
                    await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
                }
            } catch (error) {
                console.error('❌ Ошибка обновления спреда:', error.message);
                await safeSendMessage(chatId, '❌ Ошибка обновления спреда');
            }
        } else {
            await safeSendMessage(chatId, '❌ Неверный формат спреда. Введите число, например: 3.5');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
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
                    const response = await axios.post(`${SERVER_URL}/api/admin/toggle-quiet-hours`, {
                        enabled: true,
                        startTime: startTime,
                        endTime: endTime
                    }, {
                        timeout: 5000
                    });

                    if (response.data.success) {
                        await safeSendMessage(chatId, response.data.message);
                        
                        // Уведомление в телеграм
                        const notification = `🌙 <b>НАСТРОЙКА ТИХОГО ЧАСА</b>\n\n` +
                                           `🕒 Время установлено: ${startTime} - ${endTime}\n` +
                                           `📋 Создание заявок будет приостанавливаться в указанный период`;
                        await sendTelegramNotification(notification);
                        
                    } else {
                        await safeSendMessage(chatId, `❌ Ошибка: ${response.data.error}`);
                    }
                } catch (error) {
                    console.error('❌ Ошибка настройки тихого часа:', error.message);
                    await safeSendMessage(chatId, '❌ Ошибка настройки тихого часа');
                }
            } else {
                await safeSendMessage(chatId, '❌ Неверный формат времени. Используйте ЧЧ:ММ, например: 23:00 08:00');
            }
        } else {
            await safeSendMessage(chatId, '❌ Неверный формат. Введите два времени через пробел, например: 23:00 08:00');
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

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

async function sendTelegramNotification(message) {
    try {
        await bot.sendMessage(ADMIN_CHAT_ID, message, {
            parse_mode: 'HTML'
        });
    } catch (error) {
        console.error('❌ Ошибка отправки уведомления:', error.message);
    }
}

// Безопасная отправка сообщений
async function safeSendMessage(chatId, text, options = {}) {
    try {
        return await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения в Telegram:', error.message);
        return null;
    }
}

function calculateTotal(order) {
    if (order.type === 'buy') {
        return (order.amount / order.rate).toFixed(2) + ' USDT';
    } else {
        return (order.amount * order.rate).toFixed(2) + ' RUB';
    }
}

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

function getStatusText(status) {
    const statusMap = {
        'pending': '⏳ Ожидает оплаты',
        'paid': '💰 Оплачено',
        'completed': '✅ Завершено',
        'cancelled': '❌ Отменено'
    };
    return statusMap[status] || status;
}

console.log('✅ Admin Bot готов к работе! Отправь /start в Telegram');