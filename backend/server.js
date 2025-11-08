const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ⚠️ ВАЖНО: DATABASE_URL должен быть в переменных окружения на Render!
// Пример Connection String для Neon PostgreSQL:
// DATABASE_URL="postgresql://neondb_owner:npg_Z8yYSOgIpKD3@ep-dry-unit-agjm46dy-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
// 
// НЕ добавляйте Connection String прямо в код! Используйте только переменные окружения.

// CORS настройки
const corsOptions = {
    origin: [
        'https://sizizxc.me',
        'http://sizizxc.me',
        'https://www.sizizxc.me',
        'http://www.sizizxc.me',
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve frontend files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/reviews.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/reviews.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/about.html'));
});

// Инициализация базы данных PostgreSQL (Neon)
// Подключение к Neon PostgreSQL через переменную окружения DATABASE_URL
// Пример Connection String:
// postgresql://neondb_owner:npg_Z8yYSOgIpKD3@ep-dry-unit-agjm46dy-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

let pool;

try {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL не настроен в переменных окружения!');
        console.error('⚠️  Добавьте DATABASE_URL в Environment Variables на Render');
        console.error('📝 Пример: postgresql://user:password@host/database?sslmode=require');
    }

    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech') 
            ? { rejectUnauthorized: false } 
            : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Проверка подключения к БД
    pool.on('connect', () => {
        console.log('✅ Подключение к PostgreSQL успешно установлено');
    });

    pool.on('error', (err) => {
        console.error('❌ Ошибка подключения к PostgreSQL:', err);
    });
} catch (error) {
    console.error('❌ Ошибка создания пула подключений:', error);
    process.exit(1);
}

// Флаг готовности БД
let dbReady = false;

// Создание таблиц
async function initializeDatabase() {
    if (!pool) {
        console.error('❌ Пул подключений не инициализирован');
        return;
    }

    try {
        // Проверка подключения
        await pool.query('SELECT NOW()');
        console.log('✅ Подключение к PostgreSQL успешно установлено');

        // Таблица пользователей
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица отзывов
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                username VARCHAR(50) NOT NULL,
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Индексы для оптимизации
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC)
        `);

        dbReady = true;
        console.log('✅ Таблицы базы данных инициализированы');
    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
        console.error('Детали ошибки:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        dbReady = false;
    }
}

// Инициализация при запуске
async function startServer() {
    try {
        // Ждем инициализации БД
        await initializeDatabase();
        
        if (!dbReady) {
            console.error('❌ Не удалось инициализировать базу данных');
            console.error('⚠️  Сервер будет запущен, но БД может быть не готова');
            // Не останавливаем сервер, но предупреждаем
        }

        // Запуск сервера только после инициализации БД
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на порту ${PORT}`);
            console.log(`📊 База данных: ${dbReady ? '✅ Готова' : '❌ Не готова'}`);
            if (process.env.DATABASE_URL) {
                console.log(`🔗 Подключение: PostgreSQL (Neon)`);
            } else {
                console.log(`⚠️  DATABASE_URL не настроен`);
            }
        });
    } catch (error) {
        console.error('❌ Критическая ошибка при запуске сервера:', error);
        process.exit(1);
    }
}

// Запускаем сервер
startServer();

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
};

