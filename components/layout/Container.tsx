import type { ReactNode } from 'react';

type Width = 'reading' | 'operating' | 'comparing';

const widths: Record<Width, string> = {
  reading: 'max-w-[680px]',
  operating: 'max-w-[1120px]',
  comparing: 'max-w-[960px]',
};

export function Container({
  width = 'operating',
  children,
  className = '',
}: {
  width?: Width;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto px-4 ${widths[width]} ${className}`}>
      {children}
    </div>
  );
}
