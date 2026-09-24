import { useEffect, useState } from "react";
import { getTopDonators } from "../services/campaign.service";
import type { TopDonator } from "../types/topDonator";
import { acquireSocket, releaseSocket } from "../services/socket";
import { isPreviewMode, usePreviewPayload } from "../utils/preview";
import styles from "./TopDonatorsWidget.module.css";

const rankClass = (index: number) => {
    if (index === 0) return "gold";
    if (index === 1) return "silver";
    if (index === 2) return "bronze";
    return "";
};

export default function TopDonatorsWidget() {
    const [donators, setDonators] = useState<TopDonator[]>([]);

    // พรีวิว: ใช้จำนวนรายการที่กำลังแก้ไข (ยังไม่บันทึก)
    const [preview] = useState(isPreviewMode);
    const previewPayload = usePreviewPayload();
    const previewLimit = preview ? previewPayload?.campaign?.topDonatorLimit : undefined;

    useEffect(() => {
        const prevBody = document.body.style.background;
        const prevHtml = document.documentElement.style.background;

        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";
        document.body.style.margin = "0";
        document.documentElement.style.margin = "0";
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.background = prevBody;
            document.documentElement.style.background = prevHtml;
            document.body.style.margin = "";
            document.documentElement.style.margin = "";
            document.body.style.overflow = "";
        };
    }, []);

    useEffect(() => {
        // เดิม poll ทุก 5 วิ = 12 request/นาที ต่อ widget ซึ่งพอเปิดหลายตัวจากเครื่องเดียว
        // จะชน rate limit (60/นาที ต่อ IP) แล้วโดน 429 — และไม่มี try/catch
        // ทำให้ widget ค้างอยู่ที่ข้อมูลเก่าไปตลอดการไลฟ์โดยไม่มีสัญญาณอะไรเลย
        //
        // ตอนนี้อัปเดตทันทีที่มีคนโดเนทผ่าน socket แล้ว poll แค่ทุก 60 วิเป็นตัวสำรอง
        let cancelled = false;

        const load = async () => {
            try {
                const res = await getTopDonators(previewLimit && previewLimit > 0 ? previewLimit : undefined);
                if (!cancelled) setDonators(res.data ?? []);
            } catch (err) {
                // คงค่าเดิมที่แสดงอยู่ไว้ ดีกว่าล้างจอเป็นว่างเปล่ากลางไลฟ์
                console.error("getTopDonators failed", err);
            }
        };

        load();

        const interval = setInterval(load, 60000);

        const socket = acquireSocket();
        socket.on("donationPaid", load);

        return () => {
            cancelled = true;
            clearInterval(interval);
            socket.off("donationPaid", load);
            releaseSocket();
        };
    }, [previewLimit]);

    return (
        <div className={styles.widget}>
            <h1 className={styles.title}>Top Donators</h1>

            {donators.map((d, index) => (
                <div key={d.name} className={styles.item}>
                    <span className={`${styles.rank} ${styles[rankClass(index)] ?? ""}`}>
                        {index + 1}
                    </span>
                    <span className={styles.name}>{d.name}</span>
                    <span className={styles.amount}>{d.total.toLocaleString()} บาท</span>
                </div>
            ))}
        </div>
    );
}