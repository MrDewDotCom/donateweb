import { useEffect, useRef, useState } from "react";
import type { Donation } from "../types/donation";
import type { Settings } from "../types/settings";
import { getSettings } from "../services/settings.service";
import { API_URL } from "../config/api";
import { acquireSocket, releaseSocket } from "../services/socket";
import { resolveAlertSoundUrl, resolveBackendAsset } from "../utils/assets";
import { formatDuration } from "../utils/duration";
import { isPreviewMode, usePreviewPayload } from "../utils/preview";
import styles from "./Overlay.module.css";

// โดเนทตัวอย่างสำหรับโหมดพรีวิวในหน้าแอดมิน
const SAMPLE_DONATION: Donation = {
    id: -1,
    name: "ตัวอย่าง",
    amount: 100,
    message: "ขอบคุณสำหรับคอนเทนต์ครับ สู้ ๆ นะ",
    displayMessage: "ขอบคุณสำหรับคอนเทนต์ครับ สู้ ๆ นะ",
    status: "paid",
    createdAt: "",
};

export default function OverlayPage() {
    // โหมดพรีวิว (iframe ในหน้าแอดมิน): ไม่ต่อไลฟ์จริง ไม่เล่นเสียง วน alert ตัวอย่าง
    const [preview] = useState(isPreviewMode);
    const previewPayload = usePreviewPayload();
    // พรีวิว: รอบนี้ให้เล่นเสียงไหม (ใช้ครั้งเดียวแล้วกลับไปเงียบ)
    const previewSoundRef = useRef(false);
    const [donation, setDonation] = useState<Donation | null>(null);
    const [visible, setVisible] = useState(false);
    const [queue, setQueue] = useState<Donation[]>([]);
    const [settings, setSettings] = useState<Settings | null>(null);

    // เก็บ visible ปัจจุบันไว้ใน ref ด้วย เพราะ listener "settingsUpdated" ผูกแค่ครั้งเดียวตอน mount
    // (closure ของมันจะเห็น visible ค้างที่ค่าตอน mount ถ้าไม่ใช้ ref)
    const visibleRef = useRef(visible);
    useEffect(() => {
        visibleRef.current = visible;
    }, [visible]);

    // settings ที่เด้งมาตอน alert กำลังเล่นอยู่ — พักไว้ก่อน ค่อย apply ตอน alert จบ
    // ป้องกัน animation/sound ของ alert ที่กำลังเล่นเปลี่ยนกลางอากาศ
    const pendingSettingsRef = useRef<Settings | null>(null);

    // พรีวิว: ใช้ค่าที่กำลังแก้ไข (ยังไม่บันทึก) + เริ่ม alert ตัวอย่างใหม่เมื่อกด "เล่นอีกครั้ง"
    useEffect(() => {
        if (!preview || !previewPayload?.settings) return;
        setSettings(previewPayload.settings);
    }, [preview, previewPayload?.settings]);

    useEffect(() => {
        if (!preview || !previewPayload) return;
        previewSoundRef.current = !!previewPayload.replaySound;
        setVisible(false);
        setDonation(null);
        setQueue([{ ...SAMPLE_DONATION, ttsAudioUrl: previewPayload.ttsUrl ?? null }]);
    }, [preview, previewPayload?.replay]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (preview) return;
        // ต่อ socket ตอน mount เท่านั้น — เดิมเรียก io() ไว้ระดับ module
        // ทำให้ทุกคนที่เข้าเว็บ (แม้แต่หน้าแรก) เปิด connection ค้างไว้โดยไม่ได้ใช้
        const socket = acquireSocket();

        const handleDonationPaid = (data: Donation) => {
            // โดเนทคลิปแบบ "เล่นคลิปอย่างเดียว" — ไม่แสดง alert
            if (data.silent) return;
            setQueue((prev) => [...prev, data]);
        };

        const handleSettingsUpdated = (data: Settings) => {
            if (visibleRef.current) {
                // กำลังเล่น alert อยู่ พักไว้ก่อน
                pendingSettingsRef.current = data;
            } else {
                setSettings(data);
            }
        };

        socket.on("donationPaid", handleDonationPaid);
        socket.on("settingsUpdated", handleSettingsUpdated);

        return () => {
            socket.off("donationPaid", handleDonationPaid);
            socket.off("settingsUpdated", handleSettingsUpdated);
            releaseSocket();
        };
    }, [preview]);

    useEffect(() => {
        // พรีวิวได้ settings จากหน้าแอดมินแทน
        if (preview) return;

        const load = async () => {
            const res = await getSettings();
            setSettings(res.data);
        };

        load();
    }, [preview]);

    useEffect(() => {
        if (visible) return;
        if (queue.length === 0) return;

        const nextDonation = queue[0];

        setDonation(nextDonation);
        setVisible(true);

        const finishDonation = () => {
            setTimeout(() => {
                setVisible(false);
                setDonation(null);
                setQueue((prev) => prev.slice(1));

                // ถ้ามี settings ใหม่ที่เด้งมาตอน alert นี้กำลังเล่นอยู่ ค่อย apply ตอนนี้
                if (pendingSettingsRef.current) {
                    setSettings(pendingSettingsRef.current);
                    pendingSettingsRef.current = null;
                }

                // พรีวิว: เว้นช่วงสั้น ๆ แล้ววน alert ตัวอย่างอีกรอบ
                if (preview) {
                    setTimeout(() => {
                        setQueue((q) => (q.length ? q : [SAMPLE_DONATION]));
                    }, 700);
                }
            }, (settings?.overlayDuration ?? 2) * 1000);
        };

        // พรีวิว: รอบวนอัตโนมัติเงียบ — เล่นเสียงเฉพาะรอบที่กด "มีเสียง"
        if (preview) {
            if (!previewSoundRef.current) {
                finishDonation();
                return;
            }
            previewSoundRef.current = false;
        }

        // ลบไฟล์ TTS ทิ้งจาก backend หลังเล่นจบ/error (ไม่ต้องรอ response, ไม่ critical path)
        // กรณีลบไม่สำเร็จ (network พัง, server ปิด ฯลฯ) จะมี cron fallback ฝั่ง backend เก็บกวาดทีหลัง
        const deleteTtsFile = (ttsAudioUrl: string) => {
            const filename = ttsAudioUrl.split("/").pop();
            if (!filename) return;

            fetch(`${API_URL}/tts/${filename}`, { method: "DELETE" }).catch(() => {
                // เงียบไว้ — cron fallback จะลบให้เองทีหลัง
            });
        };

        // เล่นไฟล์เสียง TTS ที่ backend generate มาให้ (Edge TTS, th-TH-PremwadeeNeural)
        // ถ้าปิด TTS ไว้ใน settings หรือ donation นี้ไม่มี ttsAudioUrl (generate ไม่สำเร็จ)
        // ก็ข้ามไปเลย ไม่ต้องรอเสียงอะไรเพิ่ม
        const playTtsAndFinish = () => {
            if (!settings?.ttsEnabled || !nextDonation.ttsAudioUrl) {
                finishDonation();
                return;
            }

            const ttsSrc = nextDonation.ttsAudioUrl.startsWith("http")
                ? nextDonation.ttsAudioUrl
                : `${API_URL}${nextDonation.ttsAudioUrl}`;

            const ttsAudio = new Audio(ttsSrc);

            ttsAudio.onended = () => {
                deleteTtsFile(nextDonation.ttsAudioUrl!);
                finishDonation();
            };

            ttsAudio.onerror = () => {
                deleteTtsFile(nextDonation.ttsAudioUrl!);
                finishDonation();
            };

            ttsAudio.play().catch(() => {
                deleteTtsFile(nextDonation.ttsAudioUrl!);
                finishDonation();
            });
        };

        // เคารพสวิตช์ปิดเสียงใน Settings — เดิมเล่นเสียงตลอดไม่เคยอ่านค่านี้เลย
        // ถ้ายังโหลด settings ไม่เสร็จให้ถือว่าเปิดไว้ (ตรงกับ default ใน DB)
        if (settings && !settings.soundEnabled) {
            playTtsAndFinish();
            return;
        }

        const audio = new Audio(resolveAlertSoundUrl(settings?.alertSound));
        audio.volume = (settings?.alertVolume ?? 100) / 100;

        audio.onerror = () => {
            playTtsAndFinish();
        };

        audio.onended = () => {
            playTtsAndFinish();
        };

        audio.play().catch(() => {
            playTtsAndFinish();
        });
    }, [queue, visible, settings, preview]);

    useEffect(() => {
        // OBS Browser Source อ่าน background ของ <body> จริง ไม่ใช่แค่ div ของ component
        // ต้อง override ตรงนี้ด้วย ไม่งั้นจะเห็นพื้นขาวทะลุออกมา
        const prevBody = document.body.style.background;
        const prevHtml = document.documentElement.style.background;

        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";

        return () => {
            document.body.style.background = prevBody;
            document.documentElement.style.background = prevHtml;
        };
    }, []);

    if (!visible || !donation) {
        return null;
    }

    const animationClass = styles[settings?.overlayAnimation ?? "fade"] ?? styles.fade;

    return (
        <div className={styles.overlay}>
            <div className={`${styles.card} ${animationClass}`}>
                {settings?.overlayImage && (
                    <img
                        src={resolveBackendAsset(settings.overlayImage)}
                        alt=""
                        className={styles.image}
                    />
                )}

                <div className={styles.infoRow}>
                    <h1 className={styles.name} style={{ color: settings?.alertNameColor }}>{donation.name}</h1>
                    <h2 className={styles.amount} style={{ color: settings?.alertAmountColor }}>฿{donation.amount.toLocaleString()}</h2>
                </div>
                {donation.type === "timer" && donation.timerSeconds ? (
                    <div className={styles.timerAdded}>+{formatDuration(donation.timerSeconds)}</div>
                ) : null}
                {donation.type === "video" && donation.videoId ? (
                    <div className={styles.timerAdded}>
                        ขอคลิป{donation.videoTitle ? `: ${donation.videoTitle}` : ""}
                    </div>
                ) : null}
                {donation.message && (
                    <p className={styles.message} style={{ color: settings?.alertMessageColor }}>
                        {donation.displayMessage ?? donation.message}
                    </p>
                )}
            </div>
        </div>
    );
}