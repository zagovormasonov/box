-- Создание таблицы test_results в Supabase
-- Выполните этот SQL в SQL Editor вашего проекта Supabase

CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_id VARCHAR(10) NOT NULL UNIQUE,
  test_result JSONB NOT NULL,
  personality_type VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_test_results_user_id ON test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_share_id ON test_results(share_id);

-- Row Level Security
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Users can view own test results" ON test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared test results" ON test_results
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own test results" ON test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results" ON test_results
  FOR UPDATE USING (auth.uid() = user_id);
