'use client';

import dynamic from 'next/dynamic';

// ssr: false is only allowed in Client Components
const DevToolbar = dynamic(
  () => import('@/components/DevToolbar').then((m) => ({ default: m.DevToolbar })),
  { ssr: false },
);

export function DevToolbarLoader() {
  return <DevToolbar />;
}
