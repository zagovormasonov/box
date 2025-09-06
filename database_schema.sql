-- Создание таблицы для хранения балансов пользователей
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  subscription_expires_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Создание таблицы для хранения записей платежей
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL, -- Сумма в копейках
  description TEXT NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tinkoff_payment_id VARCHAR(255),
  order_id VARCHAR(100) NOT NULL,

  UNIQUE(order_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_order_id ON payment_records(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_created_at ON payment_records(created_at);

-- Row Level Security (RLS) политики
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои записи
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment records" ON payment_records
  FOR SELECT USING (auth.uid() = user_id);

-- Пользователи могут вставлять свои собственные записи
CREATE POLICY "Users can insert own balance" ON user_balances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment records" ON payment_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять свои собственные записи
CREATE POLICY "Users can update own balance" ON user_balances
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can update own payment records" ON payment_records
  FOR UPDATE USING (auth.uid() = user_id);

-- Сервис может выполнять все операции (для системных задач)
CREATE POLICY "Service can manage balances" ON user_balances
  FOR ALL USING (true);

CREATE POLICY "Service can manage payment records" ON payment_records
  FOR ALL USING (true);

-- Создание таблицы для хранения результатов тестов
CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id VARCHAR(10) NOT NULL UNIQUE, -- Короткий ID для поделиться
  test_result JSONB NOT NULL, -- Результаты теста в JSON формате
  personality_type VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, share_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_share_id ON test_results(share_id);
CREATE INDEX IF NOT EXISTS idx_test_results_created_at ON test_results(created_at);

-- Row Level Security (RLS) политики
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои результаты
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

-- Все могут видеть результаты по share_id (для поделиться)
CREATE POLICY "Anyone can view shared test results" ON test_results
  FOR SELECT USING (true);

-- Пользователи могут вставлять свои собственные результаты
CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Пользователи могут обновлять свои собственные результаты
CREATE POLICY "Users can update own test results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);

-- Функция для автоматического обновления last_updated
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггер для автоматического обновления last_updated
CREATE TRIGGER update_user_balances_updated_at
  BEFORE UPDATE ON user_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
