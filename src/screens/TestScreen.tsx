import React from 'react';
import { Button, ProgressBar } from '../components';
import { TestQuestion } from '../types';

interface TestScreenProps {
  questions: TestQuestion[];
  currentQuestionIndex: number;
  userAnswers: (number | undefined)[];
  onAnswerSelect: (questionIndex: number, answerIndex: number) => void;
  onNextQuestion: () => void;
  onPrevQuestion: () => void;
  onLogin?: () => void;
  isLoggedIn: boolean;
}

const TestScreen: React.FC<TestScreenProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  onAnswerSelect,
  onNextQuestion,
  onPrevQuestion,
  onLogin,
  isLoggedIn
}) => {
  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = userAnswers[currentQuestionIndex];
  const isAnswered = selectedAnswer !== undefined;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleAnswerClick = (answerIndex: number) => {
    onAnswerSelect(currentQuestionIndex, answerIndex);
  };

  if (!currentQuestion) {
    return <div>Загрузка...</div>;
  }

  return (
    <div id="test-screen" className="screen">
      {!isLoggedIn && onLogin && (
        <div className="auth-header">
          <Button
            id="test-login-btn"
            variant="secondary"
            size="small"
            onClick={onLogin}
          >
            Войти
          </Button>
        </div>
      )}
      <div className="test-content">
        <ProgressBar
          currentStep={currentQuestionIndex + 1}
          totalSteps={questions.length}
        />

        <div id="question-container">
          <h3 id="question-text" className={!isAnswered ? 'unanswered' : ''}>
            {currentQuestion.question}
          </h3>
          <div id="answers-container">
            {currentQuestion.answers.map((answer, index) => (
              <div
                key={index}
                className={`answer-option ${selectedAnswer === index ? 'selected' : ''}`}
                onClick={() => handleAnswerClick(index)}
              >
                {answer}
              </div>
            ))}
          </div>
        </div>

        <div className="test-controls">
          <Button
            id="prev-btn"
            variant="secondary"
            onClick={onPrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            Назад
          </Button>
          <Button
            id="next-btn"
            variant="primary"
            onClick={onNextQuestion}
            disabled={!isAnswered}
          >
            {isLastQuestion ? 'Завершить' : 'Далее'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestScreen;
