import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const InputField = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id, ...rest }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-300">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={[
            'rounded-lg border bg-slate-900 px-3 py-2 text-sm text-white',
            'placeholder:text-slate-500 outline-none transition-colors',
            'focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
            error ? 'border-red-500/70' : 'border-slate-700',
          ].join(' ')}
          {...rest}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

InputField.displayName = 'InputField';

export default InputField;
