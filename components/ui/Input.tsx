import type { InputHTMLAttributes } from 'react';

export function Input({
  label,
  name,
  error,
  help,
  optional,
  className = '',
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  help?: string;
  optional?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  const id = `field-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13.5px] font-semibold text-[#171425]">
        {label}
        {optional && <span className="font-normal text-[#676480]"> · optional</span>}
      </label>
      <input
        id={id}
        name={name}
        className={`mt-1.5 block h-12 w-full rounded-[12px] bg-[#f8f7fb] px-4 text-[15px] text-[#171425] ring-1 transition-[box-shadow,background-color] duration-200 placeholder:text-[#9c9ab2] focus:bg-white focus:ring-2 focus:outline-none disabled:opacity-70 ${
          error ? 'ring-[#d93036] focus:ring-[#d93036]' : 'ring-[#e4e3f0] focus:ring-brand'
        }`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : help ? `${id}-help` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-absence" role="alert">
          {error}
        </p>
      )}
      {help && !error && (
        <p id={`${id}-help`} className="mt-1.5 text-[12px] text-muted">
          {help}
        </p>
      )}
    </div>
  );
}
