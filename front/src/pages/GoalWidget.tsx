import { useEffect, useMemo, useState } from "react";
import { getProgress } from "../services/campaign.service";
import { getSettings } from "../services/settings.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { isPreviewMode, usePreviewPayload } from "../utils/preview";
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
    const [preview] = useState(isPreviewMode);
    const previewPayload = usePreviewPayload();

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
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getProgress();
                if (!cancelled) setProgress(res.data);
            } catch (err) {
                // คงค่าเดิมไว้ ไม่ล้างหลอด goal ทิ้งกลางไลฟ์
                console.error("getProgress failed", err);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        };

        load();

        // ตัวสำรอง เผื่อ socket หลุดหรือพลาด event ไป
        // ลดจาก 5 วิ เป็น 60 วิ เพราะ socket แจ้งให้อยู่แล้ว และ 5 วิทำให้ชน rate limit
        const interval = setInterval(load, 60000);

        // อัปเดตทันทีที่มีคนโดเนทสำเร็จ ไม่ต้องรอ poll รอบถัดไป
        const socket = acquireSocket();
        socket.on("donationPaid", load);

        return () => {
            cancelled = true;
            clearInterval(interval);
            socket.off("donationPaid", load);
            releaseSocket();
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

    // พรีวิว: ใช้ชื่อ/เป้าหมายที่กำลังแก้ไข กับยอดจริงตอนนี้
    const previewCampaign = preview ? previewPayload?.campaign : undefined;
    const shown: Progress | null = previewCampaign
        ? (() => {
            const currentAmount = progress?.currentAmount ?? 0;
            const goalAmount = previewCampaign.goalAmount;
            return {
                title: previewCampaign.title || progress?.title || "",
                currentAmount,
                goalAmount,
                percentage: goalAmount > 0 ? Math.floor((currentAmount / goalAmount) * 100) : 0,
            };
        })()
        : progress;
    const showEffect = preview && previewPayload?.settings
        ? previewPayload.settings.goalEffectEnabled
        : effectEnabled;

    if (!loaded) {
        return <p className={styles.loadingWrap}>Loading...</p>;
    }

    if (!shown) {
        return <p className={styles.loadingWrap}>ยังไม่มีแคมเปญที่เปิดใช้งาน</p>;
    }

    const pct = Math.min(100, Math.max(0, shown.percentage));
    const isFull = pct >= 100;

    return (
        <div className={styles.widget}>
            <h1 className={styles.title}>{shown.title}</h1>

            <div className={styles.barTrack}>
                <div
                    className={styles.barFill}
                    style={{ width: `${pct}%` }}
                />

                <span className={styles.progressLabel}>
                    {pct}%
                </span>

                {isFull && showEffect && (
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
                {shown.currentAmount.toLocaleString()} /{" "}
                {shown.goalAmount.toLocaleString()} บาท
            </h2>
        </div>
    );
}