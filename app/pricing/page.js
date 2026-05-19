'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import UpgradeButton from '@/components/UpgradeButton';

export const dynamic = 'force-dynamic';

const FREE_FEATURES = [
  'Daily trending feed (top 50 videos)',
  'Trending Score algorithm',
  'AI trend summary',
  'Save up to 5 videos',
  'Search & sort by score / date',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited saved videos',
  '30-day trend history',
  'Download CSV export',
  'Priority support',
  'Early access to new features',
];

export default function PricingPage() {
  const supabase = createBrowserClient();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUser(user);
      supabase.from('profiles').select('plan').eq('id', user.id).single()
        .then(({ data }) => setProfile(data));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPro = profile?.plan === 'pro';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} plan={profile?.plan} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold mb-3">Simple Pricing</h1>
          <p className="text-gray-400 text-lg">
            Start free. Upgrade when you&apos;re ready to go deeper.
          </p>
          {isPro && (
            <p className="mt-4 text-green-400 font-medium">
              ⚡ You&apos;re already on Pro — enjoy unlimited access!
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="card flex flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold">Free</h2>
              <p className="text-4xl font-extrabold mt-2">
                $0<span className="text-gray-500 text-base font-normal">/mo</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">No credit card required</p>
            </div>
            <ul className="flex flex-col gap-2 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-400 mt-0.5 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            {user ? (
              <Link href="/dashboard" className="btn-secondary w-full text-center py-3">
                Go to Dashboard
              </Link>
            ) : (
              <Link href="/login" className="btn-secondary w-full text-center py-3">
                Get Started Free
              </Link>
            )}
          </div>

          {/* Pro */}
          <div className="card border-blue-700 bg-blue-950/20 flex flex-col gap-4 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              POPULAR
            </div>
            <div>
              <h2 className="text-2xl font-bold text-blue-300">Pro</h2>
              <p className="text-4xl font-extrabold mt-2">
                $19<span className="text-gray-500 text-base font-normal">/mo</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">Cancel anytime · MoMo card accepted</p>
            </div>
            <ul className="flex flex-col gap-2 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-blue-400 mt-0.5 shrink-0">⚡</span>{f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="w-full py-3 text-center bg-green-900/30 border border-green-700 rounded-lg text-green-300 font-medium text-sm">
                ✓ You&apos;re on Pro
              </div>
            ) : user ? (
              <UpgradeButton />
            ) : (
              <Link href="/login" className="btn-primary w-full text-center py-3 font-semibold">
                Sign up to Upgrade
              </Link>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-center">FAQ</h2>
          <div className="flex flex-col gap-4">
            {[
              {
                q: 'How does the trending score work?',
                a: 'Formula: (views × 0.5) + (likes × 2) + (comments × 5). Comments are weighted highest — they signal the strongest engagement.',
              },
              {
                q: 'How often is the data updated?',
                a: 'The pipeline runs once daily via GitHub Actions at 06:00 UTC, fetching the top 50 trending YouTube videos in the US.',
              },
              {
                q: 'What payment methods are accepted?',
                a: 'We use Supertab, which supports MoMo virtual card, credit/debit cards, and other local payment methods. No monthly fee until KYC.',
              },
              {
                q: 'Can I cancel my Pro subscription?',
                a: 'Yes, cancel anytime. You keep Pro access until the end of your billing period.',
              },
              {
                q: 'What is the CSV export?',
                a: 'Pro users can download a CSV of all trending videos from the last 30 days — great for building product research spreadsheets.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="card">
                <h3 className="font-semibold mb-1">{q}</h3>
                <p className="text-gray-400 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
