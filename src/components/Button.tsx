import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'logout';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  className?: string;
  id?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  className = '',
  id,
  type = 'button'
}) => {
  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'primary-btn',
    secondary: 'secondary-btn',
    logout: 'logout-btn'
  };
  const sizeClasses = {
    small: 'small-btn',
    medium: '',
    large: ''
  };

  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      id={id}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
