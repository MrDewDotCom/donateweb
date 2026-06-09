import { useEffect, useState } from "react";

import type { Campaign } from "../types/campaign";
import { getCampaign, updateCampaign } from "../services/campaign.service";

export default function SettingsPage() {
    const [campaign,
        setCampaign] =
        useState<Campaign | null>(
            null,
        );

    useEffect(() => {
        const loadCampaign =
            async () => {
                const res =
                    await getCampaign();

                setCampaign(
                    res.data,
                );
            };

        loadCampaign();
    }, []);

    const handleSave =
        async () => {
            if (!campaign) return;

            await updateCampaign(
                campaign.id,
                campaign,
            );

            alert("Saved");
        };

    if (!campaign) {
        return <p>Loading...</p>;
    }

    return (
        <div>
            <h1>
                Campaign Settings
            </h1>

            <div>
                <label>
                    Title
                </label>

                <input
                    value={campaign.title}
                    onChange={(e) =>
                        setCampaign({
                            ...campaign,
                            title:
                                e.target.value,
                        })
                    }
                />

                <br />

                <label>
                    Goal Amount
                </label>

                <input
                    type="number"
                    value={
                        campaign.goalAmount
                    }
                    onChange={(e) =>
                        setCampaign({
                            ...campaign,
                            goalAmount:
                                Number(
                                    e.target.value,
                                ),
                        })
                    }
                />

                <br />

                <label>
                    Top Donator Limit
                </label>

                <input
                    type="number"
                    value={
                        campaign.topDonatorLimit
                    }
                    onChange={(e) =>
                        setCampaign({
                            ...campaign,
                            topDonatorLimit:
                                Number(
                                    e.target.value,
                                ),
                        })
                    }
                />

                <br />

                <label>
                    Recent Donation Limit
                </label>

                <input
                    type="number"
                    value={
                        campaign.recentLimit
                    }
                    onChange={(e) =>
                        setCampaign({
                            ...campaign,
                            recentLimit:
                                Number(
                                    e.target.value,
                                ),
                        })
                    }
                />

                <br />

                <label>
                    Start Date
                </label>

                <input
                    type="date"
                    value={
                        campaign.startDate
                            .split("T")[0]
                    }
                />

                <label>
                    End Date
                </label>

                <input
                    type="date"
                    value={
                        campaign.endDate
                            .split("T")[0]
                    }
                />

            </div>
            <button onClick={handleSave} >
                Save
            </button>
        </div>
    );
}