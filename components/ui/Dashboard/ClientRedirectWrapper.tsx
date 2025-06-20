'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientRedirectWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      localStorage.setItem('hasVisited', 'true');
      router.replace('/pricing');
    } else {
      setReady(true);
    }
  }, []);

  // Only render children after confirming they should see this page
  return ready ? <>{children}</> : null;
}
