// Конфигурация Supabase
// Замените эти значения на ваши реальные ключи
export const SUPABASE_CONFIG = {
  url: 'https://rirvelvlrfplayoucbrr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnZlbHZscmZwbGF5b3VjYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTg0NDEsImV4cCI6MjA3MjY5NDQ0MX0.y4x6OfZWA-Ni6k8VhtgOd3UxmvNln8cQsDktiqvpIC4'
} as const;

// Типы для Supabase
export interface TestResult {
  id?: string;
  user_id: string;
  results: QuestionResult[];
  completed_at: string;
}

export interface QuestionResult {
  question: string;
  answer: string;
  questionIndex: number;
}

export interface TestQuestion {
  question: string;
  answers: string[];
}

