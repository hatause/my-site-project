# 📋 Подробный план разработки Next.js веб-сайта

## 🎯 Обзор проекта

Разработка современного веб-сайта на Next.js для оптимизации компьютеров с системой отзывов, аутентификацией пользователей и интеграцией контактов.

---

## 🔧 Этап 1: Устранение проблемы с бесконечной загрузкой отзывов

### Проблема
Функция отзывов приводит к бесконечной загрузке, несмотря на правильную работу регистрации.

### Возможные причины:
1. ❌ Отсутствие проверки статуса ответа (`response.ok`)
2. ❌ Некорректная обработка ошибок сети
3. ❌ Проблемы с CORS на production
4. ❌ Неправильный формат ответа от API
5. ❌ Отсутствие таймаута для запросов

### Решения:

#### ✅ Решение 1: Улучшенная обработка ошибок (УЖЕ РЕАЛИЗОВАНО)
```javascript
// Добавлена проверка response.ok
if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
}

// Проверка формата данных
if (!Array.isArray(reviews)) {
    throw new Error('Invalid response format');
}
```

#### ✅ Решение 2: Добавление таймаута запросов
```javascript
const fetchWithTimeout = (url, options, timeout = 10000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
};
```

#### ✅ Решение 3: Retry механизм
```javascript
async function loadReviewsWithRetry(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await loadReviews();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}
```

---

## 🗄️ Этап 2: Интеграция базы данных

### Выбор базы данных

#### Вариант 1: PostgreSQL (Рекомендуется для production)
**Преимущества:**
- ✅ Надежность и масштабируемость
- ✅ Отличная поддержка в Next.js
- ✅ Богатый функционал
- ✅ Бесплатные варианты (Supabase, Neon, Railway)

**Интеграция:**
```bash
npm install @prisma/client prisma
npm install pg
```

#### Вариант 2: MongoDB (Альтернатива)
**Преимущества:**
- ✅ Гибкая схема данных
- ✅ Простота использования
- ✅ MongoDB Atlas (бесплатный tier)

**Интеграция:**
```bash
npm install mongodb mongoose
```

#### Вариант 3: SQLite (Для текущего проекта)
**Преимущества:**
- ✅ Уже используется
- ✅ Не требует отдельного сервера
- ✅ Подходит для небольших проектов

### Структура базы данных

#### Таблица Users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Таблица Reviews
```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);
```

### Prisma Schema (для PostgreSQL)
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique @db.VarChar(50)
  email     String   @unique @db.VarChar(100)
  password  String   @db.VarChar(255)
  reviews   Review[]
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}

model Review {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  username  String   @db.VarChar(50)
  rating    Int
  comment   String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@index([createdAt(sort: Desc)])
  @@map("reviews")
}
```

### Настройка подключения к БД

#### Файл: `lib/db.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 📧 Этап 3: Интеграция контактов

### Компонент контактов

#### Файл: `components/ContactSection.tsx`
```typescript
'use client';

import { useState } from 'react';

export default function ContactSection() {
  const [copied, setCopied] = useState(false);

  const email = 'shuxaroot123@gmail.com';
  const telegram = '@decayoptimization';
  const telegramUrl = 'https://t.me/decayoptimization';

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <section className="contact-section">
      <div className="container">
        <h2>Связаться со мной</h2>
        
        <div className="contact-methods">
          {/* Email */}
          <div className="contact-item">
            <div className="contact-icon">📧</div>
            <div className="contact-info">
              <h3>Email</h3>
              <p>{email}</p>
              <button 
                onClick={copyEmail}
                className="btn-copy"
                aria-label="Скопировать email"
              >
                {copied ? '✓ Скопировано' : 'Копировать'}
              </button>
            </div>
          </div>

          {/* Telegram */}
          <div className="contact-item">
            <div className="contact-icon">💬</div>
            <div className="contact-info">
              <h3>Telegram</h3>
              <p>{telegram}</p>
              <a 
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-telegram"
              >
                Написать в Telegram →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Стили для контактов
```css
.contact-section {
  padding: 4rem 0;
  background: var(--bg-secondary);
}

.contact-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.contact-item {
  background: var(--bg-primary);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  display: flex;
  gap: 1.5rem;
  transition: all 0.3s ease;
}

.contact-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--black);
}

.contact-icon {
  font-size: 2.5rem;
  filter: grayscale(100%);
}

.contact-info h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.contact-info p {
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-family: 'Courier New', monospace;
}

