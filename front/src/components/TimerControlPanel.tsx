import { useEffect, useState } from "react";
import {
    adjustTimer,
    getTimer,
    pauseTimer,
    resetTimer,
    resumeTimer,
    type TimerSnapshot,
} from "../services/timer.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { formatClock } from "../utils/duration";
import styles from "../pages/Settings.module.css";

const ADJUST_STEPS = [
    { label: "−5 นาที", seconds: -300 },
    { label: "−1 นาที", seconds: -60 },
    { label: "+1 นาที", seconds: 60 },
    { label: "+5 นาที", seconds: 300 },
    { label: "+10 นาที", seconds: 600 },
];

// แผงควบคุมตัวจับเวลาบนไลฟ์ (หน้า Settings → โดเนทจับเวลา)
export default function TimerControlPanel() {
    const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [offset, setOffset] = useState(0);

    const overlayUrl = `${window.location.origin}/timer`;

    useEffect(() => {
        const apply = (snap: TimerSnapshot) => {
            setOffset(new Date(snap.serverNow).getTime() - Date.now());
            setNow(Date.now());
            setSnapshot(snap);
        };
        const load = () => getTimer().then((r) => apply(r.data)).catch(console.error);

        load();
        const socket = acquireSocket();
        socket.on("timerUpdated", apply);
        return () => {
            socket.off("timerUpdated", apply);
            releaseSocket();
        };
    }, []);

    useEffect(() => {
        if (!snapshot?.isRunning) return;
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, [snapshot?.isRunning]);

    const remaining = !snapshot
        ? 0
        : snapshot.isRunning && snapshot.endsAt
            ? Math.max(0, Math.ceil((new Date(snapshot.endsAt).getTime() - (now + offset)) / 1000))
            : snapshot.remainingSec;
    const running = !!snapshot?.isRunning && remaining > 0;

    const run = async (action: () => Promise<{ data: TimerSnapshot }>) => {
        setBusy(true);
        try {
            const res = await action();
            setOffset(new Date(res.data.serverNow).getTime() - Date.now());
            setNow(Date.now());
            setSnapshot(res.data);
        } catch (err) {
            console.error(err);
            alert("ทำรายการไม่สำเร็จ");
        } finally {
            setBusy(false);
        }
    };

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(overlayUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // บางเบราว์เซอร์ไม่ให้ copy — ผู้ใช้ copy จากช่องเองได้
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.sectionTitle}>ควบคุมตัวจับเวลาบนไลฟ์</div>

            <div className={styles.timerDisplay}>
                <div className={styles.timerClock}>{formatClock(remaining)}</div>
                <div className={styles.timerStatus}>
                    {remaining <= 0 ? "ไม่ได้จับเวลา (ซ่อนบนไลฟ์)" : running ? "กำลังนับถอยหลัง" : "หยุดชั่วคราว"}
                </div>
            </div>

            <div className={styles.actionsRow}>
                {running ? (
                    <button className={styles.btn} disabled={busy} onClick={() => run(pauseTimer)}>
                        หยุดชั่วคราว
                    </button>
                ) : (
                    <button
                        className={`${styles.btn} ${styles.primary}`}
                        disabled={busy || remaining <= 0}
                        onClick={() => run(resumeTimer)}
                    >
                        เริ่มต่อ
                    </button>
                )}
                <button
                    className={styles.btn}
                    disabled={busy || remaining <= 0}
                    onClick={() => {
                        if (confirm("รีเซ็ตเวลาเป็น 0 ใช่ไหม?")) run(resetTimer);
                    }}
                >
                    รีเซ็ต
                </button>
            </div>

            <div className={`${styles.field} ${styles.fieldStack}`}>
                <label className={styles.label}>ปรับเวลาเอง</label>
                <div className={styles.actionsRow}>
                    {ADJUST_STEPS.map((s) => (
                        <button
                            key={s.seconds}
                            className={styles.btn}
                            disabled={busy || (s.seconds < 0 && remaining <= 0)}
                            onClick={() => run(() => adjustTimer(s.seconds))}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <p className={styles.hint}>
                    ปรับเวลาเองจะไม่เริ่มนับให้อัตโนมัติ — ถ้าหยุดอยู่ ให้กด "เริ่มต่อ"
                </p>
            </div>

            <div className={`${styles.field} ${styles.fieldStack}`}>
                <label className={styles.label}>ลิงก์สำหรับ OBS (Browser Source)</label>
                <div className={styles.actionsRow}>
                    <input className={styles.input} readOnly value={overlayUrl} onFocus={(e) => e.target.select()} />
                    <button className={styles.btn} onClick={copyUrl}>
                        {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                    </button>
                </div>
                <p className={styles.hint}>แนะนำขนาด 400 × 220 · พื้นหลังโปร่งใส · เวลาเหลือ 0 จะซ่อนเอง</p>
            </div>
        </div>
    );
}
