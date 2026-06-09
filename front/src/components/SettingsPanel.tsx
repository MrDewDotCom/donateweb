import { useEffect, useState, } from "react";
import { getSettings, } from "../services/settings.service";
import type { Settings } from "../types/settings";
import { updateSettings, } from "../services/settings.service";

export default function SettingsPanel() {
    const [settings, setSettings] =
        useState<Settings>();

    const [saving, setSaving] =
        useState(false);

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

    const save = async () => {
        if (!settings) return;

        setSaving(true);

        await updateSettings(
            settings,
        );

        setSaving(false);

        alert(
            "Saved",
        );
    };

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

            <div>
                <label>
                    Top Limit
                </label>

                <input
                    type="number"
                    value={
                        settings.topDonatorsLimit
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            topDonatorsLimit:
                                Number(
                                    e.target.value,
                                ),
                        })
                    }
                />
            </div>

            <div>
                <label>
                    Refresh
                </label>

                <input
                    type="number"
                    value={
                        settings.refreshInterval
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            refreshInterval:
                                Number(
                                    e.target.value,
                                ),
                        })
                    }
                />
            </div>

            <div>
                <label>
                    Sound
                </label>

                <input
                    type="checkbox"
                    checked={
                        settings.soundEnabled
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            soundEnabled:
                                e.target.checked,
                        })
                    }
                />
            </div>

            <div>
                <label>
                    TTS
                </label>

                <input
                    type="checkbox"
                    checked={
                        settings.ttsEnabled
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            ttsEnabled:
                                e.target.checked,
                        })
                    }
                />
            </div>
            <button
                onClick={save}
                disabled={saving}
            >
                Save
            </button>
        </div>
    );
}