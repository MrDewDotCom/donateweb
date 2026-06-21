import { useEffect, useState } from "react";
import { getTopDonators } from "../services/campaign.service";
import type { TopDonator } from "../types/topDonator";
import styles from "./TopDonatorsWidget.module.css";

const rankClass = (index: number) => {
    if (index === 0) return "gold";
    if (index === 1) return "silver";
    if (index === 2) return "bronze";
    return "";
};

export default function TopDonatorsWidget() {
    const [donators, setDonators] = useState<TopDonator[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await getTopDonators();
            setDonators(res.data);
        };

        load();

        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

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