import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import type { Donation } from "../types/donation";
import type { Settings } from "../types/settings";
import { getSettings } from "../services/settings.service";
import { API_URL } from "../config/api";
import styles from "./Overlay.module.css";

const socket = io(API_URL);

export default function OverlayPage() {
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

    useEffect(() => {
        socket.on("donationPaid", (data: Donation) => {
            console.log("Donation Received", data);
            setQueue((prev) => [...prev, data]);
        });

        socket.on("settingsUpdated", (data: Settings) => {
            if (visibleRef.current) {
                // กำลังเล่น alert อยู่ พักไว้ก่อน
                pendingSettingsRef.current = data;
            } else {
                setSettings(data);
            }
        });

        return () => {
            socket.off("donationPaid");
            socket.off("settingsUpdated");
        };
    }, []);

    useEffect(() => {
        const load = async () => {
            const res = await getSettings();
            setSettings(res.data);
        };

        load();
    }, []);

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
            }, (settings?.overlayDuration ?? 2) * 1000);
        };

        const alertSound = settings?.alertSound ?? "donation.mp3";
        // เสียงที่อัปโหลดเองเก็บเป็น URL เต็มของ backend ส่วนเสียงตั้งต้นใช้ path ของ frontend
        const soundSrc = alertSound.startsWith("http")
            ? alertSound
            : `/sounds/${alertSound}`;

        const audio = new Audio(soundSrc);
        audio.volume = (settings?.alertVolume ?? 100) / 100;

        audio.onerror = () => {
            finishDonation();
        };

        audio.onended = () => {
            if (!settings?.ttsEnabled) {
                finishDonation();
                return;
            }

            // ถ้าเปิด "อ่านข้อความ" และมีข้อความ → อ่านข้อความตามเดิม
            // ถ้าปิดไว้ → อ่านแค่ "ชื่อ บริจาค จำนวนเงิน" แทน ไม่อ่านข้อความที่ฝากมา
            const shouldReadMessage =
                settings.readMessageEnabled && nextDonation.message?.trim();

            const textToSpeak = shouldReadMessage
                ? nextDonation.message!
                : `${nextDonation.name} บริจาค ${nextDonation.amount} บาท`;

            const speech = new SpeechSynthesisUtterance(textToSpeak);
            speech.lang = "th-TH";

            const selectedVoice = window.speechSynthesis
                .getVoices()
                .find((voice) => voice.name === settings?.ttsVoice);

            if (selectedVoice) {
                speech.voice = selectedVoice;
            } else {
                const thaiVoice = window.speechSynthesis
                    .getVoices()
                    .find((voice) => voice.lang === "th-TH");

                if (thaiVoice) {
                    speech.voice = thaiVoice;
                }
            }

            speech.onend = () => {
                finishDonation();
            };

            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(speech);
        };

        audio.play().catch(() => {
            finishDonation();
        });
    }, [queue, visible, settings]);

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

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
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
                    <img src={settings.overlayImage} alt="" className={styles.image} />
                )}

                <p className={styles.label}>🎉 NEW DONATION</p>
                <h1 className={styles.name}>{donation.name}</h1>
                <h2 className={styles.amount}>฿{donation.amount.toLocaleString()}</h2>
                {donation.message && <p className={styles.message}>{donation.message}</p>}
            </div>
        </div>
    );
}