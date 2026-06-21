import { useEffect, useState } from "react";
import { getRecentDonations } from "../services/campaign.service";
import type { RecentDonation } from "../types/recentDonation";
import styles from "./RecentDonationsWidget.module.css";

export default function RecentDonationsWidget() {
    const [donations, setDonations] = useState<RecentDonation[]>([]);

    useEffect(() => {
        const load = async () => {
            const res = await getRecentDonations();
            setDonations(res.data);
        };

        load();

        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.widget}>
            <h1 className={styles.title}>Recent Donations</h1>

            {donations.map((d) => (
                <div key={d.id} className={styles.item}>
                    <span className={styles.name}>{d.name}</span>
                    {" - "}
                    <span className={styles.amount}>{d.amount.toLocaleString()} บาท</span>
                </div>
            ))}
        </div>
    );
}