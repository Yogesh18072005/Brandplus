import { type ReactNode } from 'react';

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  align?: 'center' | 'left';
  className?: string;
  size?: 'default' | 'large';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'center',
  className = '',
  size = 'default',
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'mx-auto max-w-[720px] text-center' : 'max-w-[560px] text-left';
  const titleSize =
    size === 'large'
      ? 'text-[clamp(2.25rem,5vw,3.5rem)]'
      : 'text-[clamp(1.75rem,3.5vw,2.75rem)]';

  return (
    <div className={`${alignClass} ${className}`}>
      <p className="text-[14px] font-medium text-signal">{eyebrow}</p>
      <h2 className={`mt-3 font-display ${titleSize} font-semibold leading-[1.08] tracking-tight text-content`}>
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-[17px] leading-[1.6] text-secondary">{description}</p>
      )}
    </div>
  );
}
