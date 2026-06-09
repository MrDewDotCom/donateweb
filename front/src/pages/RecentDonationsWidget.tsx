import { useEffect, useState, } from "react";
import { getRecentDonations, } from "../services/campaign.service"; import type { RecentDonation, } from "../types/recentDonation";
import "./RecentDonationsWidget.css";

export default function RecentDonationsWidget() {
    const [donations, setDonations] =
        useState<RecentDonation[]>([]);

    useEffect(() => {
        const load =
            async () => {
                const res =
                    await getRecentDonations();

                setDonations(
                    res.data,
                );
            };

        load();

        const interval =
            setInterval(
                load,
                5000,
            );

        return () =>
            clearInterval(
                interval,
            );
    }, []);

    return (
        <div className="recent-widget">
            <h1>
                Recent Donations
            </h1>

            {donations.map(
                (d) => (
                    <div key={d.id}
                        className="recent-item"
                    >
                        <strong>
                            {d.name}
                        </strong>

                        {" - "}

                        {d.amount}
                        บาท
                    </div>
                ),
            )}
        </div>
    );
}