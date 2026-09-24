import { useCallback, useEffect, useRef, useState } from "react";
import { PREVIEW_MESSAGE, type PreviewPayload } from "../utils/preview";
import styles from "./WidgetPreview.module.css";

interface Props {
    // path ของ widget เช่น "/overlay"
    path: string;
    payload: PreviewPayload;
    // ความสูงของกรอบพรีวิว (px)
    height?: number;
    // ขนาดที่แนะนำใน OBS (แสดงเป็นข้อความ)
    obsSize?: string;
    // มีปุ่ม "เล่นซ้ำ" (overlay alert)
    replayable?: boolean;
    // สร้างเสียง TTS ตัวอย่าง (คืน URL หรือ null ถ้าปิด TTS) — ใช้กับปุ่ม "มีเสียง"
    getTtsUrl?: () => Promise<string | null>;
}

// กรอบพรีวิว widget แบบสด: พื้นหลังลายตาราง = ส่วนโปร่งใสใน OBS
export default function WidgetPreview({ path, payload, height = 320, obsSize, replayable, getTtsUrl }: Props) {
    const frameRef = useRef<HTMLIFrameElement | null>(null);
    const [replay, setReplay] = useState<{ n: number; sound: boolean; ttsUrl: string | null }>({
        n: 0,
        sound: false,
        ttsUrl: null,
    });
    const [preparingSound, setPreparingSound] = useState(false);
    const [copied, setCopied] = useState(false);

    const obsUrl = `${window.location.origin}${path}`;

    const send = useCallback(() => {
        const win = frameRef.current?.contentWindow;
        if (!win) return;
        win.postMessage(
            {
                type: PREVIEW_MESSAGE,
                payload: { ...payload, replay: replay.n, replaySound: replay.sound, ttsUrl: replay.ttsUrl },
            },
            window.location.origin,
        );
    }, [payload, replay]);

    // ส่งค่าใหม่ทุกครั้งที่แก้ไข
    useEffect(() => {
        send();
    }, [send]);

    // iframe แจ้งว่าพร้อม → ส่งค่าปัจจุบันให้
    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            if (e.source !== frameRef.current?.contentWindow) return;
            if ((e.data as { type?: string })?.type === `${PREVIEW_MESSAGE}-ready`) send();
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [send]);

    const replaySilent = () => setReplay((r) => ({ n: r.n + 1, sound: false, ttsUrl: null }));

    const replayWithSound = async () => {
        setPreparingSound(true);
        let ttsUrl: string | null = null;
        try {
            ttsUrl = getTtsUrl ? await getTtsUrl() : null;
        } catch (err) {
            // TTS สร้างไม่ได้ ก็ยังเล่นเสียงแจ้งเตือนได้
            console.error(err);
        } finally {
            setPreparingSound(false);
        }
        setReplay((r) => ({ n: r.n + 1, sound: true, ttsUrl }));
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(obsUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            alert(obsUrl);
        }
    };

    return (
        <div className={styles.wrap}>
            <div className={styles.head}>
                <span className={styles.title}>พรีวิว</span>
                <span className={styles.badge}>ยังไม่ขึ้นไลฟ์จนกว่าจะกดบันทึก</span>
            </div>

            <div className={styles.stage} style={{ height }}>
                <iframe
                    ref={frameRef}
                    src={`${path}?preview=1`}
                    title={`พรีวิว ${path}`}
                    className={styles.frame}
                    onLoad={send}
                    allow="autoplay"
                />
            </div>

            <div className={styles.actions}>
                {replayable && (
                    <>
                        <button
                            type="button"
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={replayWithSound}
                            disabled={preparingSound}
                        >
                            {preparingSound ? "กำลังเตรียมเสียง..." : "เล่นตัวอย่าง (มีเสียง)"}
                        </button>
                        <button type="button" className={styles.btn} onClick={replaySilent}>
                            เล่นซ้ำ (เงียบ)
                        </button>
                    </>
                )}
                <a className={styles.btn} href={path} target="_blank" rel="noreferrer">
                    เปิดหน้าจริง ↗
                </a>
                <button type="button" className={styles.btn} onClick={copy}>
                    {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์ OBS"}
                </button>
            </div>
            <div className={styles.url}>
                {obsUrl}
                {obsSize && <span> · แนะนำขนาด {obsSize}</span>}
            </div>
        </div>
    );
}
