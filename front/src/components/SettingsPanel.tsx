import { useEffect, useState, } from "react";
import { getSettings, } from "../services/settings.service";

export default function SettingsPanel() {
    const [settings,
        setSettings] =
        useState<any>();

    useEffect(() => {
        const load =
            async () => {
                const res =
                    await getSettings();

                setSettings(
                    res.data,
                );
            };

        load();
    }, []);

    if (!settings) {
        return (
            <div>
                Loading...
            </div>
        );
    }

    return (
        <div>
            <h2>
                Widget Settings
            </h2>

            <p>
                Top Limit:
                {" "}
                {
                    settings.topDonatorsLimit
                }
            </p>

            <p>
                Refresh:
                {" "}
                {
                    settings.refreshInterval
                }
            </p>

            <p>
                Sound:
                {" "}
                {
                    settings.soundEnabled
                        ? "ON"
                        : "OFF"
                }
            </p>

            <p>
                TTS:
                {" "}
                {
                    settings.ttsEnabled
                        ? "ON"
                        : "OFF"
                }
            </p>
        </div>
    );
}