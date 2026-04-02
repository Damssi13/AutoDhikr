import Counter from "@/components/Counter";
import SentenceRotator from "@/components/SentenceRotator";
import { pickRandomSentence } from "@/data/sentences";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default function Home() {
  const sentence = pickRandomSentence();

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8">
      <Image
        src="/kaaba.jpg"
        alt="Mekha background"
        fill
        priority
        className="object-cover"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/45 backdrop-blur-[0.5px]"
        aria-hidden
      />

      <main className="relative z-10 w-full max-w-xl space-y-5 text-center">
        <div className="space-y-3 rounded-3xl border border-amber-100/25 bg-black/20 p-5 shadow-xl shadow-black/20 backdrop-blur-lg">
          <h1 className="text-3xl font-bold tracking-tight text-amber-100">AutoDhikr</h1>
          <SentenceRotator sentence={sentence} />
        </div>
        <div className="flex justify-center">
          <Counter />
        </div>
      </main>
    </div>
  );
}
