import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { getProgress } from "../services/campaign.service";
import { getSettings } from "../services/settings.service";
import { API_URL } from "../config/api";
import styles from "./GoalWidget.module.css";

interface Progress {
    title: string;
    currentAmount: number;
    goalAmount: number;
    percentage: number;
}

const STAR_COUNT = 14;

// กระจายดาวรอบกรอบหลอด (บน/ล่าง สลับกัน) แต่ละดวงกระพริบเองทุก 2-5 วิ ไม่ตรงกัน

export default function GoalWidget() {
    const [progress, setProgress] = useState<Progress | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [effectEnabled, setEffectEnabled] = useState(true);

    useEffect(() => {
        // OBS Browser Source อ่าน background ของ <body> จริง ต้อง override ตรงนี้ด้วย
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
        const load = async () => {
            // กัน OBS Browser Source แคชข้อมูลเก่า ใส่ timestamp กันแคช
            const res = await getProgress();
            setProgress(res.data);
            setLoaded(true);
        };

        load();

        // ตัวสำรอง เผื่อ socket หลุดหรือพลาด event ไป — ยังอัปเดตเองทุก 5 วิอยู่ดี
        const interval = setInterval(load, 5000);

        // อัปเดตทันทีที่มีคนโดเนทสำเร็จ ไม่ต้องรอ poll รอบถัดไป
        const socket = io(API_URL);
        socket.on("donationPaid", () => {
            load();
        });

        return () => {
            clearInterval(interval);
            socket.off("donationPaid");
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSettings();
                // ถ้า settings ยังไม่มีค่าเลย ให้ถือว่าเปิดไว้ (ค่า default ฝั่ง backend ก็ true)
                setEffectEnabled(res.data?.goalEffectEnabled ?? true);
            } catch (err) {
                console.error(err);
            }
        };

        loadSettings();
    }, []);

    // สุ่มตำแหน่ง + จังหวะกระพริบของดาวแต่ละดวงครั้งเดียว ไม่สุ่มใหม่ทุก re-render (กันกระตุก)
    const stars = useMemo(
        () =>
            Array.from({ length: STAR_COUNT }, (_, i) => ({
                id: i,
                // กระจาย x ตลอดความยาวหลอด + สุ่มเพี้ยนเล็กน้อย
                left: (i / STAR_COUNT) * 100 + (Math.random() * 6 - 3),
                // สลับบน/ล่างของกรอบหลอด
                side: i % 2 === 0 ? "top" : "bottom",
                // กระพริบเองรอบละ 2-5 วินาที ไม่พร้อมกัน
                duration: 5 + Math.random() * 3,
                delay: Math.random() * 10,
            })),
        [],
    );

    if (!loaded) {
        return <p className={styles.loadingWrap}>Loading...</p>;
    }

    if (!progress) {
        return <p className={styles.loadingWrap}>ยังไม่มีแคมเปญที่เปิดใช้งาน</p>;
    }

    const pct = Math.min(100, Math.max(0, progress.percentage));
    const isFull = pct >= 100;

    return (
        <div className={styles.widget}>
            <h1 className={styles.title}>{progress.title}</h1>

            <div className={styles.barTrack}>
                <div
                    className={styles.barFill}
                    style={{ width: `${pct}%` }}
                />

                <span className={styles.progressLabel}>
                    {pct}%
                </span>

                {isFull && effectEnabled && (
                    <div className={styles.starField}>
                        {stars.map((s) => (
                            <span
                                key={s.id}
                                className={styles.sparkle}
                                style={
                                    {
                                        left: `${s.left}%`,
                                        [s.side]: "-3px",
                                        animationDuration: `${s.duration}s`,
                                        animationDelay: `${s.delay}s`,
                                    } as React.CSSProperties
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            <h2 className={styles.amountText}>
                {progress.currentAmount.toLocaleString()} /{" "}
                {progress.goalAmount.toLocaleString()} บาท
            </h2>
        </div>
    );
}