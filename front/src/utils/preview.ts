import { useEffect, useState } from "react";
import type { Settings } from "../types/settings";

/**
 * โหมดพรีวิวของ widget/overlay
 *
 * หน้าแอดมินเปิด widget ใน <iframe src="/overlay?preview=1"> แล้วส่งค่าที่กำลังแก้ไข
 * (ยังไม่บันทึก) มาทาง postMessage — widget ในโหมดนี้จะใช้ค่านั้นแทนค่าจาก server
 * ทำให้เห็นผลทันทีโดยไม่กระทบไลฟ์จริง
 */

export const PREVIEW_MESSAGE = "donate-preview";

export interface PreviewCampaign {
    title: string;
    goalAmount: number;
    topDonatorLimit: number;
    recentLimit: number;
}

export interface PreviewPayload {
    settings?: Settings;
    campaign?: PreviewCampaign;
    // เปลี่ยนค่าเมื่อต้องการให้ overlay เล่น alert ตัวอย่างใหม่
    replay?: number;
    // รอบนี้เล่นเสียงด้วย (กดปุ่ม "มีเสียง") — รอบวนอัตโนมัติจะเงียบเสมอ
    replaySound?: boolean;
    // ไฟล์เสียง TTS ตัวอย่าง (สร้างจาก backend ตอนกดปุ่ม)
    ttsUrl?: string | null;
}

export function isPreviewMode(): boolean {
    try {
        return new URLSearchParams(window.location.search).get("preview") === "1";
    } catch {
        return false;
    }
}

// รับค่าพรีวิวจากหน้าแอดมิน (เฉพาะ origin เดียวกันเท่านั้น)
export function usePreviewPayload(): PreviewPayload | null {
    const [payload, setPayload] = useState<PreviewPayload | null>(null);

    useEffect(() => {
        if (!isPreviewMode()) return;

        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin) return;
            const data = e.data as { type?: string; payload?: PreviewPayload } | null;
            if (data?.type !== PREVIEW_MESSAGE || !data.payload) return;
            setPayload(data.payload);
        };

        window.addEventListener("message", onMessage);
        // บอกหน้าแอดมินว่าพร้อมรับค่าแล้ว (กันกรณีส่งมาก่อน iframe โหลดเสร็จ)
        window.parent?.postMessage({ type: `${PREVIEW_MESSAGE}-ready` }, window.location.origin);

        return () => window.removeEventListener("message", onMessage);
    }, []);

    return payload;
}
