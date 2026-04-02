# Dhikr Counter

A simple dhikr counter app built with Next.js (App Router), React, TypeScript, and Tailwind CSS.

## Features

- One-tap count increment
- Reset and quick adjustments (`-1`, `+10`)
- Common targets (`33`, `99`, `100`) plus custom target
- Progress bar and remaining count
- Local storage persistence (count + target survive page refresh)

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start development server
- `npm run build` — build production app
- `npm run start` — run production server
- `npm run lint` — run ESLint

## Main Files

- `app/page.tsx` — homepage shell
- `components/Counter.tsx` — counter logic and UI
- `app/layout.tsx` — app metadata and root layout
