# 🗄️ Руководство по подключению Neon PostgreSQL к Render

## 📋 Пошаговая инструкция

### Шаг 1: Создание базы данных в Neon

1. **Зарегистрируйтесь/войдите в Neon**
   - Перейдите на https://neon.tech
   - Войдите или создайте аккаунт

2. **Создайте новый проект**
   - Нажмите "Create Project"
   - Выберите регион (ближайший к вашему серверу)
   - Выберите PostgreSQL версию (рекомендуется 15 или 16)
   - Нажмите "Create Project"

3. **Получите Connection String**
   - После создания проекта откройте Dashboard
   - Найдите секцию "Connection Details"
   - Скопируйте **Connection String** (выглядит как: `postgresql://user:password@host/database?sslmode=require`)

### Шаг 2: Настройка переменных окружения на Render

1. **Откройте ваш сервис на Render**
   - Зайдите в Dashboard Render
   - Выберите ваш Web Service

2. **Добавьте переменные окружения**
   - Перейдите в раздел "Environment"
   - Добавьте следующие переменные:

   ```
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   JWT_SECRET=your-super-secret-key-change-this
   PORT=10000
   NODE_ENV=production
   ```

   ⚠️ **Важно**: Замените `DATABASE_URL` на ваш Connection String из Neon

3. **Сохраните изменения**
   - Нажмите "Save Changes"
   - Render автоматически перезапустит сервис

### Шаг 3: Обновление кода проекта

Код уже обновлен для работы с PostgreSQL! Просто убедитесь, что:

1. ✅ `package.json` содержит `pg` зависимость
2. ✅ `server.js` использует PostgreSQL вместо SQLite
3. ✅ SQL запросы адаптированы для PostgreSQL

### Шаг 4: Создание таблиц в Neon

Таблицы создадутся автоматически при первом запуске сервера, но вы также можете создать их вручную:

```sql
-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица отзывов
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
```

### Шаг 5: Проверка подключения

1. **Проверьте логи на Render**
   - Откройте "Logs" в вашем сервисе
   - Должно появиться сообщение: "✅ Подключение к PostgreSQL успешно установлено"

2. **Протестируйте API**
   - Попробуйте зарегистрировать пользователя
   - Проверьте, что отзывы загружаются

---

## 🔧 Миграция данных из SQLite (если нужно)

Если у вас уже есть данные в SQLite, выполните миграцию:

### Вариант 1: Через скрипт миграции

Создайте файл `backend/migrate.js`:

```javascript
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const sqliteDb = new sqlite3.Database('./database.db');

async function migrate() {
  try {
    // Миграция пользователей
    sqliteDb.all('SELECT * FROM users', [], async (err, users) => {
      if (err) throw err;
      
      for (const user of users) {
        await pgPool.query(
          'INSERT INTO users (id, username, email, password, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [user.id, user.username, user.email, user.password, user.created_at]
        );
      }
      
      console.log(`✅ Мигрировано ${users.length} пользователей`);
      
      // Миграция отзывов
      sqliteDb.all('SELECT * FROM reviews', [], async (err, reviews) => {
        if (err) throw err;
        
        for (const review of reviews) {
          await pgPool.query(
            'INSERT INTO reviews (id, user_id, username, rating, comment, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
            [review.id, review.user_id, review.username, review.rating, review.comment, review.created_at]
          );
        }
        
        console.log(`✅ Мигрировано ${reviews.length} отзывов`);
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Ошибка миграции:', error);
    process.exit(1);
  }
}

migrate();
```

Запустите:
```bash
cd backend
node migrate.js
```

---

## 🐛 Решение проблем

### Проблема: "Connection refused"
**Решение**: Проверьте, что Connection String правильный и включает `?sslmode=require`

### Проблема: "SSL required"
**Решение**: Убедитесь, что в Connection String есть `?sslmode=require`

### Проблема: "Table does not exist"
**Решение**: Запустите SQL скрипт создания таблиц вручную через Neon Dashboard

### Проблема: "Too many connections"
**Решение**: Neon имеет лимит подключений на бесплатном плане. Используйте connection pooling.

---

## 📊 Мониторинг базы данных

1. **Neon Dashboard**
   - Просмотр использования
   - Мониторинг запросов
   - Логи подключений

2. **Render Logs**
   - Проверка ошибок подключения
   - Мониторинг запросов к БД

---

## 🔒 Безопасность

1. ✅ **Никогда не коммитьте** Connection String в Git
2. ✅ Используйте переменные окружения
3. ✅ Регулярно обновляйте пароли
4. ✅ Используйте SSL подключение (`sslmode=require`)

---

## 📚 Полезные ссылки

- [Neon Documentation](https://neon.tech/docs)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [PostgreSQL Node.js Driver](https://node-postgres.com/)

---

**Готово!** Ваша база данных Neon теперь подключена к Render! 🎉

