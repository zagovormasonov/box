import type { User } from '@supabase/supabase-js';

export interface TestQuestion {
  question: string;
  answers: string[];
}

export interface QuestionResult {
  question: string;
  answer: string;
  questionIndex: number;
}

export interface TestResult {
  id?: string;
  user_id: string;
  results: QuestionResult[];
  completed_at: string;
}

export interface AppState {
  currentScreen: 'welcome' | 'test' | 'auth' | 'results' | 'dashboard' | 'shared-results';
  currentQuestionIndex: number;
  userAnswers: number[];
  currentUser: User | null;
  shareId?: string; // ID для поделиться результатами
  sharedResults?: any; // Результаты другого пользователя для просмотра
}

export type ScreenType = AppState['currentScreen'];
