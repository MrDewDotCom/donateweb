// แปลงวินาที → "1 ชม. 30 นาที" / "1 hr 30 min" (ไว้แสดงให้คนอ่าน)
export function formatDuration(totalSec: number, lang: "th" | "en" = "th"): string {
    const sec = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    const parts: string[] = [];
    if (lang === "th") {
        if (h) parts.push(`${h} ชม.`);
        if (m) parts.push(`${m} นาที`);
        if (s || parts.length === 0) parts.push(`${s} วินาที`);
    } else {
        if (h) parts.push(`${h} hr`);
        if (m) parts.push(`${m} min`);
        if (s || parts.length === 0) parts.push(`${s} sec`);
    }
    return parts.join(" ");
}

// แปลงวินาที → "1:05:09" หรือ "05:09" (แบบนาฬิกา สำหรับ overlay)
export function formatClock(totalSec: number): string {
    const sec = Math.max(0, Math.floor(totalSec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ต้องตรงกับ videoSecondsForAmount ฝั่ง backend (ปัดลง + จำกัดไม่เกิน maxSeconds)
export function videoSecondsForAmount(
    amount: number,
    rateAmount: number,
    rateSeconds: number,
    maxSeconds: number,
): number {
    if (!amount || rateAmount <= 0 || rateSeconds <= 0) return 0;
    const raw = Math.floor((amount * rateSeconds) / rateAmount);
    return maxSeconds > 0 ? Math.min(raw, maxSeconds) : raw;
}

// ต้องตรงกับ secondsForAmount ฝั่ง backend (ปัดลง)
export function secondsForAmount(amount: number, rateAmount: number, rateMinutes: number): number {
    if (!amount || rateAmount <= 0 || rateMinutes <= 0) return 0;
    return Math.floor((amount * rateMinutes * 60) / rateAmount);
}
