# AutoDhikr

Voice-first dhikr counter built with **Next.js**.  
The app listens to a specified Arabic dhikr phrase and increments the counter when the phrase is recognized.

## Features

- 🎤 Voice-based dhikr counting (Arabic)
- 🔤 Arabic-only dhikr phrase validation
- 🧠 Arabic text normalization for better matching (e.g. أ/إ/آ/ٱ → ا, ة/ه handling)
- 🔢 Target presets (`33`, `99`, `100`) + custom target
- 💾 Persistent state with `localStorage` (count, target, phrase)
- 🖼️ Islamic-themed UI/background
- 📝 Rotating reminder sentences (random on app entry)
- 📱 Responsive mobile-friendly interface

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)

## Requirements

- Node.js 18+ (recommended)
- Modern browser with speech recognition support
  - Best experience: Chrome/Edge (especially on Android)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open:
   ```
   http://localhost:3000
   ```

## Production Build

```bash
npm run build
npm start
```

## Lint

```bash
npm run lint
```

## How Voice Counting Works

1. User enters a dhikr phrase in Arabic.
2. App starts speech recognition.
3. Recognized transcript is normalized (Arabic character normalization).
4. App compares transcript with the configured dhikr phrase.
5. Counter increments when a valid match is detected.
6. Duplicate filtering is applied to reduce overcounting on mobile speech engines.

## Notes About Accuracy

- Mobile speech recognition can behave differently from desktop.
- Speech APIs may produce repeated/merged chunks.
- The app includes normalization and duplicate protection, but exact 1:1 counting can still vary by device/browser/mic quality.

## Deployment (Vercel)

1. Push repo to GitHub.
2. Import the repo into [Vercel](https://vercel.com/).
3. Set production branch (usually `main`).
4. Deploy.

Every push to the production branch triggers automatic redeploy.

## Project Structure (simplified)

```text
app/
  layout.tsx
  page.tsx
components/
  Counter.tsx
  SentenceRotator.tsx
data/
  sentences.ts
public/
  mekha.jpeg
```