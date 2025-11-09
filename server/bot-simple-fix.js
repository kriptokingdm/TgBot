// server/bot-simple-fix.js
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const TELEGRAM_TOKEN = '7950211944:AAGwDmV_XcS8K2nADlX2HoAkf9fTemcN-pI';
const ADMIN_CHAT_ID = '7879866656';

// Создаем бота
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// Хранилище состояний для чата
const userStates = new Map();

console.log('🚀 Admin Bot запущен...');

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

async function safeBotSend(chatId, text, options = {}) {
    try {
        return await bot.sendMessage(chatId, text, options);
    } catch (error) {
        console.log('❌ Ошибка отправки в бота:', error.message);
        return null;
    }
}

function getCurrentSettings() {
    try {
        const settingsData = fs.readFileSync('./settings.json', 'utf8');
        return JSON.parse(settingsData);
    } catch (error) {
        console.log('❌ Ошибка загрузки настроек, используем по умолчанию');
        return {
            baseRate: 83.0,
            spread: 5.0,
            tiers: [
                { range: "25-500$", multiplier: 1.12 },
                { range: "500-5000$", multiplier: 1.09 },
                { range: "5000-50000$", multiplier: 1.06 },
                { range: "50000$+", multiplier: 1.04 }
            ],
            lastUpdated: new Date().toISOString(),
            updatedBy: "system"
        };
    }
}

function updateSettings(newSettings) {
    try {
        const currentSettings = getCurrentSettings();
        const updatedSettings = {
            ...currentSettings,
            ...newSettings,
            lastUpdated: new Date().toISOString()
        };
        
        fs.writeFileSync('./settings.json', JSON.stringify(updatedSettings, null, 2));
        console.log('✅ Настройки обновлены');
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения настроек:', error.message);
        return false;
    }
}

function calculateRates(amount, settings) {
    let tier;
    
    // ИСПРАВЛЕННАЯ ЛОГИКА: чем больше сумма - тем ВЫГОДНЕЕ курс
    if (amount < 100) {
        tier = settings.tiers[0];        // Самый НЕвыгодный
    } else if (amount < 1000) {
        tier = settings.tiers[1];        // Средний
    } else if (amount < 10000) {
        tier = settings.tiers[2];        // Выгодный
    } else {
        tier = settings.tiers[3];        // Самый ВЫГОДНЫЙ
    }
    
    // ДЛЯ ПОКУПКИ USDT: базовый курс * множитель (чем меньше множитель - тем выгоднее)
    const buyRate = settings.baseRate * tier.multiplier;
    
    // ДЛЯ ПРОДАЖИ USDT: курс покупки - спред (чем больше - тем выгоднее продавать)
    const sellRate = buyRate - settings.spread;
    
    return {
        buy: Math.round(buyRate * 100) / 100,
        sell: Math.round(sellRate * 100) / 100,
        tier: tier.range
    };
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

// ==================== ГЛАВНОЕ МЕНЮ ====================

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
                { text: '⚙️ Настройки', callback_data: 'settings' }
            ]
        ]
    };

    await safeBotSend(chatId, message, {
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
        else if (data === 'edit_base_rate') {
            await editBaseRate(chatId);
        }
        else if (data === 'edit_spread') {
            await editSpread(chatId);
        }
        else if (data === 'edit_tiers') {
            await editTiers(chatId);
        }
        else if (data === 'show_current_rates') {
            await showCurrentRates(chatId);
        }
        else if (data === 'update_all_rates') {
            await updateAllRates(chatId);
        }
        else if (data.startsWith('edit_tier_')) {
            const tierIndex = parseInt(data.replace('edit_tier_', ''));
            await editTier(chatId, tierIndex);
        }

    } catch (error) {
        console.error('❌ Ошибка callback:', error.message);
        await safeBotSend(chatId, '❌ Ошибка обработки запроса');
    }
});

// ==================== НАСТРОЙКИ КУРСОВ ====================

