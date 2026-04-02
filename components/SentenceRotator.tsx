type SentenceRotatorProps = {
  sentence: string;
};

export default function SentenceRotator({ sentence }: SentenceRotatorProps) {
  return (
    <div className="text-center text-amber-50">
      <p className="sentence-font text-2xl leading-[2.1] font-bold tracking-normal text-amber-50/95">{sentence}</p>
    </div>
  );
}
