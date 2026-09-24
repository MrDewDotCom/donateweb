import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Settings } from "../types/settings";
import { getSettings, updateSettings } from "../services/settings.service";
import Icon, { type IconName } from "../components/Icon";
import { formatDuration } from "../utils/duration";
import styles from "./DonationTypes.module.css";

type ToggleKey = "timerEnabled" | "videoEnabled";

interface TypeRow {
    icon: IconName;
    title: string;
    desc: string;
    key?: ToggleKey; // ไม่มี = เปิดตลอด
    to?: string;
    summary?: (s: Settings) => string;
}

const ROWS: TypeRow[] = [
    {
        icon: "message",
        title: "โดเนททั่วไป",
        desc: "ส่งยอดพร้อมข้อความ ขึ้น alert พร้อมเสียงและเสียงอ่าน",
        to: "/admin/alert",
        summary: (s) =>
            [
                s.minDonationAmount != null ? `ขั้นต่ำ ฿${s.minDonationAmount.toLocaleString()}` : "ไม่จำกัดขั้นต่ำ",
                s.maxDonationAmount != null ? `สูงสุด ฿${s.maxDonationAmount.toLocaleString()}` : null,
            ]
                .filter(Boolean)
                .join(" · "),
    },
    {
        icon: "timer",
        title: "โดเนทจับเวลา",
        desc: "ยอดโดเนทแปลงเป็นเวลา แล้วนับถอยหลังบนไลฟ์",
        key: "timerEnabled",
        to: "/admin/timer",
        summary: (s) =>
            `เรท ฿${s.timerRateAmount.toLocaleString()} = ${formatDuration(s.timerRateMinutes * 60)}` +
            (s.timerMinAmount != null ? ` · ขั้นต่ำ ฿${s.timerMinAmount.toLocaleString()}` : ""),
    },
    {
        icon: "video",
        title: "โดเนทคลิปวิดีโอ",
        desc: "แนบลิงก์ YouTube แล้วคลิปเล่นบนไลฟ์อัตโนมัติ",
        key: "videoEnabled",
        to: "/admin/video",
        summary: (s) =>
            `เรท ฿${s.videoRateAmount.toLocaleString()} = ${formatDuration(s.videoRateSeconds)}` +
            ` · สูงสุด ${formatDuration(s.videoMaxSeconds)}` +
            (s.videoMinAmount != null ? ` · ขั้นต่ำ ฿${s.videoMinAmount.toLocaleString()}` : ""),
    },
];

// หน้ารวมสำหรับเปิด/ปิดรับโดเนทแต่ละแบบ — สลับแล้วบันทึกทันที
export default function DonationTypesPage() {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [saving, setSaving] = useState<ToggleKey | null>(null);

    useEffect(() => {
        getSettings()
            .then((res) => setSettings(res.data))
            .catch((err) => console.error(err));
    }, []);

    const toggle = async (key: ToggleKey) => {
        if (!settings || saving) return;
        const next = !settings[key];
        setSaving(key);
        setSettings({ ...settings, [key]: next }); // อัปเดตหน้าจอก่อน
        try {
            await updateSettings({ [key]: next });
        } catch (err) {
            console.error(err);
            setSettings((prev) => (prev ? { ...prev, [key]: !next } : prev));
            alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>รูปแบบการโดเนท</h1>
            <p className={styles.lead}>
                เลือกว่าจะเปิดรับโดเนทแบบไหนบ้าง — สลับแล้วมีผลทันทีทั้งหน้าโดเนทและหน้าแรก
            </p>

            {!settings ? (
                <p className={styles.lead}>กำลังโหลด...</p>
            ) : (
                <div className={styles.list}>
                    {ROWS.map((row) => {
                        const on = row.key ? settings[row.key] : true;
                        return (
                            <div key={row.title} className={`${styles.row} ${on ? styles.rowOn : ""}`}>
                                <div className={styles.icon}>
                                    <Icon name={row.icon} size={22} />
                                </div>
                                <div className={styles.body}>
                                    <div className={styles.rowTitle}>
                                        {row.title}
                                        <span className={on ? styles.badgeOn : styles.badgeOff}>
                                            {on ? "เปิดรับ" : "ปิดอยู่"}
                                        </span>
                                    </div>
                                    <div className={styles.desc}>{row.desc}</div>
                                    {row.summary && <div className={styles.summary}>{row.summary(settings)}</div>}
                                </div>
                                <div className={styles.actions}>
                                    {row.to && (
                                        <Link to={row.to} className={styles.link}>
                                            ตั้งค่า →
                                        </Link>
                                    )}
                                    {row.key ? (
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={on}
                                            aria-label={`${on ? "ปิด" : "เปิด"}รับ${row.title}`}
                                            className={`${styles.switch} ${on ? styles.switchOn : ""}`}
                                            onClick={() => toggle(row.key!)}
                                            disabled={saving !== null}
                                        >
                                            <span className={styles.knob} />
                                        </button>
                                    ) : (
                                        <span className={styles.always}>เปิดเสมอ</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
