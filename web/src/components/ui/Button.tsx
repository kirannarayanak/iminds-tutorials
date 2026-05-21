import React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   'bg-primary-600 hover:bg-primary-700 text-white shadow-sm',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost:     'hover:bg-gray-100 text-gray-700',
  outline:   'border border-gray-300 hover:bg-gray-50 text-gray-700',
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-base rounded-xl',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className
      )}
    >
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {!loading && icon}
      {children}
    </button>
  );
}
