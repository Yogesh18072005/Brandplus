import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[clamp(26px,2.6vw,34px)] leading-tight font-semibold tracking-[-0.03em] text-[#2c2a3a]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[15px] text-[#676480]">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
