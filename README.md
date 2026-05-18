# 📈 Trendspotter

A YouTube-first trend intelligence platform for dropshippers and affiliate marketers. Discover trending products by analyzing the top 50 YouTube videos daily.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend & API | Next.js 15 (App Router) |
| Hosting | Vercel (Free Tier) |
| Database & Auth | Supabase (Free Tier) |
| Automation | GitHub Actions (Cron) |
| YouTube Data | YouTube Data API v3 + yt-dlp fallback |
| AI Summaries | DevToolBox API (free, no key) |
| Payments | Dodo Payments (commission-only) |

---

## Step-by-Step Setup

### 1. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and fill in the details.
3. Once the project is ready, go to **SQL Editor** in the left sidebar.
4. Open `supabase/schema.sql` from this repo, paste the entire contents, and click **Run**.
5. Go to **Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(keep this secret!)*

### 2. Get a YouTube Data API v3 Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**.
4. Search for **YouTube Data API v3** and click **Enable**.
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**.
6. Copy the key → `YOUTUBE_API_KEY`.
7. *(Optional but recommended)* Restrict the key to the YouTube Data API v3 only.

> **Quota note:** The free tier gives you 10,000 units/day. Fetching 50 trending videos costs ~1 unit. You have plenty of headroom.

### 3. Set Up Dodo Payments

1. Sign up at [dodopayments.com](https://dodopayments.com).
2. Create a product called **Trendspotter Pro** with a price of **$15/month**.
3. Copy the **Product ID** → `DODO_PRO_PRODUCT_ID`.
4. Go to **Settings → API Keys** and copy your key → `DODO_PAYMENTS_API_KEY`.
5. Go to **Settings → Webhooks**, add your webhook URL:
   ```
   https://your-app.vercel.app/api/webhook/dodo
   ```
6. Copy the **Webhook Secret** → `DODO_WEBHOOK_SECRET`.

### 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add all variables from `.env.example`:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `YOUTUBE_API_KEY` | Your YouTube API key |
   | `DODO_PAYMENTS_API_KEY` | Your Dodo Payments API key |
   | `DODO_WEBHOOK_SECRET` | Your Dodo webhook secret |
   | `DODO_PRO_PRODUCT_ID` | Your Dodo product ID |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

5. Click **Deploy**. Vercel will build and deploy automatically.

### 5. Configure GitHub Actions for Daily Scraping

1. In your GitHub repository, go to **Settings → Secrets and variables → Actions**.
2. Add the following **Repository Secrets**:
   - `YOUTUBE_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Go to **Actions** tab in your repo.
4. Find the **Daily YouTube Trends Scraper** workflow.
5. Click **Enable workflow** if it's disabled.
6. To test immediately, click **Run workflow** → **Run workflow**.

The workflow runs automatically every day at **06:00 UTC**.

---

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-username/trendspotter.git
cd trendspotter

# 2. Install Node dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env.local
# Edit .env.local with your actual values

# 4. Run the development server
npm run dev
# Open http://localhost:3000
```

### Running the Python Script Locally

```bash
# Install Python dependencies
pip install -r scripts/requirements.txt

# Set environment variables (or use a .env file with python-dotenv)
export YOUTUBE_API_KEY=your_key
export NEXT_PUBLIC_SUPABASE_URL=your_url
export SUPABASE_SERVICE_ROLE_KEY=your_key

# Run the pipeline
python scripts/youtube_trends.py
```

---

## Project Structure

```
trendspotter/
├── app/
│   ├── api/
│   │   ├── trends/route.js          # GET trending videos (paginated, cached)
│   │   ├── trends/history/route.js  # GET 30-day history (Pro only)
│   │   ├── saved-videos/route.js    # GET user's saved videos
│   │   ├── save-video/route.js      # POST save a video
│   │   ├── unsave-video/route.js    # POST unsave a video
│   │   ├── upgrade/route.js         # POST create Dodo checkout session
│   │   └── webhook/dodo/route.js    # POST handle payment webhook
│   ├── dashboard/
│   │   ├── page.js                  # Main trend feed
│   │   └── saved/page.js            # Saved videos list
│   ├── pricing/page.js              # Pricing page
│   ├── login/page.js                # Auth page (login + signup)
│   ├── layout.js
│   └── page.js                      # Landing page
├── components/
│   ├── VideoCard.js                 # Video card with thumbnail + stats
│   ├── AISummary.js                 # AI trend summary box
│   ├── SaveButton.js                # Save/unsave toggle button
│   └── UpgradeButton.js             # Dodo Payments upgrade CTA
├── lib/
│   ├── supabase.js                  # Browser, server, and admin clients
│   ├── dodo.js                      # Dodo Payments helpers
│   └── youtube.js                   # YouTube API helper + score formula
├── scripts/
│   ├── youtube_trends.py            # Daily pipeline (API + yt-dlp fallback)
│   └── requirements.txt
├── supabase/
│   └── schema.sql                   # Full DB schema with RLS policies
├── .github/workflows/
│   └── daily_scrape.yml             # GitHub Actions cron job
└── .env.example                     # Required environment variables
```

---

## Trending Score Formula

```
trending_score = (view_count × 0.5) + (like_count × 2) + (comment_count × 5)
```

Comments are weighted highest (5×) because they signal the strongest engagement and are harder to inflate than views.

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Daily trend feed | ✓ | ✓ |
| AI trend summary | ✓ | ✓ |
| Search & sort | ✓ | ✓ |
| Save videos | Up to 5 | Unlimited |
| 30-day history | ✗ | ✓ |
| CSV export | ✗ | ✓ |
| Price | $0 | $15/mo |

---

## Success Criteria

When deployed, the app will:

1. ✅ Run a daily cron job that populates the `trends` table with 50 videos
2. ✅ Allow users to sign up and browse the trending feed
3. ✅ Let free users save up to 5 videos, with a clear upgrade prompt at the limit
4. ✅ Let Pro users save unlimited videos and export CSV
5. ✅ Process Dodo Payments webhooks to upgrade user plans automatically
