import React from 'react';
import { IconProps } from './Icons';

export type IconButtonVariant =
  | 'default'
  | 'primary'
  | 'danger'
  | 'ghost'
  | 'active'
  | 'success'
  | 'warning'
  | 'bordered';

export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ComponentType<IconProps> | React.ReactNode;
  title: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  title,
  variant = 'default',
  size = 'md',
  active = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const sizeConfig = {
    sm: {
      button: 'p-1.5 rounded-md text-xs',
      icon: 'w-3.5 h-3.5',
    },
    md: {
      button: 'p-2 rounded-md text-sm',
      icon: 'w-4 h-4',
    },
    lg: {
      button: 'p-2.5 rounded-lg text-base',
      icon: 'w-5 h-5',
    },
  }[size];

  const variantStyles: Record<IconButtonVariant, string> = {
    default:
      'bg-ink-card/80 hover:bg-ink-hover border border-ink-border/80 text-ink-muted hover:text-ink-text active:scale-[0.97]',
    primary:
      'bg-ink-accent hover:bg-ink-accent-hover text-white shadow-subtle active:scale-[0.97]',
    danger:
      'bg-ink-card/60 hover:bg-ink-danger-muted border border-ink-border/60 hover:border-ink-danger-border text-ink-muted hover:text-ink-danger active:scale-[0.97]',
    ghost:
      'bg-transparent hover:bg-ink-hover text-ink-muted hover:text-ink-text active:scale-[0.97]',
    active:
      'bg-ink-accent-muted border border-ink-accent/50 text-ink-accent-light active:scale-[0.97]',
    success:
      'bg-ink-success-muted border border-ink-success-border text-ink-success active:scale-[0.97]',
    warning:
      'bg-ink-warning-muted border border-ink-warning-border text-ink-warning active:scale-[0.97]',
    bordered:
      'bg-ink-panel border border-ink-border text-ink-text hover:border-ink-accent/40 active:scale-[0.97]',
  };

  const currentVariant = active ? 'active' : variant;

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    if (typeof icon === 'function' || typeof icon === 'object') {
      const IconComp = icon as React.ComponentType<IconProps>;
      return <IconComp className={sizeConfig.icon} />;
    }
    return null;
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`interactive-tap inline-flex items-center justify-center font-medium transition-colors focus-visible:ring-1 focus-visible:ring-ink-accent-light/60 ${
        disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
      } ${sizeConfig.button} ${variantStyles[currentVariant]} ${className}`}
      {...props}
    >
      {renderIcon()}
    </button>
  );
};
