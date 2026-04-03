"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TARGET_OPTIONS = [33, 99, 100] as const;

type SpeechPace = "slow" | "normal" | "fast";

type MatchMode = "strict" | "balanced" | "lenient";

const PACE_OPTIONS: Array<{ value: SpeechPace; label: string }> = [
	{ value: "slow", label: "بطيء" },
	{ value: "normal", label: "متوسط" },
	{ value: "fast", label: "سريع" },
];

const PACE_SETTINGS: Record<SpeechPace, { duplicateMs: number; minGapMs: number; matchMode: MatchMode }> = {
	slow: { duplicateMs: 3200, minGapMs: 1250, matchMode: "strict" },
	normal: { duplicateMs: 1800, minGapMs: 650, matchMode: "balanced" },
	fast: { duplicateMs: 800, minGapMs: 260, matchMode: "lenient" },
};

type StoredState = {
	count: number;
	target: number;
	dhikr: string;
	pace: SpeechPace;
};

const STORAGE_KEY = "dhikr-counter-state";

const DEFAULT_DHIKR = "سبحان الله";

function isArabicText(value: string) {
	const trimmed = value.trim();
	return trimmed.length > 0 && /^[\p{Script=Arabic}\s]+$/u.test(trimmed);
}

function normalizeText(value: string) {
	return value
		.toLowerCase()
		.normalize("NFKC")
		.replace(/[أإآٱ]/g, "ا")
		.replace(/ى/g, "ي")
		.replace(/[\u064B-\u065F\u0670]/g, "")
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function splitWords(value: string) {
	return value.split(" ").filter(Boolean);
}

function levenshteinDistance(a: string, b: string) {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;

	const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	const curr = new Array<number>(b.length + 1);

	for (let i = 1; i <= a.length; i += 1) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
		}
		for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
	}

	return prev[b.length];
}

function isDhikrMatch(transcript: string, dhikr: string, mode: MatchMode) {
	const normalizedTranscript = normalizeText(transcript);
	const normalizedDhikr = normalizeText(dhikr);

	if (!normalizedTranscript || !normalizedDhikr) return false;
	if (normalizedTranscript === normalizedDhikr) return true;
	if (mode === "strict") return false;

	const transcriptWords = splitWords(normalizedTranscript);
	const dhikrWords = splitWords(normalizedDhikr);

	// Reject added or missing words (e.g., "سبحان الله وبحمده" when target is "سبحان الله")
	if (transcriptWords.length !== dhikrWords.length) return false;

	const distance = levenshteinDistance(normalizedTranscript, normalizedDhikr);
	const maxDistance =
		mode === "lenient"
			? normalizedDhikr.length <= 10
				? 2
				: 3
			: normalizedDhikr.length <= 10
				? 1
				: 2;
	return distance <= maxDistance;
}

function countMatches(text: string, phrase: string) {
	const normalizedText = normalizeText(text);
	const normalizedPhrase = normalizeText(phrase);

	if (!normalizedText || !normalizedPhrase) return 0;

	const haystack = ` ${normalizedText} `;
	const needle = ` ${normalizedPhrase} `;

	let total = 0;
	let start = 0;

	while (start < haystack.length) {
		const index = haystack.indexOf(needle, start);
		if (index === -1) break;
		total += 1;
		start = index + needle.length;
	}

	return total;
}

function getSpeechErrorMessage(error: string) {
	switch (error) {
		case "no-speech":
			return "";
		case "not-allowed":
			return "تم رفض إذن الميكروفون.";
		case "audio-capture":
			return "تعذّر الوصول إلى الميكروفون.";
		case "network":
			return "حدث خطأ في الشبكة أثناء التعرف على الصوت.";
		case "aborted":
			return "تم إيقاف التعرّف على الصوت.";
		default:
			return "حدث خطأ أثناء التعرّف على الصوت.";
	}
}

