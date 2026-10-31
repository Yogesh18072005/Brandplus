'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export function MobileAuditBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const audit = document.getElementById('audit');
      if (!audit) {
        setVisible(window.scrollY > 400);
        return;
      }
      const rect = audit.getBoundingClientRect();
      setVisible(window.scrollY > 320 && rect.top > window.innerHeight * 0.5);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-paper/95 p-3 backdrop-blur-xl sm:hidden print:hidden">
      <Link
        href="#audit"
        className="btn-primary flex h-12 w-full items-center justify-center rounded-full text-[15px] font-semibold no-underline"
      >
        Get free audit
      </Link>
    </div>
  );
}
