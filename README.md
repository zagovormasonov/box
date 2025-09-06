# Тестовое PWA приложение

Простое Progressive Web App для прохождения теста с сохранением результатов в Supabase.

## Функциональность

- 📱 PWA (Progressive Web App)
- ✅ Адаптивный дизайн
- 🔐 Авторизация через Supabase (Email/Пароль + Google OAuth)
- 💾 Сохранение результатов теста
- 🎨 Современный UI с темной темой
- 📊 Прогресс-бары на всех экранах

## Технологии

- **Vite** - сборщик проекта
- **TypeScript** - типизация
- **Supabase** - база данных и авторизация
- **PWA** - прогрессивное веб-приложение

## Настройка

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка Supabase

1. Создайте проект в [Supabase](https://supabase.com)
2. Получите URL и анонимный ключ
3. Откройте файл `src/config.ts`
4. Замените placeholder значения:

```typescript
export const SUPABASE_CONFIG = {
  url: 'ВАШ_SUPABASE_URL',
  anonKey: 'ВАШ_SUPABASE_ANON_KEY'
} as const;
```

### 3. Настройка Google OAuth (опционально)

Для использования авторизации через Google:

1. Перейдите в **Authentication → Providers** в панели Supabase
2. Включите **Google** provider
3. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
4. Настройте OAuth 2.0 credentials:
   - **Authorized JavaScript origins**: `http://localhost:5174` (для разработки)
   - **Authorized redirect URIs** (добавьте все эти варианты):
     ```
     http://localhost:5174
     http://localhost:5174/auth/callback
     https://your-project.supabase.co/auth/v1/callback
     ```
5. Скопируйте **Client ID** и **Client Secret** в настройки Supabase
6. Добавьте URL вашего продакшена в authorized origins при развертывании

### 4. Создание таблицы в Supabase

Создайте таблицу `test_results` со следующей структурой:

```sql
CREATE TABLE test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включение RLS (Row Level Security)
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Политика для чтения собственных результатов
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

-- Политика для создания результатов
CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Запуск

### Режим разработки

```bash
npm run dev
```

### Сборка для продакшена

```bash
npm run build
```

### Предпросмотр сборки

```bash
npm run preview
```

## Структура проекта

```
src/
├── main.ts          # Точка входа
├── app.ts           # Основной класс приложения
├── supabase.ts      # Клиент Supabase
├── config.ts        # Конфигурация
├── types.ts         # TypeScript типы
└── style.css        # Стили

public/
├── icon.svg         # SVG иконка
├── icon-192.png     # Иконка 192x192
└── icon-512.png     # Иконка 512x512
```

## PWA возможности

- 📱 Установка на домашний экран
- 🔄 Автоматические обновления
- 📶 Работает оффлайн (базовый функционал)
- 🎯 Быстрая загрузка

## Использование

1. Откройте приложение в браузере
2. Нажмите "Пройти тест"
3. Ответьте на все вопросы
4. После завершения теста авторизуйтесь
5. Результаты будут сохранены в Supabase

## Разработка

Для работы с кодом:

- Все компоненты типизированы с TypeScript
- Используется модульная архитектура
- PWA настроен через vite-plugin-pwa
- Стили написаны с учетом мобильных устройств

## Deploy

Приложение можно развернуть на любом статическом хостинге:
- Vercel
- Netlify
- GitHub Pages
- Firebase Hosting
