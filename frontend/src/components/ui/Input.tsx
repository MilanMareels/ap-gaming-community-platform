import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const inputBase = 'w-full bg-slate-950 border rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-red-500/20 transition-colors';
const inputNormal = 'border-slate-700 focus:border-red-500';
const inputError = 'border-red-500/50 focus:border-red-500';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';
const labelErrorClass = 'block text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-1.5';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        {label && (
          <label className={error ? labelErrorClass : labelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${inputBase} ${error ? inputError : inputNormal} ${className}`}
          {...props}
        />
        {error && <p className='text-xs text-red-400 mt-1'>{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        {label && (
          <label className={error ? labelErrorClass : labelClass}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`${inputBase} ${error ? inputError : inputNormal} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className='text-xs text-red-400 mt-1'>{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        {label && (
          <label className={error ? labelErrorClass : labelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`${inputBase} ${error ? inputError : inputNormal} resize-y ${className}`}
          {...props}
        />
        {error && <p className='text-xs text-red-400 mt-1'>{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
