import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        {label && (
          <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-slate-950 border ${
            error ? 'border-red-500' : 'border-slate-700'
          } rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors ${className}`}
          {...props}
        />
        {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className='w-full'>
        {label && (
          <label className='block text-xs font-bold text-gray-500 uppercase mb-1'>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-slate-950 border ${
            error ? 'border-red-500' : 'border-slate-700'
          } rounded-xl p-3 text-white outline-none focus:border-red-500 transition-colors ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
