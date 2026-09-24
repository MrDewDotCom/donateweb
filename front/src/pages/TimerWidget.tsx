import { useEffect, useRef, useState } from "react";
import { getTimer, type TimerSnapshot } from "../services/timer.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { formatClock, formatDuration } from "../utils/duration";
import { isPreviewMode } from "../utils/preview";
import styles from "./TimerWidget.module.css";

// OBS Browser Source: ตัวจับเวลาจากโดเนทจับเวลา
// - เวลาเหลือ 0 → ซ่อนทั้งหมด
// - เพิ่มเวลา → แสดง "+X" ลอยขึ้นมา
export default function TimerWidget() {
    const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
    // นาฬิกา server - นาฬิกาเครื่องนี้ (ms) ใช้ชดเชยเครื่อง OBS ที่เวลาเพี้ยน
    const [offset, setOffset] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [bump, setBump] = useState<{ key: number; seconds: number } | null>(null);
    const lastRemainingRef = useRef<number | null>(null);
    // พรีวิวในหน้าแอดมิน: แสดงเวลาจริงเสมอ (เดิมโชว์ตัวอย่าง 15:00 ตอนไม่มีเวลา ทำให้สับสน)
    const [preview] = useState(isPreviewMode);

    useEffect(() => {
        const prevBody = document.body.style.background;
        const prevHtml = document.documentElement.style.background;
        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";
        return () => {
            document.body.style.background = prevBody;
            document.documentElement.style.background = prevHtml;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const apply = (snap: TimerSnapshot) => {
            if (cancelled) return;
            setOffset(new Date(snap.serverNow).getTime() - Date.now());

            // เวลาเพิ่มขึ้น (โดเนท/แอดมินเพิ่ม) → โชว์ "+X"
            const prev = lastRemainingRef.current;
            if (prev !== null && snap.remainingSec > prev + 1) {
                setBump({ key: Date.now(), seconds: snap.remainingSec - prev });
            }
            lastRemainingRef.current = snap.remainingSec;
            setNow(Date.now());
            setSnapshot(snap);
        };

        const load = async () => {
            try {
                const res = await getTimer();
                apply(res.data);
            } catch (err) {
                console.error("getTimer failed", err);
            }
        };

        load();
        // สำรองเผื่อ socket หลุด
        const interval = setInterval(load, 60000);

        const socket = acquireSocket();
        socket.on("timerUpdated", apply);
        socket.on("connect", load); // ต่อใหม่หลังหลุด → ดึงสถานะล่าสุด

        return () => {
            cancelled = true;
            clearInterval(interval);
            socket.off("timerUpdated", apply);
            socket.off("connect", load);
            releaseSocket();
        };
    }, []);

    // เดินนาฬิกาเฉพาะตอนจับเวลาอยู่
    useEffect(() => {
        if (!snapshot?.isRunning) return;
        const id = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(id);
    }, [snapshot?.isRunning]);

    const remaining = (() => {
        if (!snapshot) return 0;
        if (snapshot.isRunning && snapshot.endsAt) {
            const serverNow = now + offset;
            return Math.max(0, Math.ceil((new Date(snapshot.endsAt).getTime() - serverNow) / 1000));
        }
        return snapshot.remainingSec;
    })();

    // ให้ลูป "+X" ถัดไปเทียบกับค่าที่นับลงแล้ว ไม่ใช่ค่าตอนได้รับ snapshot
    useEffect(() => {
        if (snapshot?.isRunning) lastRemainingRef.current = remaining;
    }, [remaining, snapshot?.isRunning]);

    const empty = remaining <= 0;

    // บนไลฟ์: หมดเวลา = ซ่อน / พรีวิว: แสดง 00:00 พร้อมบอกว่าบนไลฟ์จะซ่อน
    if (empty && !preview) return null;

    const paused = !snapshot?.isRunning;
    const urgent = !empty && !paused && remaining <= 60;

    return (
        <div className={styles.widget}>
            <div className={`${styles.card} ${paused ? styles.paused : ""} ${urgent ? styles.urgent : ""}`}>
                <div className={styles.label}>
                    {empty ? "ไม่มีเวลา · บนไลฟ์จะซ่อน" : paused ? "หยุดชั่วคราว" : "เวลาที่เหลือ"}
                </div>
                <div className={styles.clock}>{formatClock(remaining)}</div>
            </div>
            {bump && (
                <div key={bump.key} className={styles.bump} onAnimationEnd={() => setBump(null)}>
                    +{formatDuration(bump.seconds)}
                </div>
            )}
        </div>
    );
}
