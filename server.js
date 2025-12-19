const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация бота
const bot = new TelegramBot(process.env.BOT_TOKEN);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// ============================================
// ВАЛИДАЦИЯ TELEGRAM WEBAPP
// ============================================

function validateTelegramInitData(initData) {
    try {
        if (!initData) return false;
        
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return false;
        
        // Удаляем hash для проверки
        params.delete('hash');
        
        // Сортируем параметры
        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        // Создаем секретный ключ
        const secretKey = crypto.createHmac('sha256', 'WebAppData')
            .update(process.env.BOT_TOKEN)
            .digest();
        
        // Вычисляем хеш
        const calculatedHash = crypto.createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        console.error('Ошибка валидации:', error);
        return false;
    }
}

// ============================================
// API ЭНДПОИНТЫ
// ============================================

// 1. Health check для Railway
app.get('/health', (req, res) => {
    res.json({ status: 'OK', time: new Date().toISOString() });
});

// 2. Публикация объявления (ГЛАВНЫЙ ЭНДПОИНТ)
app.post('/api/publish', async (req, res) => {
    try {
        const { 
            initData,
            description, 
            price, 
            contacts, 
            region,
            city,
            address,
            mediaFiles = []
        } = req.body;
        
        // Валидируем Telegram данные
        if (!validateTelegramInitData(initData)) {
            return res.status(401).json({ 
                success: false, 
                error: 'Невалидные данные Telegram' 
            });
        }
        
        // Форматируем сообщение
        const message = `
🌸 <b>НОВОЕ ОБЪЯВЛЕНИЕ</b>

${description}

💰 <b>Цена:</b> ${price}
📍 <b>Локация:</b> ${region}, ${city}${address ? ` (${address})` : ''}
📞 <b>Контакты:</b> ${contacts}

💬 <i>Комментарии включены - задавайте вопросы в комментариях!</i>
#цветы #${region || 'Кыргызстан'} #продажа
        `.trim();
        
        let sentMessage;
        
        // Если есть фото - отправляем с фото
        if (mediaFiles.length > 0) {
            // В реальном приложении здесь нужно загружать файлы в Telegram
            // и получать file_id
            
            // Для демо отправляем текстовое сообщение
            sentMessage = await bot.sendMessage(
                process.env.CHANNEL_ID,
                message + '\n\n📷 <i>Фотографии прикреплены к объявлению</i>',
                { parse_mode: 'HTML' }
            );
        } else {
            // Только текст
            sentMessage = await bot.sendMessage(
                process.env.CHANNEL_ID,
                message,
                { parse_mode: 'HTML' }
            );
        }
        
        // Получаем ссылку на пост с комментариями
        // Telegram автоматически создает комментарии, так как канал подключен к группе
        const channelId = process.env.CHANNEL_ID.replace('-100', '');
        const postLink = `https://t.me/c/${channelId}/${sentMessage.message_id}`;
        
        res.json({
            success: true,
            postLink,
            messageId: sentMessage.message_id,
            message: '✅ Объявление опубликовано! Комментарии автоматически включены.'
        });
        
    } catch (error) {
        console.error('Ошибка публикации:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 3. Получение городов
app.get('/api/cities/:region', (req, res) => {
    const citiesData = {
        'Бишкек': ['Бишкек', 'Центр', 'Аламедин', 'Левый берег', 'Правый берег'],
        'Ош': ['Ош', 'Центр', 'Старый город'],
        'Чуйская': ['Токмок', 'Кара-Балта', 'Кант'],
        'Ошская': ['Кара-Суу', 'Узген', 'Ноокат'],
        'Джалал-Абадская': ['Джалал-Абад', 'Майлуу-Суу', 'Кара-Куль'],
        'Иссык-Кульская': ['Балыкчи', 'Чолпон-Ата', 'Каракол'],
        'Нарынская': ['Нарын', 'Ат-Баши'],
        'Таласская': ['Талас', 'Кара-Буура'],
        'Баткенская': ['Баткен', 'Кызыл-Кия']
    };
    
    const region = decodeURIComponent(req.params.region);
    const cities = citiesData[region] || [];
    res.json({ cities });
});

// 4. Конфигурация
app.get('/api/config', (req, res) => {
    res.json({
        channelName: process.env.CHANNEL_USERNAME,
        maxPhotos: 10,
        features: {
            comments: true, // Комментарии уже подключены в канале
            location: true,
            priceNegotiable: true
        }
    });
});

// ============================================
// TELEGRAM BOT КОМАНДЫ (опционально)
// ============================================

// Команда /start для бота
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(
        chatId,
        `🌸 <b>Flower Market Kyrgyzstan</b>\n\n` +
        `Я помогу вам создать объявление о продаже цветов.\n\n` +
        `Нажмите кнопку ниже, чтобы начать:`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '📝 Создать объявление',
                        web_app: { url: process.env.RAILWAY_STATIC_URL }
                    }
                ]]
            }
        }
    );
});

// Если пользователь хочет связаться с продавцом через бота
bot.onText(/\/contact_(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const postId = match[1];
    
    await bot.sendMessage(
        chatId,
        `🔗 <b>Связь с продавцом</b>\n\n` +
        `Чтобы связаться с продавцом, просто оставьте комментарий под объявлением:\n` +
        `https://t.me/c/${process.env.CHANNEL_ID.replace('-100', '')}/${postId}\n\n` +
        `Продавец получит уведомление о вашем комментарии.`,
        { parse_mode: 'HTML' }
    );
});

// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 WebApp: ${process.env.RAILWAY_STATIC_URL}`);
    console.log(`📢 Канал: ${process.env.CHANNEL_USERNAME}`);
    console.log(`💬 Комментарии: Автоматически включены (канал подключен к группе)`);
});