async function showSettings(chatId) {
    try {
        function getCurrentSettings() {
            try {
                const settingsData = fs.readFileSync('./settings.json', 'utf8');
                return JSON.parse(settingsData);
            } catch (error) {
                console.log('❌ Ошибка загрузки настроек, используем по умолчанию');
                return {
                    baseRate: 81.0,  // Базовый курс
                    spread: 2.0,     // Спред между покупкой и продажей
                    tiers: [
                        { range: "0-100$", multiplier: 1.08 },       // Малые суммы: +8%
                        { range: "100-1000$", multiplier: 1.05 },    // Средние суммы: +5%  
                        { range: "1000-10000$", multiplier: 1.02 },  // Крупные суммы: +2%
                        { range: "10000$+", multiplier: 1.00 }       // Очень крупные: базовый курс
                    ],
                    lastUpdated: new Date().toISOString(),
                    updatedBy: "system"
                };
            }
        };
        
        const message = `⚙️ <b>НАСТРОЙКИ КУРСОВ</b>\n\n` +
                       `💰 <b>Базовый курс:</b> ${settings.baseRate} RUB\n` +
                       `📊 <b>Спред:</b> ${settings.spread} RUB\n` +
                       `⏰ <b>Обновлено:</b> ${formatTime(settings.lastUpdated)}\n` +
                       `👤 <b>Кем:</b> ${settings.updatedBy || 'system'}\n\n` +
                       `<b>Текущие тарифы:</b>\n` +
                       settings.tiers.map((tier, index) => 
                           `${index + 1}. ${tier.range}: множитель ${tier.multiplier}`
                       ).join('\n');

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✏️ Изменить базовый курс', callback_data: 'edit_base_rate' },
                    { text: '📊 Изменить спред', callback_data: 'edit_spread' }
                ],
                [
                    { text: '🎯 Настроить тарифы', callback_data: 'edit_tiers' },
                    { text: '🔄 Обновить все', callback_data: 'update_all_rates' }
                ],
                [
                    { text: '📈 Текущие курсы', callback_data: 'show_current_rates' },
                    { text: '🏠 Главная', callback_data: 'main_menu' }
                ]
            ]
        };

        await safeBotSend(chatId, message, { 
            parse_mode: 'HTML',
            reply_markup: keyboard 
        });

    } catch (error) {
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

async function editTiers(chatId) {
    const settings = getCurrentSettings();
    
    const message = `🎯 <b>НАСТРОЙКА ТАРИФОВ</b>\n\n` +
                   `Текущие настройки:\n\n` +
                   settings.tiers.map((tier, index) => 
                       `${index + 1}. <b>${tier.range}</b>: множитель ${tier.multiplier}`
                   ).join('\n') +
                   `\n\n⚡ <b>Выберите тариф для редактирования:</b>`;

    const keyboard = {
        inline_keyboard: [
            ...settings.tiers.map((tier, index) => [
                { 
                    text: `${index + 1}. ${tier.range}`, 
                    callback_data: `edit_tier_${index}` 
                }
            ]),
            [
                { text: '🔙 Назад', callback_data: 'settings' }
            ]
        ]
    };

    await safeBotSend(chatId, message, { 
        parse_mode: 'HTML',
        reply_markup: keyboard 
    });
}

async function editTier(chatId, tierIndex) {
    userStates.set(chatId, { 
        waitingForTierEdit: true,
        tierIndex: tierIndex
    });
    
    const settings = getCurrentSettings();
    const tier = settings.tiers[tierIndex];
    
    await safeBotSend(chatId, 
        `🎯 <b>Редактирование тарифа ${tierIndex + 1}</b>\n\n` +
        `📊 <b>Текущие значения:</b>\n` +
        `• Диапазон: ${tier.range}\n` +
        `• Множитель: ${tier.multiplier}\n\n` +
        `✏️ <b>Введите новый множитель:</b>\n\n` +
        `<i>Пример: 1.12 или 1.08</i>\n` +
        `<i>Множитель применяется к базовому курсу</i>\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

async function showCurrentRates(chatId) {
    try {
        const settings = getCurrentSettings();
        
        // Рассчитываем примерные курсы для разных сумм
        const testAmounts = [100, 1000, 5000, 10000];
        
        let message = `📈 <b>ТЕКУЩИЕ КУРСЫ ДЛЯ РАЗНЫХ СУММ</b>\n\n`;
        
        testAmounts.forEach(amount => {
            const response = calculateRates(amount, settings);
            message += `💰 <b>${amount}$</b> (${response.tier})\n` +
                      `🟢 Покупка: ${response.buy} RUB\n` +
                      `🔴 Продажа: ${response.sell} RUB\n` +
                      `📊 Разница: ${(response.buy - response.sell).toFixed(2)} RUB\n\n`;
        });
        
        message += `⚙️ <b>Настройки:</b>\n` +
                  `• Базовый курс: ${settings.baseRate} RUB\n` +
                  `• Спред: ${settings.spread} RUB\n` +
                  `• Обновлено: ${formatTime(settings.lastUpdated)}`;

        await safeBotSend(chatId, message, { parse_mode: 'HTML' });

    } catch (error) {
        await safeBotSend(chatId, '❌ Ошибка расчета курсов');
    }
}

async function updateAllRates(chatId) {
    userStates.set(chatId, { 
        waitingForAllRates: true 
    });
    
    const settings = getCurrentSettings();
    
    await safeBotSend(chatId, 
        `🔄 <b>ОБНОВЛЕНИЕ ВСЕХ НАСТРОЕК</b>\n\n` +
        `✏️ <b>Введите данные в формате:</b>\n\n` +
        `<code>базовый_курс спред множитель1 множитель2 множитель3 множитель4</code>\n\n` +
        `<b>Пример:</b>\n` +
        `<code>85.5 3.5 1.12 1.09 1.06 1.04</code>\n\n` +
        `<b>Текущие значения:</b>\n` +
        `<code>${settings.baseRate} ${settings.spread} ${settings.tiers.map(t => t.multiplier).join(' ')}</code>\n\n` +
        `<i>Для отмены отправьте /cancel</i>`,
        { 
            parse_mode: 'HTML'
        }
    );
}

// ==================== ОБРАБОТКА СООБЩЕНИЙ ====================

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId.toString() !== ADMIN_CHAT_ID || !text) return;
    
    if (text.startsWith('/')) {
        if (text === '/cancel') {
            userStates.delete(chatId);
            await safeBotSend(chatId, '❌ Действие отменено');
            await showMainMenu(chatId);
        }
        return;
    }

    const state = userStates.get(chatId);

    // Обработка базового курса
    if (state && state.waitingForBaseRate) {
        const newRate = parseFloat(text);
        if (!isNaN(newRate) && newRate > 0) {
            const success = updateSettings({ baseRate: newRate, updatedBy: 'admin' });
            if (success) {
                await safeBotSend(chatId, `✅ Базовый курс обновлен: ${newRate} RUB`);
            } else {
                await safeBotSend(chatId, '❌ Ошибка обновления курса');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат курса');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
        return;
    }

    // Обработка спреда
    if (state && state.waitingForSpread) {
        const newSpread = parseFloat(text);
        if (!isNaN(newSpread) && newSpread > 0) {
            const success = updateSettings({ spread: newSpread, updatedBy: 'admin' });
            if (success) {
                await safeBotSend(chatId, `✅ Спред обновлен: ${newSpread} RUB`);
            } else {
                await safeBotSend(chatId, '❌ Ошибка обновления спреда');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат спреда');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
        return;
    }

    // Обработка множителя тарифа
    if (state && state.waitingForTierEdit && state.tierIndex !== undefined) {
        const newMultiplier = parseFloat(text);
        if (!isNaN(newMultiplier) && newMultiplier > 0) {
            const settings = getCurrentSettings();
            const updatedTiers = [...settings.tiers];
            updatedTiers[state.tierIndex].multiplier = newMultiplier;
            
            const success = updateSettings({ tiers: updatedTiers, updatedBy: 'admin' });
            if (success) {
                await safeBotSend(chatId, `✅ Тариф ${state.tierIndex + 1} обновлен: множитель ${newMultiplier}`);
            } else {
                await safeBotSend(chatId, '❌ Ошибка обновления тарифа');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверный формат множителя');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
        return;
    }

    // Обработка всех настроек
    if (state && state.waitingForAllRates) {
        const parts = text.split(' ');
        if (parts.length === 6) {
            const baseRate = parseFloat(parts[0]);
            const spread = parseFloat(parts[1]);
            const multipliers = parts.slice(2).map(m => parseFloat(m));
            
            if (!isNaN(baseRate) && !isNaN(spread) && multipliers.every(m => !isNaN(m))) {
                const updatedTiers = multipliers.map((multiplier, index) => ({
                    ...getCurrentSettings().tiers[index],
                    multiplier: multiplier
                }));
                
                const success = updateSettings({ 
                    baseRate, 
                    spread, 
                    tiers: updatedTiers,
                    updatedBy: 'admin' 
                });
                
                if (success) {
                    await safeBotSend(chatId, '✅ Все настройки успешно обновлены!');
                } else {
                    await safeBotSend(chatId, '❌ Ошибка обновления настроек');
                }
            } else {
                await safeBotSend(chatId, '❌ Неверный формат данных');
            }
        } else {
            await safeBotSend(chatId, '❌ Неверное количество параметров');
        }
        userStates.delete(chatId);
        await showSettings(chatId);
        return;
    }
});

// ==================== ДРУГИЕ ФУНКЦИИ (ЗАГЛУШКИ) ====================

async function showActiveOrders(chatId) {
    await safeBotSend(chatId, '📋 Функция активных заявок в разработке');
}

async function showStats(chatId) {
    await safeBotSend(chatId, '📊 Функция статистики в разработке');
}

async function showUsers(chatId) {
    await safeBotSend(chatId, '👥 Функция пользователей в разработке');
}

console.log('✅ Admin Bot готов к работе! Отправь /start в Telegram');