import React from 'react';
import { Button, ProgressBar } from '../components';

interface WelcomeScreenProps {
  onStartTest: () => void;
  onLogin?: () => void;
  isLoggedIn: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartTest,
  onLogin,
  isLoggedIn
}) => {
  return (
    <div id="welcome-screen" className="screen">
      {!isLoggedIn && onLogin && (
        <div className="auth-header">
          <Button
            id="welcome-login-btn"
            variant="secondary"
            size="small"
            onClick={onLogin}
          >
            Войти
          </Button>
        </div>
      )}
      <div className="welcome-content">
        <ProgressBar
          currentStep={0}
          totalSteps={1}
          className="welcome-progress"
        />
        <h2>Добро пожаловать!</h2>
        <p>Пройдите наш психологический тест для лучшего понимания себя</p>
        <Button
          id="start-test-btn"
          variant="primary"
          onClick={onStartTest}
        >
          Начать тест
        </Button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
