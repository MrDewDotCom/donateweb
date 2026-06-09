import { useEffect, useState, } from "react";
import "./GoalWidget.css";
import { getProgress, } from "../services/campaign.service";

export default function GoalWidget() {
    const [progress,
        setProgress] =
        useState<any>(null);

    useEffect(() => {
        const load =
            async () => {
                const res =
                    await getProgress();

                setProgress(
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

    if (!progress) {
        return <p>Loading...</p>;
    }

    return (
        <div className="goal-widget">
            <h1>
                {progress.title}
            </h1>

            <div
                style={{
                    width: "500px",
                    height: "30px",
                    background: "#333",
                    borderRadius: "20px",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width:
                            `${progress.percentage}%`,
                        height: "100%",
                        background:
                            "#00ff88",
                    }}
                />
            </div>



            <h2>
                {progress.currentAmount}
                /
                {progress.goalAmount}
                บาท
            </h2>

            <h3>
                {progress.percentage}%
            </h3>
        </div>
    );
}