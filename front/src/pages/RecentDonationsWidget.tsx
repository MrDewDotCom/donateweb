import { useEffect, useState } from "react";
import { getRecentDonations } from "../services/campaign.service";
import type { RecentDonation } from "../types/recentDonation";
import styles from "./RecentDonationsWidget.module.css";

export default function RecentDonationsWidget() {
    const [donations, setDonations] = useState<RecentDonation[]>([]);

    useEffect(() => {
        const prevBody = document.body.style.background;
        const prevHtml = document.documentElement.style.background;

        const root = document.getElementById("root");
        const prevRootBg = root?.style.background ?? "";
        const prevRootMargin = root?.style.margin ?? "";
        const prevRootWidth = root?.style.width ?? "";
        const prevRootHeight = root?.style.height ?? "";

        document.body.style.background = "transparent";
        document.documentElement.style.background = "transparent";
        document.body.style.margin = "0";
        document.documentElement.style.margin = "0";
        document.body.style.padding = "0";
        document.documentElement.style.padding = "0";
        document.body.style.width = "100%";
        document.documentElement.style.width = "100%";
        document.body.style.height = "100%";
        document.documentElement.style.height = "100%";
        document.body.style.overflow = "hidden";

        if (root) {
            root.style.background = "transparent";
            root.style.margin = "0";
            root.style.width = "100%";
            root.style.height = "100%";
        }

        return () => {
            document.body.style.background = prevBody;
            document.documentElement.style.background = prevHtml;
            document.body.style.margin = "";
            document.documentElement.style.margin = "";
            document.body.style.padding = "";
            document.documentElement.style.padding = "";
            document.body.style.width = "";
            document.documentElement.style.width = "";
            document.body.style.height = "";
            document.documentElement.style.height = "";
            document.body.style.overflow = "";

            if (root) {
                root.style.background = prevRootBg;
                root.style.margin = prevRootMargin;
                root.style.width = prevRootWidth;
                root.style.height = prevRootHeight;
            }
        };
    }, []);

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