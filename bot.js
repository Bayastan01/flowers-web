const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.RAILWAY_STATIC_URL || process.env.WEBAPP_URL || 'https://flowers-telegram-kyrgyzstan.up.railway.app/';

// Инициализация бота (polling для разработки, webhook для продакшена)
const bot = new TelegramBot(BOT_TOKEN, {
    polling: process.env.NODE_ENV !== 'production'
});

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    const keyboard = {
        reply_markup: {
            keyboard: [
                [{ text: "📱 Поделиться контактом", request_contact: true }],
                [{ text: "📝 Создать объявление" }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    };
    
    await bot.sendMessage(
        chatId,
        `🌸 *Flower Market Kyrgyzstan*\n\n` +
        `Создавайте красивые объявления о продаже цветов!\n\n` +
        `Нажмите "Создать объявление" или поделитесь контактом для начала.`,
        { parse_mode: 'Markdown', ...keyboard }
    );
});

// Кнопка "Создать объявление"
bot.onText(/Создать объявление/, async (msg) => {
    const webAppUrl = `${WEBAPP_URL}?startapp=${msg.chat.id}`;
    
    const inlineKeyboard = {
        inline_keyboard: [[
            {
                text: '🌺 Начать создание',
                web_app: { url: webAppUrl }
            }
        ]]
    };
    
    await bot.sendMessage(
        msg.chat.id,
        'Нажмите кнопку ниже, чтобы открыть форму создания объявления:',
        { reply_markup: inlineKeyboard }
    );
});

// Получение контакта
bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    
    // Сохраняем контакт (в реальном приложении - в БД)
    const contactInfo = {
        phone: msg.contact.phone_number,
        name: `${msg.contact.first_name} ${msg.contact.last_name || ''}`.trim(),
        userId: msg.contact.user_id
    };
    
    // Отправляем WebApp
    const webAppUrl = `${WEBAPP_URL}?contact=${encodeURIComponent(JSON.stringify(contactInfo))}`;
    
    const inlineKeyboard = {
        inline_keyboard: [[
            {
                text: '📝 Создать объявление',
                web_app: { url: webAppUrl }
            }
        ]]
    };
    
    await bot.sendMessage(
        chatId,
        `✅ Контакт получен! Теперь вы можете создавать объявления.`,
        { reply_markup: inlineKeyboard }
    );
});

// Обработка callback от кнопок в канале
bot.on('callback_query', async (callbackQuery) => {
    const { data, message, from } = callbackQuery;
    
    try {
        const action = JSON.parse(data);
        
        if (action.type === 'contact_seller') {
            // Отправляем контакт продавца покупателю
            await bot.sendMessage(
                from.id,
                `📞 Контакты продавца:\n` +
                `${action.contacts}\n\n` +
                `Ссылка на объявление: https://t.me/c/${action.channelId}/${action.messageId}`
            );
            
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'Контакты отправлены в личные сообщения'
            });
        }
    } catch (error) {
        console.error('Callback error:', error);
    }
});

console.log('Bot is running...');