// Регистрация пользователя
app.post('/api/register', [
    body('username').trim().isLength({ min: 3 }).withMessage('Имя пользователя должно содержать минимум 3 символа'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Проверка готовности БД
    if (!pool) {
        console.error('❌ Пул подключений не инициализирован');
        return res.status(503).json({ error: 'База данных не настроена. Обратитесь к администратору.' });
    }

    if (!dbReady) {
        console.log('⏳ База данных не готова, попытка переинициализации...');
        // Попытка переинициализации
        try {
            await initializeDatabase();
            if (!dbReady) {
                return res.status(503).json({ error: 'База данных не готова. Попробуйте позже.' });
            }
        } catch (error) {
            console.error('❌ Ошибка переинициализации:', error);
            return res.status(503).json({ error: 'База данных недоступна. Попробуйте позже.' });
        }
    }

    const { username, email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        if (!result.rows || result.rows.length === 0) {
            throw new Error('Не удалось создать пользователя');
        }

        const user = result.rows[0];

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('❌ Ошибка регистрации:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            constraint: error.constraint
        });

        if (error.code === '23505') { // UNIQUE violation
            if (error.constraint === 'users_username_key') {
                return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
            }
            if (error.constraint === 'users_email_key') {
                return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
            }
            return res.status(400).json({ error: 'Пользователь с таким именем или email уже существует' });
        }

        if (error.code === '23503') { // FOREIGN KEY violation
            return res.status(400).json({ error: 'Ошибка целостности данных' });
        }

        res.status(500).json({ 
            error: 'Ошибка при создании пользователя',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Вход пользователя
app.post('/api/login', [
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Проверка готовности БД
    if (!pool) {
        console.error('❌ Пул подключений не инициализирован');
        return res.status(503).json({ error: 'База данных не настроена. Обратитесь к администратору.' });
    }

    if (!dbReady) {
        console.log('⏳ База данных не готова, попытка переинициализации...');
        // Попытка переинициализации
        try {
            await initializeDatabase();
            if (!dbReady) {
                return res.status(503).json({ error: 'База данных не готова. Попробуйте позже.' });
            }
        } catch (error) {
            console.error('❌ Ошибка переинициализации:', error);
            return res.status(503).json({ error: 'База данных недоступна. Попробуйте позже.' });
        }
    }

    const { email, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('❌ Ошибка входа:', {
            message: error.message,
            code: error.code
        });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить все отзывы
app.get('/api/reviews', async (req, res) => {
    // Проверка готовности БД
    if (!pool) {
        console.error('❌ Пул подключений не инициализирован');
        return res.status(503).json({ error: 'База данных не настроена. Обратитесь к администратору.' });
    }

    if (!dbReady) {
        console.log('⏳ База данных не готова, попытка переинициализации...');
        // Попытка переинициализации
        try {
            await initializeDatabase();
            if (!dbReady) {
                return res.status(503).json({ error: 'База данных не готова. Попробуйте позже.' });
            }
        } catch (error) {
            console.error('❌ Ошибка переинициализации:', error);
            return res.status(503).json({ error: 'База данных недоступна. Попробуйте позже.' });
        }
    }

    try {
        const result = await pool.query(
            'SELECT * FROM reviews ORDER BY created_at DESC'
        );
        res.json(result.rows || []);
    } catch (error) {
        console.error('❌ Ошибка получения отзывов:', {
            message: error.message,
            code: error.code
        });
        res.status(500).json({ error: 'Ошибка при получении отзывов' });
    }
});

// Создать отзыв
app.post('/api/reviews', authenticateToken, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Рейтинг должен быть от 1 до 5'),
    body('comment').trim().isLength({ min: 10 }).withMessage('Комментарий должен содержать минимум 10 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Проверка готовности БД
    if (!pool) {
        console.error('❌ Пул подключений не инициализирован');
        return res.status(503).json({ error: 'База данных не настроена. Обратитесь к администратору.' });
    }

    if (!dbReady) {
        console.log('⏳ База данных не готова, попытка переинициализации...');
        // Попытка переинициализации
        try {
            await initializeDatabase();
            if (!dbReady) {
                return res.status(503).json({ error: 'База данных не готова. Попробуйте позже.' });
            }
        } catch (error) {
            console.error('❌ Ошибка переинициализации:', error);
            return res.status(503).json({ error: 'База данных недоступна. Попробуйте позже.' });
        }
    }

    const { rating, comment } = req.body;
    const { id: user_id, username } = req.user;

    try {
        const result = await pool.query(
            'INSERT INTO reviews (user_id, username, rating, comment) VALUES ($1, $2, $3, $4) RETURNING id, user_id, username, rating, comment, created_at',
            [user_id, username, rating, comment]
        );

        if (!result.rows || result.rows.length === 0) {
            throw new Error('Не удалось создать отзыв');
        }

        res.status(201).json({
            message: 'Отзыв успешно добавлен',
            review: result.rows[0]
        });
    } catch (error) {
        console.error('❌ Ошибка создания отзыва:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({ error: 'Ошибка при создании отзыва' });
    }
});

// Получить информацию о текущем пользователе
app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// Запуск сервера теперь происходит в startServer()

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    await pool.end();
    console.log('✅ Соединение с базой данных закрыто.');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Завершение работы сервера...');
    await pool.end();
    console.log('✅ Соединение с базой данных закрыто.');
    process.exit(0);
});
