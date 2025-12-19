require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Telegraf } = require('telegraf');

const app = express();
const PORT = process.env.PORT || 3000;

// ВАЖНО: Получаем токен бота из переменных окружения
const BOT_TOKEN = process.env.REACT_APP_BOT_TOKEN || process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.REACT_APP_CHANNEL_ID || process.env.CHANNEL_ID;

console.log('🔧 Конфигурация:');
console.log('- PORT:', PORT);
console.log('- BOT_TOKEN:', BOT_TOKEN ? '✓ установлен' : '✗ отсутствует');
console.log('- CHANNEL_ID:', CHANNEL_ID || 'не установлен');
console.log('- NODE_ENV:', process.env.NODE_ENV);

// Настройка CORS
app.use(cors({
    origin: '*', // Разрешаем все источники для простоты
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Обслуживаем статические файлы (фронтенд)
app.use(express.static(path.join(__dirname)));

// Проверяем папку для загрузок
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Создана папка uploads');
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения и видео разрешены'));
        }
    }
});

// Инициализация Telegram бота
let bot = null;
if (BOT_TOKEN) {
    try {
        bot = new Telegraf(BOT_TOKEN);
        console.log('✅ Telegram бот инициализирован');
        
        // Проверка бота
        bot.telegram.getMe().then(botInfo => {
            console.log(`🤖 Бот: @${botInfo.username}`);
        }).catch(err => {
            console.error('❌ Ошибка проверки бота:', err.message);
        });
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram бота:', error.message);
    }
} else {
    console.warn('⚠️ Токен бота не найден');
}

// ==================== МАРШРУТЫ ====================

// Главная страница - отдаем index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Проверка здоровья
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'Flower Market',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        telegram: !!bot
    });
});

// Информация о сервере
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Flower Market Kyrgyzstan',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        frontend: 'https://flowers-telegram-kyrgyzstan.up.railway.app',
        features: ['Frontend', 'Backend API', 'Telegram integration'],
        telegram: {
            bot_available: !!bot,
            channel_configured: !!CHANNEL_ID
        }
    });
});

// Проверка конфигурации Telegram
app.get('/api/check-telegram', (req, res) => {
    res.json({
        bot_token_configured: !!BOT_TOKEN,
        channel_id_configured: !!CHANNEL_ID,
        bot_initialized: !!bot,
        message: bot ? 'Telegram бот готов' : 'Telegram не настроен',
        frontend_url: 'https://flowers-telegram-kyrgyzstan.up.railway.app'
    });
});

// Загрузка медиа
app.post('/api/upload', upload.array('media', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Файлы не загружены' 
            });
        }
        
        const fileUrls = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            filename: file.filename,
            size: file.size
        }));
        
        console.log(`✅ Загружено ${req.files.length} файлов`);
        
        res.json({
            success: true,
            files: fileUrls,
            message: `Загружено ${req.files.length} файлов`
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки файлов:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка загрузки файлов'
        });
    }
});

// Публикация объявления
app.post('/api/publish', async (req, res) => {
    try {
        const { 
            photos = [], 
            videos = [], 
            description, 
            price, 
            contact_type, 
            contacts,
            location 
        } = req.body;
        
        console.log('📨 Получено объявление для публикации');
        
        // Валидация
        if (!description || description.trim().length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: 'Описание должно содержать минимум 3 символа' 
            });
        }
        
        if (!price || price.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Укажите цену' 
            });
        }
        
        // Публикация в Telegram
        let telegramResult = null;
        
        if (bot && CHANNEL_ID) {
            try {
                // Формируем текст
                let messageText = `🌸 *НОВОЕ ОБЪЯВЛЕНИЕ* 🌸\n\n`;
                messageText += `📝 *Описание:* ${description}\n\n`;
                messageText += `💰 *Цена:* ${price}\n\n`;
                
                if (contact_type === 'telegram' && contacts) {
                    const cleanContact = contacts.replace('@', '');
                    messageText += `📱 *Telegram:* @${cleanContact}\n`;
                } else if (contact_type === 'phone' && contacts) {
                    messageText += `📱 *Телефон:* ${contacts}\n`;
                } else {
                    messageText += `📱 *Контакты:* В комментариях\n`;
                }
                
                messageText += `📍 *Локация:* `;
                if (location) {
                    if (location.region) messageText += location.region;
                    if (location.city) messageText += `, ${location.city}`;
                    if (location.address) messageText += `, ${location.address}`;
                }
                
                // Отправляем
                const message = await bot.telegram.sendMessage(
                    CHANNEL_ID,
                    messageText,
                    { 
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true,
                        disable_notification: false
                    }
                );
                
                telegramResult = {
                    success: true,
                    message_id: message.message_id
                };
                
                console.log(`✅ Опубликовано в Telegram, ID: ${message.message_id}`);
                
            } catch (telegramError) {
                console.error('❌ Ошибка Telegram:', telegramError.message);
                telegramResult = {
                    success: false,
                    error: telegramError.message
                };
            }
        }
        
        // Формируем ответ
        const response = {
            success: true,
            message: telegramResult?.success ? 
                '✅ Объявление опубликовано в Telegram!' : 
                '⚠️ Объявление создано, но Telegram недоступен',
            telegram: telegramResult,
            timestamp: new Date().toISOString(),
            data: {
                description_length: description.length,
                price,
                has_location: !!location
            }
        };
        
        // Добавляем ссылку если есть
        if (telegramResult?.success) {
            const channelUsername = process.env.REACT_APP_CHANNEL_USERNAME;
            if (channelUsername) {
                const cleanUsername = channelUsername.replace('https://t.me/', '').replace('@', '');
                response.telegram_link = `https://t.me/${cleanUsername}/${telegramResult.message_id}`;
            }
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('❌ Ошибка публикации:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Ошибка сервера',
            message: 'Попробуйте позже'
        });
    }
});

// Обслуживаем загруженные файлы
app.use('/uploads', express.static(uploadDir));

// Все остальные GET запросы перенаправляем на index.html (для SPA)
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
        res.status(404).json({ error: 'Маршрут не найден' });
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Ошибка:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Файл слишком большой (макс 50MB)' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Максимум 10 файлов' });
        }
    }
    
    res.status(500).json({ 
        error: 'Внутренняя ошибка сервера',
        message: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Flower Market запущен!`);
    console.log(`🌐 Локально: http://localhost:${PORT}`);
    console.log(`🌐 Railway: https://flowers-telegram-kyrgyzstan.up.railway.app`);
    console.log(`🤖 Telegram: ${bot ? '✓ активен' : '✗ не настроен'}`);
    console.log(`📢 Канал: ${CHANNEL_ID ? '✓ настроен' : '✗ не настроен'}`);
    console.log('='.repeat(50));
});