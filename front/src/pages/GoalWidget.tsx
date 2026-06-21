import { useEffect, useState } from "react";
import { getProgress } from "../services/campaign.service";
import styles from "./GoalWidget.module.css";

interface Progress {
    title: string;
    currentAmount: number;
    goalAmount: number;
    percentage: number;
}

export default function GoalWidget() {
    const [progress, setProgress] = useState<Progress | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const load = async () => {
            const res = await getProgress();
            setProgress(res.data);
            setLoaded(true);
        };

        load();

        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!loaded) {
        return <p className={styles.loadingWrap}>Loading...</p>;
    }

    if (!progress) {
        return <p className={styles.loadingWrap}>ยังไม่มีแคมเปญที่เปิดใช้งาน</p>;
    }

    const pct = Math.min(100, Math.max(0, progress.percentage));

    return (
        <div className={styles.widget}>
            <h1 className={styles.title}>{progress.title}</h1>

            <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%` }} />
            </div>

            <h2 className={styles.amountText}>
                {progress.currentAmount.toLocaleString()} /{" "}
                {progress.goalAmount.toLocaleString()} บาท
            </h2>

            <h3 className={styles.percentText}>{pct}%</h3>
        </div>
    );
}