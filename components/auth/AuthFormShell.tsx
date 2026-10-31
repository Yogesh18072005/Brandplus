import { type ReactNode } from 'react';

export function AuthFormShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-9">
        <h1 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold tracking-tight text-content">
          {title}
        </h1>
        <p className="mt-2 text-[16px] leading-relaxed text-secondary">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
