import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Donation } from "../types/donation";
import type { Settings } from "../types/settings";
import "./OverlayPage.css";
import { getSettings } from "../services/settings.service";

const socket = io("http://localhost:3000");

export default function OverlayPage() {
    const [donation, setDonation] =
        useState<Donation | null>(null);

    const [visible, setVisible] =
        useState(false);

    const [queue, setQueue] =
        useState<Donation[]>([]);

    const [settings, setSettings] =
        useState<Settings | null>(null);

    useEffect(() => {
        socket.on("donationPaid", (data: Donation) => {
            console.log("Donation Received", data);
            setQueue((prev) => [...prev, data]);
        });

        return () => {
            socket.off("donationPaid");
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
            }, (settings?.overlayDuration ?? 2) * 1000);
        };

        const audio = new Audio(
            `/sounds/${settings?.alertSound ?? "donation.mp3"}`
        );

        audio.volume = (settings?.alertVolume ?? 100) / 100;

        // ✅ ถ้าไฟล์เสียงโหลดไม่ได้ → จบ donation เลย
        audio.onerror = () => {
            finishDonation();
        };

        audio.onended = () => {
            if (
                !settings?.ttsEnabled ||
                !nextDonation.message?.trim()
            ) {
                finishDonation();
                return;
            }

            const speech = new SpeechSynthesisUtterance(
                nextDonation.message
            );

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

        // ✅ handle กรณี browser block autoplay
        audio.play().catch(() => {
            finishDonation();
        });

    }, [queue, visible, settings]);

    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    if (!visible || !donation) {
        return null;
    }

    return (
        <div className="overlay">
            <h3>🎉 NEW DONATION</h3>
            <h1>{donation.name}</h1>
            <h2>฿{donation.amount}</h2>
            <p>{donation.message}</p>
        </div>
    );
}