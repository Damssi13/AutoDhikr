# AutoDhikr

Voice-first dhikr counter built with **Next.js**.
The app listens to a specified Dhikr and increments the counter when the Dhikr is recognized.

## Features

- Voice-based dhikr counting (Arabic)
- Arabic-only dhikr phrase validation
- Arabic text normalization for better matching (e.g. أ/إ/آ/ٱ → ا, ة/ه handling)
- Target presets (`33`, `99`, `100`) + custom target
- Persistent state with `localStorage` (count, target, phrase)
- Islamic-themed UI/background
- Rotating Ahadith or verses reminders on app entry
- Responsive mobile-friendly interface

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- Browser Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`)

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
