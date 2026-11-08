import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:bg-blue-700',
    secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
