// ดึง YouTube video id (11 ตัว) จากลิงก์รูปแบบต่าง ๆ
// รองรับ: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, /embed/, /live/, m.youtube.com
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
]);

export function parseYouTubeId(raw: string): string | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) return null;

    let id: string | null = null;
    if (url.hostname.toLowerCase() === 'youtu.be') {
        id = url.pathname.split('/')[1] ?? null;
    } else if (url.pathname === '/watch') {
        id = url.searchParams.get('v');
    } else {
        const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
        id = m?.[2] ?? null;
    }

    return id && ID_PATTERN.test(id) ? id : null;
}

// อ่านเวลาเริ่มจากลิงก์ (?t=90, ?t=1m30s, ?start=90) — ไม่มี = null
export function parseYouTubeStart(raw: string): number | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    const t = url.searchParams.get('t') ?? url.searchParams.get('start');
    if (!t) return null;
    if (/^\d+$/.test(t)) return Number(t);
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!m || !m[0]) return null;
    return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

// เช็คว่าคลิปมีจริงและอนุญาตให้ฝัง (embed) — ใช้ oEmbed ของ YouTube (ไม่ต้องใช้ API key)
// คืนชื่อคลิป หรือ null ถ้าไม่มี/ฝังไม่ได้/เป็นคลิปส่วนตัว
export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
    const target = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
    )}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
        const res = await fetch(target, { signal: controller.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as { title?: unknown };
        return typeof data.title === 'string' ? data.title.slice(0, 200) : '';
    } finally {
        clearTimeout(timeout);
    }
}
