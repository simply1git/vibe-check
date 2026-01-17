# Vibe Check - The Ultimate Party Game

A real-time social party game where you discover how well you *really* know your friends. Built with Next.js 14, Supabase, and Framer Motion.

## 🚀 Features

-   **Real-time Multiplayer**: Join groups instantly with a simple code.
-   **Zero-Knowledge Auth**: Secure PIN-based login (no emails/passwords).
-   **AI-Powered Questions**: Dynamic quizzes generated based on member profiles.
-   **Interactive UI**: Smooth animations, confetti, and haptic-style feedback.
-   **Leaderboards**: Live scoring with rank accents and bouncing crowns.

## 🛠️ Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **Database**: Supabase (PostgreSQL)
-   **Styling**: Tailwind CSS
-   **Animations**: Framer Motion
-   **Deployment**: Vercel

## 🌍 Hosting on Vercel (Recommended)

This project is optimized for Vercel. Follow these steps to go live:

### 1. Push to GitHub
Make sure your code is committed and pushed to a GitHub repository.

### 2. Create Project on Vercel
1.  Log in to [Vercel](https://vercel.com).
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your GitHub repository.

### 3. Configure Environment Variables
In the "Environment Variables" section of the deployment screen, add these two values from your `.env.local` file:

| Key | Value |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ylyqmjyxkjrqsbqwrras.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Copy your long key from .env.local)* |

### 4. Deploy
Click **"Deploy"**. Vercel will build your app and give you a live URL (e.g., `vibe-check.vercel.app`).

### 5. Production Database Setup
Ensure your Supabase database has the production schema applied:
1.  Go to Supabase Dashboard -> SQL Editor.
2.  Run the contents of `docs/schema.sql`.
3.  This applies security policies and creates the necessary tables.

## 🏃‍♂️ Local Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
