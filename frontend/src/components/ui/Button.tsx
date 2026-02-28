import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', className = '', children, ...props },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20',
      secondary:
        'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
      danger:
        'bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900',
      success:
        'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20',
      ghost: 'bg-transparent hover:bg-white/5 text-gray-300 hover:text-white',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs gap-1',
      md: 'px-6 py-3 text-sm gap-2',
      lg: 'px-8 py-4 text-base gap-3',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
