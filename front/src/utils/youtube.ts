// ดึง YouTube video id จากลิงก์ (ต้องตรงกับ parseYouTubeId ฝั่ง backend)
const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

export function parseYouTubeId(raw: string): string | null {
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    const host = url.hostname.toLowerCase();
    if (!HOSTS.has(host)) return null;

    const id =
        host === "youtu.be"
            ? url.pathname.split("/")[1] ?? null
            : url.pathname === "/watch"
                ? url.searchParams.get("v")
                : url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/)?.[2] ?? null;

    return id && ID_PATTERN.test(id) ? id : null;
}

// "1:30" / "90" → 90 วินาที, ว่าง → 0, รูปแบบผิด → null
export function parseTimestamp(raw: string): number | null {
    const v = raw.trim();
    if (!v) return 0;
    if (/^\d+$/.test(v)) return Number(v);
    const parts = v.split(":");
    if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
    return parts.reduce((sum, p) => sum * 60 + Number(p), 0);
}

export const youTubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

// ---------- โหลด YouTube IFrame Player API ครั้งเดียว ----------
export interface YTPlayer {
    playVideo(): void;
    destroy(): void;
    setVolume(v: number): void;
}

interface YTNamespace {
    Player: new (
        el: HTMLElement,
        opts: {
            videoId: string;
            width?: string | number;
            height?: string | number;
            playerVars?: Record<string, string | number>;
            events?: {
                onReady?: (e: { target: YTPlayer }) => void;
                onStateChange?: (e: { data: number; target: YTPlayer }) => void;
                onError?: (e: { data: number }) => void;
            };
        },
    ) => YTPlayer;
    PlayerState: { ENDED: number };
}

declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
        };
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        script.onerror = () => {
            apiPromise = null;
            reject(new Error("โหลด YouTube player ไม่สำเร็จ"));
        };
        document.head.appendChild(script);
    });
    return apiPromise;
}
