# CV Suite — Free Version (The Cache Group)

AI-powered career tools using Google Gemini. No user accounts required — users just visit the URL.

## Tools included
- Tailored CV
- Cover Letter
- Interview Prep (simplified — 5 behavioural Q&As + questions to ask)

## Setup

### 1. Get a free Google API key
Go to https://aistudio.google.com → API Keys → Create API key

### 2. Deploy to Vercel
1. Upload this folder to a GitHub repo (private)
2. Go to vercel.com → Add New Project → import your repo
3. Add environment variable: `GOOGLE_API_KEY` = your key
4. Deploy

### 3. Turn off Vercel login protection (IMPORTANT)
By default, Vercel requires visitors to log in. Turn this off:
- Go to your project in Vercel → Settings → Deployment Protection
- Set to **None** (or turn off Vercel Authentication)
- Save and redeploy

After this, anyone with the link can use the tool — no account needed.

### 4. Share the URL
Vercel gives you a URL like `cv-suite-free.vercel.app`. Share it freely.

## Rate limits (free Google tier)
- Gemini 2.0 Flash: ~1,500 requests/day, 15 requests/minute
- Sufficient for moderate use. If you hit limits, upgrade Google account to paid tier.

## Logo
Replace the "C" placeholder in `app/page.tsx` with your actual logo image.
Add your logo to the `public/` folder and use `<img src="/logo.png" />`.

## Notes
- Nothing users enter is stored — all processing is stateless
- Output downloads to the user's device as a .txt file
