'use client';

// Redirect to the canonical /saved page
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DashboardSavedRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/saved'); }, [router]);
  return null;
}
