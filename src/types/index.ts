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
  currentScreen: 'welcome' | 'test' | 'auth' | 'results' | 'dashboard';
  currentQuestionIndex: number;
  userAnswers: (number | undefined)[];
  currentUser: any;
}

export interface PaymentData {
  amount: number;
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
