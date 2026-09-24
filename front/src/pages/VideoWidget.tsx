import { useEffect, useRef, useState } from "react";
import { getVideoState, type VideoSnapshot } from "../services/video.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { loadYouTubeApi, type YTPlayer } from "../utils/youtube";
import { formatDuration } from "../utils/duration";
import { isPreviewMode } from "../utils/preview";
import styles from "./VideoWidget.module.css";

type Current = NonNullable<VideoSnapshot["current"]>;

// OBS Browser Source: เล่นคลิป YouTube จากโดเนทคลิป
// server เป็นคนคุมคิวและเวลา — หน้านี้แค่เล่นตามที่ได้รับ (เปิดหน้าใหม่กลางคลิปก็เล่นต่อจากจุดเดิม)
export default function VideoWidget() {
    const [preview] = useState(isPreviewMode);
    const [current, setCurrent] = useState<Current | null>(null);
    const [offset, setOffset] = useState(0); // เวลา server - เวลาเครื่องนี้ (ms)
    const [phase, setPhase] = useState<"idle" | "waiting" | "playing">("idle");
    const [ended, setEnded] = useState(false);
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<YTPlayer | null>(null);

    // พื้นหลังโปร่งใสสำหรับ OBS
    useEffect(() => {
        const prevBody = document.body.style.background;
        const prevHtml = document.documentElement.style.background;
        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.background = prevBody;
            document.documentElement.style.background = prevHtml;
            document.body.style.margin = "";
            document.body.style.overflow = "";
        };
    }, []);

    // รับสถานะจาก server
    useEffect(() => {
        if (preview) return;
        let cancelled = false;

        const apply = (snap: VideoSnapshot) => {
            if (cancelled) return;
            setOffset(new Date(snap.serverNow).getTime() - Date.now());
            setCurrent((prev) =>
                prev?.donationId === snap.current?.donationId && prev?.startsAt === snap.current?.startsAt
                    ? prev
                    : snap.current,
            );
        };
        const load = () => getVideoState().then((r) => apply(r.data)).catch(console.error);

        load();
        const interval = setInterval(load, 60000);
        const socket = acquireSocket();
        socket.on("videoUpdated", apply);
        socket.on("connect", load);

        return () => {
            cancelled = true;
            clearInterval(interval);
            socket.off("videoUpdated", apply);
            socket.off("connect", load);
            releaseSocket();
        };
    }, [preview]);

    // จัดจังหวะ: รอถึงเวลาเริ่ม → เล่น → หมดเวลา → ซ่อน
    useEffect(() => {
        setEnded(false);
        if (!current) {
            setPhase("idle");
            return;
        }

        const serverNow = () => Date.now() + offset;
        const startsAt = new Date(current.startsAt).getTime();
        const endsAt = new Date(current.endsAt).getTime();
        const timers: ReturnType<typeof setTimeout>[] = [];

        if (serverNow() >= endsAt) {
            setPhase("idle");
            return;
        }
        if (serverNow() < startsAt) {
            setPhase("waiting");
            timers.push(setTimeout(() => setPhase("playing"), startsAt - serverNow()));
        } else {
            setPhase("playing");
        }
        timers.push(setTimeout(() => setPhase("idle"), endsAt - serverNow()));

        return () => timers.forEach(clearTimeout);
    }, [current, offset]);

    // สร้าง YouTube player ตอนถึงเวลาเล่น
    useEffect(() => {
        if (phase !== "playing" || !current || !hostRef.current) return;
        let disposed = false;

        const elapsed = Math.max(0, Math.floor((Date.now() + offset - new Date(current.startsAt).getTime()) / 1000));
        const from = current.start + elapsed;
        const to = current.start + current.seconds;

        const mount = document.createElement("div");
        hostRef.current.appendChild(mount);

        loadYouTubeApi()
            .then((YT) => {
                if (disposed) return;
                playerRef.current = new YT.Player(mount, {
                    videoId: current.videoId,
                    width: "100%",
                    height: "100%",
                    playerVars: {
                        autoplay: 1,
                        start: from,
                        end: to,
                        controls: 0,
                        disablekb: 1,
                        fs: 0,
                        rel: 0,
                        modestbranding: 1,
                        iv_load_policy: 3,
                        playsinline: 1,
                    },
                    events: {
                        onReady: (e) => {
                            e.target.setVolume(100);
                            e.target.playVideo();
                        },
                        // คลิปสั้นกว่าเวลาที่ซื้อ → ซ่อนเลยเมื่อคลิปจบ
                        onStateChange: (e) => {
                            if (e.data === YT.PlayerState.ENDED) setEnded(true);
                        },
                        onError: () => setEnded(true),
                    },
                });
            })
            .catch((err) => {
                console.error(err);
                setEnded(true);
            });

        return () => {
            disposed = true;
            try {
                playerRef.current?.destroy();
            } catch {
                // ignore
            }
            playerRef.current = null;
            mount.remove();
        };
    }, [phase, current, offset]);

    // ---------- พรีวิวในหน้าแอดมิน: กรอบตัวอย่าง ไม่เล่นคลิปจริง ----------
    if (preview) {
        return (
            <div className={styles.stage}>
                <div className={styles.frame}>
                    <div className={styles.placeholder}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <rect x="2" y="5" width="20" height="14" rx="3" />
                            <path d="M10 9l5 3-5 3z" fill="currentColor" />
                        </svg>
                        <span>คลิปจาก YouTube จะเล่นตรงนี้</span>
                    </div>
                </div>
                <div className={styles.caption}>
                    <b>ตัวอย่าง</b> ส่งคลิปนี้ · ฿100 · {formatDuration(60)}
                </div>
            </div>
        );
    }

    if (phase !== "playing" || !current || ended) return null;

    return (
        <div className={styles.stage}>
            <div className={styles.frame} ref={hostRef} />
            <div className={styles.caption}>
                <b>{current.name}</b> ส่งคลิปนี้ · ฿{current.amount.toLocaleString()}
                {current.title && <span className={styles.title}>{current.title}</span>}
            </div>
        </div>
    );
}
