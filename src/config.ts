// Конфигурация Supabase
// Замените эти значения на ваши реальные ключи
export const SUPABASE_CONFIG = {
  url: 'https://rirvelvlrfplayoucbrr.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnZlbHZscmZwbGF5b3VjYnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMTg0NDEsImV4cCI6MjA3MjY5NDQ0MX0.y4x6OfZWA-Ni6k8VhtgOd3UxmvNln8cQsDktiqvpIC4'
} as const;

// Конфигурация Тинькофф Оплаты
export const TINKOFF_CONFIG = {
  // Эти ключи нужно получить при регистрации в Тинькофф Оплате
  terminalKey: import.meta.env.VITE_TINKOFF_TERMINAL_KEY || 'DEMO_TERMINAL_KEY',
  password: import.meta.env.VITE_TINKOFF_PASSWORD || 'DEMO_PASSWORD',

  // URLs для callback
  successUrl: `${window.location.origin}/payment/success`,
  failUrl: `${window.location.origin}/payment/fail`,
  notificationUrl: `${window.location.origin}/api/payment/notification`,

  // Настройки платежа
  defaultCurrency: 'RUB',
  tax: 'none'
}

// Типы для оплаты
export interface PaymentData {
  amount: number; // Сумма в копейках
  description: string;
  customerKey: string;
  email: string;
  paymentMethod: 'sbp' | 'card';
}

export interface SubscriptionData {
  user_id: string;
  amount: number;
  payment_method: string;
  purchased_at: string;
  status: 'active' | 'expired' | 'cancelled';
}

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

