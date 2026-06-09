import { useEffect, useState, } from "react";
import { getTopDonators, } from "../services/campaign.service";
import type { TopDonator, } from "../types/topDonator";
import "./TopDonatorsWidget.css";

export default function TopDonatorsWidget() {
    const [donators, setDonators] =
        useState<TopDonator[]>([]);

    useEffect(() => {
        const load =
            async () => {
                const res =
                    await getTopDonators();

                setDonators(
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
        <div className="top-widget">
            <h1>
                Top Donators
            </h1>

            {donators.map(
                (d, index) => (
                    <div
                        key={d.name}
                        className="top-item"
                    >
                        {index + 1}
                        {" "}
                        {d.name}
                        {" - "}
                        {d.total}
                        บาท
                    </div>
                ),
            )}
        </div>
    );
}