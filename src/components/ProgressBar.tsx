import React, { useEffect, useRef } from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  className = ''
}) => {
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressBarRef.current) {
      const progressPercent = (currentStep / totalSteps) * 100;
      progressBarRef.current.style.width = `${progressPercent}%`;
    }
  }, [currentStep, totalSteps]);

  return (
    <div className={`progress-section ${className}`}>
      <div className="progress-bar-container">
        <div
          ref={progressBarRef}
          className="progress-bar"
          style={{ width: '0%' }}
        />
      </div>
      <div className="step-counter">
        Шаг {currentStep} из {totalSteps}
      </div>
    </div>
  );
};

export default ProgressBar;
