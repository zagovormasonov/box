import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import WelcomeScreen from './screens/WelcomeScreen';
import TestScreen from './screens/TestScreen';
import { SUPABASE_CONFIG } from './config';
import { AppState, TestQuestion } from './types';

// Создаем клиент Supabase
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

// Данные теста
const testQuestions: TestQuestion[] = [
  {
    question: "Как вы обычно реагируете на стрессовые ситуации?",
    answers: ["Анализирую проблему и ищу решение", "Делюсь переживаниями с близкими", "Занимаюсь спортом или хобби", "Избегаю думать об этом"]
  },
  {
    question: "Что для вас значит успех?",
    answers: ["Достижение поставленных целей", "Гармония в личной жизни", "Признание окружающих", "Внутреннее удовлетворение"]
  },
  {
    question: "Как вы принимаете важные решения?",
    answers: ["Взвешиваю все за и против рационально", "Доверяю интуиции", "Советуюсь с близкими", "Действую импульсивно"]
  },
  {
    question: "Что вас мотивирует больше всего?",
    answers: ["Желание развиваться и расти", "Забота о близких", "Финансовая стабильность", "Творческое самовыражение"]
  },
  {
    question: "Как вы относитесь к изменениям?",
    answers: ["Вижу в них возможности для роста", "Предпочитаю стабильность", "Адаптируюсь постепенно", "Люблю перемены"]
  }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentScreen: 'welcome',
    currentQuestionIndex: 0,
    userAnswers: [],
    currentUser: null
  });

  const [darkMode, setDarkMode] = useState(false);

  // Инициализация приложения
  useEffect(() => {
    checkAuthState();
    loadSavedState();
    loadTheme();

    // Применяем тему
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setState(prev => ({ ...prev, currentUser: session.user, currentScreen: 'dashboard' }));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  };

  const loadSavedState = () => {
    try {
      const savedState = localStorage.getItem('testAppState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          currentScreen: parsedState.currentScreen || 'welcome',
          currentQuestionIndex: parsedState.currentQuestionIndex || 0,
          userAnswers: parsedState.userAnswers || []
        }));
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  };

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('darkMode');
    setDarkMode(savedTheme === 'true');
  };

  const saveState = () => {
    try {
      const stateToSave = {
        currentScreen: state.currentScreen,
        currentQuestionIndex: state.currentQuestionIndex,
        userAnswers: state.userAnswers
      };
      localStorage.setItem('testAppState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  };

  // Обработчики событий
  const handleStartTest = () => {
    setState(prev => ({
      ...prev,
      currentScreen: 'test',
      currentQuestionIndex: 0,
      userAnswers: []
    }));
    saveState();
  };

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setState(prev => {
      const newAnswers = [...prev.userAnswers];
      newAnswers[questionIndex] = answerIndex;
      return { ...prev, userAnswers: newAnswers };
    });
    saveState();
  };

  const handleNextQuestion = () => {
    if (state.currentQuestionIndex < testQuestions.length - 1) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
      saveState();
    } else {
      // Завершаем тест
      setState(prev => ({ ...prev, currentScreen: 'results' }));
      saveState();
    }
  };

  const handlePrevQuestion = () => {
    if (state.currentQuestionIndex > 0) {
      setState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
      saveState();
    }
  };

  const handleLogin = () => {
    setState(prev => ({ ...prev, currentScreen: 'auth' }));
  };

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  // Рендерим соответствующий экран
  const renderCurrentScreen = () => {
    switch (state.currentScreen) {
      case 'welcome':
        return (
          <WelcomeScreen
            onStartTest={handleStartTest}
            onLogin={handleLogin}
            isLoggedIn={!!state.currentUser}
          />
        );
      case 'test':
        return (
          <TestScreen
            questions={testQuestions}
            currentQuestionIndex={state.currentQuestionIndex}
            userAnswers={state.userAnswers}
            onAnswerSelect={handleAnswerSelect}
            onNextQuestion={handleNextQuestion}
            onPrevQuestion={handlePrevQuestion}
            onLogin={handleLogin}
            isLoggedIn={!!state.currentUser}
          />
        );
      default:
        return (
          <WelcomeScreen
            onStartTest={handleStartTest}
            onLogin={handleLogin}
            isLoggedIn={!!state.currentUser}
          />
        );
    }
  };

  return (
    <div className="container">
      {renderCurrentScreen()}
    </div>
  );
};

export default App;
