import './globals.css';

export const metadata = {
  title: 'Trendspotter — Find Winning YouTube Ads',
  description:
    'Discover trending YouTube videos and winning ad creatives for dropshipping and affiliate marketing.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
