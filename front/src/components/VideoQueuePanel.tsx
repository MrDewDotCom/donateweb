import { useEffect, useState } from "react";
import {
    getVideoState,
    removeQueuedVideo,
    skipVideo,
    type VideoSnapshot,
} from "../services/video.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { formatClock, formatDuration } from "../utils/duration";
import { youTubeThumb } from "../utils/youtube";
import styles from "../pages/Settings.module.css";

// แผงคิวคลิป (หน้า Video): กำลังเล่น + คิวถัดไป + ปุ่มข้าม/ลบ
export default function VideoQueuePanel() {
    const [snap, setSnap] = useState<VideoSnapshot | null>(null);
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const apply = (s: VideoSnapshot) => {
            setOffset(new Date(s.serverNow).getTime() - Date.now());
            setSnap(s);
        };
        const load = () => getVideoState().then((r) => apply(r.data)).catch(console.error);

        load();
        const socket = acquireSocket();
        socket.on("videoUpdated", apply);
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => {
            socket.off("videoUpdated", apply);
            releaseSocket();
            clearInterval(id);
        };
    }, []);

    const run = async (fn: () => Promise<{ data: VideoSnapshot }>) => {
        setBusy(true);
        try {
            const res = await fn();
            setSnap(res.data);
        } catch (err) {
            console.error(err);
            alert("ทำรายการไม่สำเร็จ");
        } finally {
            setBusy(false);
        }
    };

    const current = snap?.current ?? null;
    const serverNow = now + offset;
    const waiting = current ? serverNow < new Date(current.startsAt).getTime() : false;
    const left = current
        ? Math.max(
            0,
            Math.ceil(
                ((waiting ? new Date(current.startsAt).getTime() : new Date(current.endsAt).getTime()) - serverNow) / 1000,
            ),
        )
        : 0;

    return (
        <div className={styles.card}>
            <div className={styles.sectionTitle}>คิวคลิปบนไลฟ์</div>

            {!current ? (
                <p className={styles.hint} style={{ margin: 0 }}>ตอนนี้ไม่มีคลิปกำลังเล่น</p>
            ) : (
                <div className={styles.videoNow}>
                    <img src={youTubeThumb(current.videoId)} alt="" className={styles.videoThumb} />
                    <div className={styles.videoInfo}>
                        <div className={styles.videoTitle}>{current.title || current.videoId}</div>
                        <div className={styles.hint} style={{ margin: 0 }}>
                            โดย {current.name} · ฿{current.amount.toLocaleString()} · {formatDuration(current.seconds)}
                        </div>
                        <div className={styles.videoStatus}>
                            {waiting ? `เริ่มเล่นใน ${left} วินาที` : `กำลังเล่น · เหลือ ${formatClock(left)}`}
                        </div>
                    </div>
                    <button
                        className={styles.btn}
                        disabled={busy}
                        onClick={() => {
                            if (confirm("ข้ามคลิปที่กำลังเล่นอยู่?")) run(skipVideo);
                        }}
                    >
                        ข้ามคลิป
                    </button>
                </div>
            )}

            <div className={styles.field} style={{ marginTop: 16, marginBottom: 8 }}>
                <label className={styles.label}>
                    รอเล่น {snap?.queue.length ? `(${snap.queue.length})` : ""}
                </label>
            </div>
            {!snap?.queue.length ? (
                <p className={styles.hint} style={{ margin: 0 }}>ไม่มีคลิปในคิว</p>
            ) : (
                <ol className={styles.videoQueue}>
                    {snap.queue.map((v) => (
                        <li key={v.donationId}>
                            <img src={youTubeThumb(v.videoId)} alt="" className={styles.videoThumbSm} />
                            <div className={styles.videoInfo}>
                                <div className={styles.videoTitle}>{v.title || v.videoId}</div>
                                <div className={styles.hint} style={{ margin: 0 }}>
                                    {v.name} · ฿{v.amount.toLocaleString()} · {formatDuration(v.seconds)}
                                </div>
                            </div>
                            <a
                                className={styles.backLink}
                                href={`https://www.youtube.com/watch?v=${v.videoId}&t=${v.start}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                ดูคลิป
                            </a>
                            <button
                                className={styles.btn}
                                disabled={busy}
                                onClick={() => {
                                    if (confirm("เอาคลิปนี้ออกจากคิว? (ไม่คืนเงินอัตโนมัติ)")) {
                                        run(() => removeQueuedVideo(v.donationId));
                                    }
                                }}
                            >
                                เอาออก
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
