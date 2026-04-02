export const SENTENCES = [
  "إن أحب الكلام إلى الله: سبحان الله وبحمده",
  "مثل الذي يذكر ربه والذي لا يذكره، مثل الحي والميت",
  "لا يزال لسانك رطباً من ذكر اللَّه",
  "من قال: سبحان الله العظيم وبحمده، غرست له نخلة في الجنة",
  "قال تعالى: ألا بذكر الله تطمئن القلوب",
  "سبق المفردون؛ الذاكرون الله كثيراً، والذاكرات",
] as const;

export function pickRandomSentence() {
  const index = Math.floor(Math.random() * SENTENCES.length);
  return SENTENCES[index];
}