.btn-copy,
.btn-telegram {
  padding: 0.75rem 1.5rem;
  border: 1.5px solid var(--black);
  border-radius: 6px;
  background: transparent;
  color: var(--black);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-copy:hover,
.btn-telegram:hover {
  background: var(--black);
  color: var(--white);
  transform: translateY(-2px);
}
```

---

## 🏗️ Этап 4: Структура Next.js проекта

### Инициализация проекта
```bash
npx create-next-app@latest pc-optimizer --typescript --tailwind --app --no-src-dir
cd pc-optimizer
```

### Структура папок
```
pc-optimizer/
├── app/
│   ├── layout.tsx              # Главный layout
│   ├── page.tsx                 # Главная страница
│   ├── reviews/
│   │   └── page.tsx            # Страница отзывов
│   ├── about/
│   │   └── page.tsx            # Страница "О себе"
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── login/
│   │   │       └── route.ts
│   │   └── reviews/
│   │       ├── route.ts        # GET, POST отзывов
│   │       └── [id]/
│   │           └── route.ts     # PUT, DELETE отзывов
│   └── globals.css
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ReviewCard.tsx
│   ├── ReviewForm.tsx
│   ├── ContactSection.tsx
│   ├── AuthModal.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── db.ts                   # Подключение к БД
│   ├── auth.ts                 # Функции аутентификации
│   ├── utils.ts                # Утилиты
│   └── validations.ts          # Валидация данных
├── types/
│   └── index.ts                # TypeScript типы
├── prisma/
│   └── schema.prisma           # Prisma схема
├── .env.local                  # Переменные окружения
├── .env.example
├── next.config.js
├── tsconfig.json
└── package.json
```

---

## 🔐 Этап 5: Безопасность

### 1. Аутентификация с NextAuth.js
```bash
npm install next-auth @auth/prisma-adapter
```

#### Файл: `app/api/auth/[...nextauth]/route.ts`
```typescript
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.username
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login'
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 2. Защита API роутов
```typescript
// lib/auth.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
```

### 3. Валидация данных
```typescript
// lib/validations.ts
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000)
});
```

### 4. Rate Limiting
```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s')
});
```

---

## 🎨 Этап 6: UI/UX Оптимизация

### 1. Loading States
```typescript
// components/ReviewList.tsx
'use client';

import { useState, useEffect } from 'react';
import ReviewCard from './ReviewCard';
import LoadingSpinner from './ui/LoadingSpinner';

export default function ReviewList() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reviews');
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="reviews-grid">
      {reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  );
}
```

### 2. Error Boundaries
```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="error-container">
      <h2>Что-то пошло не так</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Попробовать снова</button>
    </div>
  );
}
```

### 3. Оптимистичные обновления
```typescript
const handleSubmitReview = async (data) => {
  // Оптимистичное обновление
  const optimisticReview = {
    id: 'temp-' + Date.now(),
    ...data,
    username: user.name,
    createdAt: new Date()
  };
  setReviews(prev => [optimisticReview, ...prev]);

  try {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    const newReview = await res.json();
    // Заменяем временный отзыв на реальный
    setReviews(prev => 
      prev.map(r => r.id === optimisticReview.id ? newReview : r)
    );
  } catch (error) {
    // Откатываем изменения
    setReviews(prev => prev.filter(r => r.id !== optimisticReview.id));
    showError('Не удалось добавить отзыв');
  }
};
```

### 4. Skeleton Loading
```typescript
// components/ReviewSkeleton.tsx
export default function ReviewSkeleton() {
  return (
    <div className="review-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-avatar" />
        <div className="skeleton-text" />
      </div>
      <div className="skeleton-rating" />
      <div className="skeleton-comment" />
    </div>
  );
}
```

---

## 📦 Этап 7: Зависимости и настройки

### package.json
```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "next-auth": "^4.24.0",
    "@auth/prisma-adapter": "^1.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.0",
    "@upstash/ratelimit": "^0.1.0",
    "@upstash/redis": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/bcryptjs": "^2.4.6",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### .env.example
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pc_optimizer"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Production
NODE_ENV="production"
```

### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['sizizxc.me'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: 'https://sizizxc.me' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 🚀 Этап 8: Деплой

### Вариант 1: Vercel (Рекомендуется)
```bash
npm install -g vercel
vercel login
vercel
```

### Вариант 2: Railway
1. Подключить GitHub репозиторий
2. Настроить переменные окружения
3. Автоматический деплой

### Вариант 3: Docker
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

---

## ✅ Чеклист реализации

### Приоритет 1 (Критично)
- [ ] Устранение проблемы с бесконечной загрузкой отзывов
- [ ] Настройка базы данных (PostgreSQL)
- [ ] Миграция данных из SQLite
- [ ] Настройка аутентификации (NextAuth.js)
- [ ] Защита API роутов

### Приоритет 2 (Важно)
- [ ] Интеграция контактов (Email + Telegram)
- [ ] Валидация данных (Zod)
- [ ] Error handling и boundaries
- [ ] Loading states
- [ ] Rate limiting

### Приоритет 3 (Улучшения)
- [ ] Оптимистичные обновления
- [ ] Skeleton loading
- [ ] SEO оптимизация
- [ ] Аналитика
- [ ] Мониторинг ошибок (Sentry)

---

## 📝 Примечания

1. **Безопасность**: Всегда используйте HTTPS в production
2. **Валидация**: Валидируйте данные на клиенте и сервере
3. **Ошибки**: Логируйте ошибки, но не показывайте детали пользователям
4. **Производительность**: Используйте Next.js Image компонент для изображений
5. **Тестирование**: Напишите тесты для критичных функций

---

## 🔗 Полезные ресурсы

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Vercel Deployment](https://vercel.com/docs)

---

**Дата создания плана**: 2024
**Версия**: 1.0

