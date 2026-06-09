import { useEffect, useState } from "react";

import type { Campaign } from "../types/campaign";
import { getCampaign, } from "../services/campaign.service";

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
            </div>
        </div>
    );
}