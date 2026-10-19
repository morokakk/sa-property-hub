'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AuthHydrator from '@/components/AuthHydrator';
import HashScroller from '@/components/navigation/HashScroller';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Public tenant statement portal must render immediately with SSR,
  // bypassing mount spinner and avoiding landlord state hydrators.
  if (pathname?.startsWith('/statement')) {
    return <>{children}</>;
  }

  if (!hasMounted) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Initializing SA Property Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthHydrator />
      <HashScroller />
      {children}
    </>
  );
}
