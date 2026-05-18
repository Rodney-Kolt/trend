import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-blue-400">📈 Trendspotter</span>
        <div className="flex gap-3">
          <Link href="/pricing" className="btn-secondary text-sm">
            Pricing
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-6">
        <span className="text-sm font-medium bg-blue-900/40 text-blue-300 border border-blue-800 px-3 py-1 rounded-full">
          YouTube-First Trend Intelligence
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl">
          Find Winning Products Before{' '}
          <span className="text-blue-400">Everyone Else</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl">
          Trendspotter scans YouTube daily to surface the highest-trending videos
          and ad creatives — so you can spot winning products for dropshipping and
          affiliate marketing.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <Link href="/login" className="btn-primary px-6 py-3 text-base">
            Start for Free →
          </Link>
          <Link href="/pricing" className="btn-secondary px-6 py-3 text-base">
            See Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800 px-6 py-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🔥',
              title: 'Daily Trend Feed',
              desc: 'Top 50 trending YouTube videos refreshed every day, ranked by our Trending Score algorithm.',
            },
            {
              icon: '🤖',
              title: 'AI Summaries',
              desc: 'Get an AI-generated summary of what\'s trending today — no manual research needed.',
            },
            {
              icon: '📊',
              title: 'Pro History (30 days)',
              desc: 'Pro users get access to 30 days of trend history and CSV export for deeper analysis.',
            },
          ].map((f) => (
            <div key={f.title} className="card">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Trendspotter. Built for dropshippers &amp; affiliate marketers.
      </footer>
    </main>
  );
}
