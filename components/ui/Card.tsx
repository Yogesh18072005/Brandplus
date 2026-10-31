import type { ReactNode, HTMLAttributes } from 'react';

export function Card({
  children,
  variant = 'raised',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'raised' | 'inset';
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const styles = {
    raised: 'bg-white ring-1 ring-[#e9e8f2] shadow-[0_30px_60px_-45px_rgb(20_40_80/0.35)]',
    inset: 'bg-[#f8f7fb] ring-1 ring-[#eeeef5]',
  };

  return (
    <div className={`rounded-[16px] p-6 ${styles[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