export default function Counter() {
	const [count, setCount] = useState(0);
	const [target, setTarget] = useState<number>(33);
	const [customTarget, setCustomTarget] = useState<string>("33");
	const [dhikr, setDhikr] = useState(DEFAULT_DHIKR);
	const [speechSupported, setSpeechSupported] = useState(true);
	const [isListening, setIsListening] = useState(false);
	const [speechError, setSpeechError] = useState<string>("");
	const [heardText, setHeardText] = useState("");
	const [speechPace, setSpeechPace] = useState<SpeechPace>("normal");
	const [isHydrated, setIsHydrated] = useState(false);
	const recognitionRef = useRef<SpeechRecognition | null>(null);
	const autoRestartRef = useRef(false);
	const dhikrRef = useRef(DEFAULT_DHIKR);
	const speechPaceRef = useRef<SpeechPace>("normal");
	const processedFinalIndexesRef = useRef<Set<number>>(new Set());
	const lastFinalTranscriptRef = useRef("");
	const lastFinalTranscriptAtRef = useRef(0);
	const lastAcceptedAtRef = useRef(0);

	useEffect(() => {
		dhikrRef.current = dhikr;
	}, [dhikr]);

	useEffect(() => {
		speechPaceRef.current = speechPace;
	}, [speechPace]);

	useEffect(() => {
		const win = window as Window & {
			SpeechRecognition?: new () => SpeechRecognition;
			webkitSpeechRecognition?: new () => SpeechRecognition;
		};

		const RecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;

		if (!RecognitionCtor) {
			setSpeechSupported(false);
			setSpeechError("التعرّف على الصوت غير مدعوم في هذا المتصفح.");
		}

		try {
			const raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				setIsHydrated(true);
			} else {
				const parsed = JSON.parse(raw) as Partial<StoredState>;

				if (typeof parsed.count === "number" && parsed.count >= 0) {
					setCount(parsed.count);
				}

				if (typeof parsed.target === "number" && parsed.target > 0) {
					setTarget(parsed.target);
					setCustomTarget(String(parsed.target));
				}

				if (typeof parsed.dhikr === "string" && parsed.dhikr.trim()) {
					if (isArabicText(parsed.dhikr)) {
						setDhikr(parsed.dhikr);
					} else {
						setDhikr(DEFAULT_DHIKR);
					}
				}

				if (parsed.pace === "slow" || parsed.pace === "normal" || parsed.pace === "fast") {
					setSpeechPace(parsed.pace);
				}

			}
		} catch {
			// ignore corrupted storage
		} finally {
			setIsHydrated(true);
		}

		if (!RecognitionCtor) return;

		const recognition = new RecognitionCtor();
		recognition.continuous = true;
		recognition.interimResults = true;
		recognition.lang = "ar-SA";

		recognition.onresult = (event) => {
			let incrementBy = 0;
			let displayText = "";
			const normalizedDhikr = normalizeText(dhikrRef.current);
			const pace = speechPaceRef.current;
			const paceSettings = PACE_SETTINGS[pace];

			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const result = event.results[i];
				const transcript = result[0]?.transcript ?? "";
				if (transcript.trim()) {
					displayText += `${transcript} `;
				}

				if (!result.isFinal) continue;

				if (processedFinalIndexesRef.current.has(i)) {
					continue;
				}
				processedFinalIndexesRef.current.add(i);

				const normalizedTranscript = normalizeText(transcript);
				if (!normalizedTranscript || !normalizedDhikr) continue;
				if (!isDhikrMatch(normalizedTranscript, normalizedDhikr, paceSettings.matchMode)) continue;

				const now = Date.now();
				const isRapidDuplicate =
					normalizedTranscript === lastFinalTranscriptRef.current &&
					now - lastFinalTranscriptAtRef.current < paceSettings.duplicateMs;
				if (isRapidDuplicate) continue;

				const isTooSoonAfterLastCount = now - lastAcceptedAtRef.current < paceSettings.minGapMs;
				if (isTooSoonAfterLastCount) continue;

				lastFinalTranscriptRef.current = normalizedTranscript;
				lastFinalTranscriptAtRef.current = now;
				lastAcceptedAtRef.current = now;

				incrementBy += 1;
			}

			if (incrementBy > 0) {
				setCount((value) => value + incrementBy);
			}

			setHeardText(displayText.trim());
		};

		recognition.onerror = (event) => {
			const message = getSpeechErrorMessage(event.error);
			if (message) {
				setSpeechError(message);
			}
		};

		recognition.onend = () => {
			setIsListening(false);
			processedFinalIndexesRef.current.clear();
			if (autoRestartRef.current) {
				try {
					recognition.start();
					setIsListening(true);
				} catch {
					autoRestartRef.current = false;
					setSpeechError("تعذّر إعادة بدء الاستماع. اضغط ابدأ مرة أخرى.");
				}
			}
		};

		recognitionRef.current = recognition;

		return () => {
			autoRestartRef.current = false;
			recognition.onresult = null;
			recognition.onerror = null;
			recognition.onend = null;
			recognition.stop();
			recognitionRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!isHydrated) return;

		const data: StoredState = { count, target, dhikr, pace: speechPace };
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}, [count, target, dhikr, speechPace, isHydrated]);

	const remaining = Math.max(target - count, 0);
	const progress = useMemo(() => {
		if (target <= 0) return 0;
		return Math.min((count / target) * 100, 100);
	}, [count, target]);

	const completed = count >= target;

	function applyCustomTarget() {
		const next = Number(customTarget);
		if (!Number.isFinite(next) || next < 1) return;
		setTarget(Math.floor(next));
	}

	function startListening() {
		if (!recognitionRef.current) {
			setSpeechError("التعرّف على الصوت غير متاح في هذا المتصفح.");
			return;
		}

		if (!dhikr.trim()) {
			setSpeechError("أدخل عبارة الذكر أولاً.");
			return;
		}

		if (!isArabicText(dhikr)) {
			setSpeechError("اكتب الذكر باللغة العربية فقط.");
			return;
		}

		setSpeechError("");
		setHeardText("");
		autoRestartRef.current = true;
		processedFinalIndexesRef.current.clear();
		lastFinalTranscriptRef.current = "";
		lastFinalTranscriptAtRef.current = 0;
		recognitionRef.current.lang = "ar-SA";

		try {
			recognitionRef.current.start();
			setIsListening(true);
		} catch {
			setSpeechError("تعذّر تشغيل الميكروفون. يرجى السماح بالوصول إلى الميكروفون ثم المحاولة مرة أخرى.");
		}
	}

	function stopListening() {
		autoRestartRef.current = false;
		recognitionRef.current?.stop();
		setIsListening(false);
	}

	return (
		<section className="w-full max-w-md rounded-3xl border border-amber-100/20 bg-stone-950/45 p-6 text-stone-100 shadow-2xl shadow-black/25 backdrop-blur-xl">
			<div className="mb-5 flex items-center justify-between">
				<h2 className="text-xl font-semibold text-amber-100">AutoDhikr</h2>
				<button
					type="button"
					onClick={() => setCount(0)}
					className="rounded-full border border-amber-100/20 bg-white/5 px-4 py-1.5 text-sm font-medium text-amber-50 transition hover:bg-white/15"
				>
					إعادة تعيين
				</button>
			</div>

			<div className="mb-5 rounded-2xl bg-gradient-to-br from-amber-400/16 via-amber-300/10 to-yellow-300/8 p-6 text-center ring-1 ring-amber-100/15">
				<p className="text-sm text-amber-100/70">العداد الحالي</p>
				<p className="text-5xl font-bold tracking-tight text-amber-100 tabular-nums">{count}</p>
			</div>

			<div className="mb-4 space-y-2 rounded-2xl border border-amber-100/15 bg-white/[0.03] p-4">
				<p className="text-sm font-medium">العد بالصوت</p>
				<div className="flex gap-2">
					<input
						type="text"
						value={dhikr}
						onChange={(event) => {
							const nextValue = event.target.value;
							setDhikr(nextValue);
							if (!nextValue.trim()) {
								setSpeechError("");
								return;
							}
							if (!isArabicText(nextValue)) {
								setSpeechError("اكتب الذكر باللغة العربية فقط.");
								return;
							}
							setSpeechError("");
						}}
						placeholder="أدخل عبارة الذكر (مثال: سبحان الله)"
						className="w-full rounded-xl border border-amber-100/20 bg-white/[0.06] px-3 py-2 text-right text-sm text-amber-50 placeholder:text-amber-100/55 outline-none ring-amber-300/80 focus:ring-2"
					/>
					{isListening ? (
						<button
							type="button"
							onClick={stopListening}
							className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
						>
							إيقاف
						</button>
					) : (
						<button
							type="button"
							onClick={startListening}
							disabled={!speechSupported}
							className="rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2 text-sm font-semibold text-stone-900 shadow-md shadow-amber-900/20 transition hover:from-amber-300 hover:to-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
						>
							ابدأ
						</button>
					)}
				</div>

				<p className="text-xs text-amber-100/70">
					{isListening ? "جاري الاستماع..." : "متوقف"}
				</p>
				<div className="flex items-center justify-between gap-2 rounded-xl border border-amber-100/10 bg-black/15 px-3 py-2">
					<p className="text-xs text-amber-100/80">سرعة الذكر</p>
					<div className="flex gap-1">
						{PACE_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setSpeechPace(option.value)}
								className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
									speechPace === option.value
										? "bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-900"
										: "border border-amber-100/20 bg-white/[0.05] text-amber-50 hover:bg-white/15"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</div>
				<p className="text-[11px] text-amber-100/60">
					فلترة التكرار: {PACE_SETTINGS[speechPace].duplicateMs}ms • أقل فاصل: {PACE_SETTINGS[speechPace].minGapMs}ms
				</p>
				{heardText ? (
					<p className="rounded-xl border border-amber-100/10 bg-black/20 px-3 py-2 text-xs leading-6 text-amber-50/85">
						<span className="font-medium text-amber-100">ما سمعه التطبيق:</span> {heardText}
					</p>
				) : null}
				{speechError ? <p className="text-xs text-red-300">{speechError}</p> : null}
			</div>

			<button
				type="button"
				onClick={() => setCount((value) => value + 1)}
				className="mb-4 w-full rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-300 px-4 py-4 text-lg font-semibold text-stone-900 shadow-lg shadow-amber-900/25 transition hover:from-amber-300 hover:via-yellow-200 hover:to-amber-200 active:scale-[0.99]"
			>
				اضغط للعد
			</button>

			<div className="mb-5 flex gap-2">
				<button
					type="button"
					onClick={() => setCount((value) => Math.max(value - 1, 0))}
					className="flex-1 rounded-xl border border-amber-100/20 bg-white/[0.05] px-3 py-2 text-sm font-medium transition hover:bg-white/15"
				>
					-1
				</button>
				<button
					type="button"
					onClick={() => setCount((value) => value + 10)}
					className="flex-1 rounded-xl border border-amber-100/20 bg-white/[0.05] px-3 py-2 text-sm font-medium transition hover:bg-white/15"
				>
					+10
				</button>
			</div>

			<div className="mb-4">
				<p className="mb-2 text-center text-sm font-medium">حدد هدفك</p>
				<div className="mb-2 flex justify-center gap-2">
					{TARGET_OPTIONS.map((value) => (
						<button
							key={value}
							type="button"
							onClick={() => {
								setTarget(value);
								setCustomTarget(String(value));
							}}
							className={`min-w-14 rounded-xl px-3 py-2 text-center text-sm font-medium transition ${
								value === target
									? "bg-gradient-to-r from-amber-400 to-yellow-300 text-stone-900 shadow-md shadow-amber-900/20"
									: "border border-amber-100/20 bg-white/[0.05] hover:bg-white/15"
							}`}
						>
							{value}
						</button>
					))}
				</div>

				<div className="flex gap-2">
					<input
						type="number"
						min={1}
						value={customTarget}
						onChange={(event) => setCustomTarget(event.target.value)}
						className="w-full rounded-xl border border-amber-100/20 bg-white/[0.06] px-3 py-2 text-sm outline-none ring-amber-300/80 focus:ring-2"
						placeholder="هدف مخصص"
					/>
					<button
						type="button"
						onClick={applyCustomTarget}
						className="rounded-xl border border-amber-100/20 bg-white/[0.05] px-4 py-2 text-sm font-medium transition hover:bg-white/15"
					>
						تعيين
					</button>
				</div>
			</div>

			<div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
				<div
					className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all"
					style={{ width: `${progress}%` }}
					aria-hidden
				/>
			</div>

			<p className="text-sm text-amber-50/90">
				{completed ? "لقد بلغت هدفك, بارك الله فيك" : `بقي ${remaining} للوصول إلى ${target}`}
			</p>
		</section>
	);
}
