import { useEffect, useState } from "react";
import type { Campaign } from "../types/campaign";
import { getCampaign, updateCampaign, } from "../services/campaign.service";

import type { Settings } from "../types/settings";

import {
    getSettings,
    updateSettings,
} from "../services/settings.service";

export default function SettingsPage() {

    const [campaign, setCampaign] =
        useState<Campaign | null>(null,);

    const [settings, setSettings] =
        useState<Settings | null>(null);

    const [voices, setVoices] =
        useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {

        const loadVoices =
            () => {

                const list =
                    window
                        .speechSynthesis
                        .getVoices();

                setVoices(
                    list,
                );
            };

        loadVoices();

        window
            .speechSynthesis
            .onvoiceschanged =
            loadVoices;

    }, []);

    const loadSettings =
        async () => {

            const res =
                await getSettings();

            setSettings(
                res.data,
            );
        };

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

            if (!settings)
                return;

            await updateSettings(
                settings,
            );

            alert(
                "Saved",
            );
        };

    const testTts = () => {

        const speech =
            new SpeechSynthesisUtterance(
                "สวัสดี นี่คือการทดสอบเสียงอ่านข้อความ",
            );

        speech.lang = "th-TH";

        const selectedVoice =
            voices.find(
                (voice) =>
                    voice.name ===
                    settings?.ttsVoice,
            );

        if (selectedVoice) {
            speech.voice =
                selectedVoice;
        }

        window
            .speechSynthesis
            .cancel();

        window
            .speechSynthesis
            .speak(
                speech,
            );
    };
    const testSound =
        () => {

            const audio =
                new Audio(
                    `/sounds/${settings?.alertSound ??
                    "donation.mp3"
                    }`,
                );

            audio.volume =
                (
                    settings?.alertVolume ??
                    100
                ) / 100;

            audio.play();
        };

    if (
        !campaign ||
        !settings
    ) {
        return (
            <p>
                Loading...
            </p>
        );
    }

    return (
        <div>

            <h1>
                Settings
            </h1>

            <div>

                <label>
                    Enable TTS
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
                                e.target
                                    .checked,
                        })
                    }
                />

            </div>

            <div>

                <label>
                    TTS Voice
                </label>

                <select
                    value={
                        settings.ttsVoice ??
                        ""
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            ttsVoice:
                                e.target.value,
                        })
                    }
                >

                    <option value="">
                        Default
                    </option>

                    {voices
                        .filter(
                            (voice) =>
                                voice.lang ===
                                "th-TH",
                        )
                        .map(
                            (voice) => (
                                <option
                                    key={
                                        voice.name
                                    }
                                    value={
                                        voice.name
                                    }
                                >
                                    {voice.name}
                                </option>
                            ),
                        )}

                </select>

            </div>

            <div>

                <label>
                    Overlay Duration
                </label>

                <input
                    type="number"
                    value={
                        settings.overlayDuration
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            overlayDuration:
                                Number(
                                    e.target
                                        .value,
                                ),
                        })
                    }
                />

            </div>

            <div>

                <label>
                    Alert Volume
                </label>

                <input
                    type="number"
                    value={
                        settings.alertVolume
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            alertVolume:
                                Number(
                                    e.target
                                        .value,
                                ),
                        })
                    }
                />

            </div>

            <div>
                <label>
                    Alert Sound
                </label>

                <select
                    value={
                        settings.alertSound
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            alertSound:
                                e.target.value,
                        })
                    }
                >
                    <option value="donation.mp3">
                        Donation Sound
                    </option>

                    <option value="aww.mp3">
                        AWW
                    </option>

                </select>
            </div>
            <div>
                <label>
                    PromptPay Number
                </label>

                <input
                    type="text"
                    value={
                        settings.promptpayNumber ?? ""
                    }
                    onChange={(e) =>
                        setSettings({
                            ...settings,
                            promptpayNumber:
                                e.target.value,
                        })
                    }
                />
            </div>

            <button
                onClick={
                    handleSave
                }
            >
                Save
            </button>
            <br />
            <button
                onClick={
                    testTts
                }
            >
                Test TTS
            </button>
            <br />
            <button
                onClick={
                    testSound
                }
            >
                Test Sound
            </button>


        </div>
    );
}