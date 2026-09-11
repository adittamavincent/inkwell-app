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

const variantStyles: Record<IconButtonVariant, string> = {
  default:
    'text-ink-muted hover:text-ink-text hover:bg-ink-hover/80 active:bg-ink-panel border border-transparent',
  ghost:
    'text-ink-muted hover:text-ink-text hover:bg-ink-hover/50 active:bg-ink-panel/60 border border-transparent',
  bordered:
    'text-ink-muted hover:text-ink-text bg-ink-card/50 hover:bg-ink-hover border border-ink-border active:bg-ink-panel',
  primary:
    'text-ink-accent-light hover:text-white bg-ink-accent/15 hover:bg-ink-accent/30 border border-ink-accent/30 active:bg-ink-accent/40',
  active:
    'text-white bg-ink-accent hover:bg-ink-accent-hover border border-ink-accent-light/40 shadow-subtle',
  danger:
    'text-ink-muted hover:text-ink-danger hover:bg-ink-danger-muted/30 border border-transparent hover:border-ink-danger/30 active:bg-ink-danger-muted/50',
  success:
    'text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-800/30 active:bg-emerald-900/40',
  warning:
    'text-amber-400 hover:text-amber-300 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-800/30 active:bg-amber-900/40',
};

const sizeStyles: Record<IconButtonSize, { button: string; icon: string }> = {
  sm: { button: 'p-1 rounded text-xs', icon: 'w-3.5 h-3.5' },
  md: { button: 'p-1.5 rounded-md text-xs', icon: 'w-4 h-4' },
  lg: { button: 'p-2 rounded-lg text-sm', icon: 'w-5 h-5' },
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon: IconComponent,
  title,
  variant = 'default',
  size = 'md',
  active = false,
  className = '',
  disabled,
  ...props
}) => {
  const currentVariant = active ? 'active' : variant;
  const sizeConfig = sizeStyles[size];

  const renderIcon = () => {
    if (React.isValidElement(IconComponent)) {
      return IconComponent;
    }
    const Icon = IconComponent as React.ComponentType<IconProps>;
    return <Icon className={sizeConfig.icon} />;
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink-accent-light/60 ${
        disabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
      } ${sizeConfig.button} ${variantStyles[currentVariant]} ${className}`}
      {...props}
    >
      {renderIcon()}
    </button>
  );
};
