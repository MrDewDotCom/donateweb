import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "../types/campaign";
import { getCampaign, updateCampaign, createCampaign } from "../services/campaign.service";
import type { Settings, MonthlyGoalProgress } from "../types/settings";
import {
    getSettings,
    updateSettings,
    getMonthlyGoalProgress,
} from "../services/settings.service";
import styles from "./Settings.module.css";

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

type Tab = "payment" | "overlay" | "sound" | "goal";

const TABS: { key: Tab; label: string }[] = [
    { key: "payment", label: "Payment" },
    { key: "overlay", label: "Overlay" },
    { key: "sound", label: "Sound & TTS" },
    { key: "goal", label: "Donation Goal" },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("payment");

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [campaignLoaded, setCampaignLoaded] = useState(false);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [saving, setSaving] = useState(false);
    const [savingCampaign, setSavingCampaign] = useState(false);
    const [monthlyProgress, setMonthlyProgress] = useState<MonthlyGoalProgress | null>(null);

    const [campaignForm, setCampaignForm] = useState({
        title: "",
        goalAmount: 1000,
        startDate: "",
        endDate: "",
        topDonatorLimit: 3,
        recentLimit: 5,
    });

    useEffect(() => {
        loadSettings();
        loadMonthlyProgress();
    }, []);

    useEffect(() => {
        const loadVoices = () => {
            setVoices(window.speechSynthesis.getVoices());
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    const loadSettings = async () => {
        const res = await getSettings();
        setSettings(res.data);
    };

    const loadMonthlyProgress = async () => {
        try {
            const res = await getMonthlyGoalProgress();
            setMonthlyProgress(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadCampaign = async () => {
        const res = await getCampaign();
        setCampaign(res.data);

        if (res.data) {
            setCampaignForm({
                title: res.data.title,
                goalAmount: res.data.goalAmount,
                startDate: toDateInput(res.data.startDate),
                endDate: toDateInput(res.data.endDate),
                topDonatorLimit: res.data.topDonatorLimit ?? 3,
                recentLimit: res.data.recentLimit ?? 5,
            });
        }

        setCampaignLoaded(true);
    };

    useEffect(() => {
        loadCampaign();
    }, []);

    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await updateSettings(settings);
            alert("บันทึกแล้ว");
            loadMonthlyProgress();
        } catch (err: any) {
            alert(err?.response?.data?.message ?? "บันทึกไม่สำเร็จ");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCampaign = async () => {
        if (!campaignForm.title.trim()) {
            alert("กรุณากรอกชื่อแคมเปญ");
            return;
        }

        if (!campaignForm.startDate || !campaignForm.endDate) {
            alert("กรุณาเลือกวันเริ่ม-สิ้นสุดแคมเปญ");
            return;
        }

        setSavingCampaign(true);

        try {
            const payload = {
                title: campaignForm.title,
                goalAmount: campaignForm.goalAmount,
                startDate: campaignForm.startDate,
                endDate: campaignForm.endDate,
                topDonatorLimit: campaignForm.topDonatorLimit,
                recentLimit: campaignForm.recentLimit,
            };

            if (campaign) {
                await updateCampaign(campaign.id, payload);
            } else {
                await createCampaign(payload);
            }

            alert("บันทึกแคมเปญแล้ว");
            await loadCampaign();
        } catch (err) {
            console.error(err);
            alert("บันทึกแคมเปญไม่สำเร็จ");
        } finally {
            setSavingCampaign(false);
        }
    };

    const testTts = () => {
        if (!settings) return;

        const text = settings.readMessageEnabled
            ? "สวัสดี นี่คือการทดสอบเสียงอ่านข้อความ"
            : "ทดสอบ ผู้บริจาค บริจาคหนึ่งร้อยบาท";

        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "th-TH";

        const selectedVoice = voices.find((v) => v.name === settings.ttsVoice);
        if (selectedVoice) speech.voice = selectedVoice;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
    };

    const testSound = () => {
        const audio = new Audio(`/sounds/${settings?.alertSound ?? "donation.mp3"}`);
        audio.volume = (settings?.alertVolume ?? 100) / 100;
        audio.play();
    };

    if (!settings || !campaignLoaded) {
        return (
            <div className={styles.page}>
                <div className={styles.loadingWrap}>กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Settings</h1>
                    <Link to="/admin" className={styles.backLink}>
                        ← กลับ Dashboard
                    </Link>
                </div>

                <div className={styles.tabs}>
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            className={`${styles.tab} ${activeTab === t.key ? styles.active : ""}`}
                            onClick={() => setActiveTab(t.key)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ---------- Payment ---------- */}
                {activeTab === "payment" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>Payment</div>

                        <div className={styles.field}>
                            <label className={styles.label}>เลขพร้อมเพย์</label>
                            <input
                                className={styles.input}
                                type="text"
                                value={settings.promptpayNumber ?? ""}
                                onChange={(e) =>
                                    setSettings({ ...settings, promptpayNumber: e.target.value })
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>จำนวนโดเนทขั้นต่ำ (บาท)</label>
                            <input
                                className={styles.input}
                                type="number"
                                min={0}
                                value={settings.minDonationAmount ?? ""}
                                placeholder="ไม่จำกัด"
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        minDonationAmount: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>จำนวนโดเนทสูงสุด (บาท)</label>
                            <input
                                className={styles.input}
                                type="number"
                                min={1}
                                value={settings.maxDonationAmount ?? ""}
                                placeholder="ไม่จำกัด"
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        maxDonationAmount: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                    })
                                }
                            />
                        </div>
                        <p className={styles.hint}>
                            เว้นว่างไว้ = ไม่จำกัดจำนวนเงินที่โดเนทได้
                        </p>

                        <button
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={handleSave}
                            disabled={saving}
                            style={{ width: "100%" }}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                        </button>
                    </div>
                )}

                {/* ---------- Overlay ---------- */}
                {activeTab === "overlay" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>Overlay</div>

                        <div className={styles.field}>
                            <label className={styles.label}>ระยะเวลาแสดง Alert (วินาที)</label>
                            <input
                                className={styles.input}
                                type="number"
                                value={settings.overlayDuration}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        overlayDuration: Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Animation</label>
                            <select
                                className={styles.select}
                                value={settings.overlayAnimation}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        overlayAnimation: e.target.value as Settings["overlayAnimation"],
                                    })
                                }
                            >
                                <option value="fade">Fade</option>
                                <option value="slide">Slide</option>
                                <option value="zoom">Zoom</option>
                                <option value="bounce">Bounce</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>รูปตอนโดเนทขึ้น (URL)</label>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="https://... หรือ /images/xxx.png"
                                value={settings.overlayImage ?? ""}
                                onChange={(e) =>
                                    setSettings({ ...settings, overlayImage: e.target.value })
                                }
                            />
                        </div>

                        {settings.overlayImage && (
                            <img
                                src={settings.overlayImage}
                                alt="Overlay preview"
                                className={styles.imagePreview}
                            />
                        )}

                        <button
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={handleSave}
                            disabled={saving}
                            style={{ width: "100%", marginTop: 16 }}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                        </button>
                    </div>
                )}

                {/* ---------- Sound & TTS ---------- */}
                {activeTab === "sound" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>Sound & TTS</div>

                        <div className={styles.field}>
                            <label className={styles.label}>เปิด/ปิด TTS</label>
                            <input
                                className={styles.checkbox}
                                type="checkbox"
                                checked={settings.ttsEnabled}
                                onChange={(e) =>
                                    setSettings({ ...settings, ttsEnabled: e.target.checked })
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>เลือกเสียง TTS</label>
                            <select
                                className={styles.select}
                                value={settings.ttsVoice ?? ""}
                                onChange={(e) =>
                                    setSettings({ ...settings, ttsVoice: e.target.value })
                                }
                            >
                                <option value="">Default</option>
                                {voices
                                    .filter((v) => v.lang === "th-TH")
                                    .map((v) => (
                                        <option key={v.name} value={v.name}>
                                            {v.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>อ่านข้อความผู้บริจาคหรือไม่</label>
                            <input
                                className={styles.checkbox}
                                type="checkbox"
                                checked={settings.readMessageEnabled}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        readMessageEnabled: e.target.checked,
                                    })
                                }
                            />
                        </div>
                        <p className={styles.hint}>
                            ถ้าปิด TTS จะอ่านแค่ "ชื่อ บริจาค จำนวนเงิน" โดยไม่อ่านข้อความที่ฝากมา
                        </p>

                        <div className={styles.field}>
                            <label className={styles.label}>เสียงแจ้งเตือน</label>
                            <select
                                className={styles.select}
                                value={settings.alertSound}
                                onChange={(e) =>
                                    setSettings({ ...settings, alertSound: e.target.value })
                                }
                            >
                                <option value="donation.mp3">Donation Sound</option>
                                <option value="aww.mp3">AWW</option>
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Volume</label>
                            <input
                                className={styles.input}
                                type="number"
                                min={0}
                                max={100}
                                value={settings.alertVolume}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        alertVolume: Number(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className={styles.actionsRow}>
                            <button className={styles.btn} onClick={testTts}>
                                ทดสอบ TTS
                            </button>
                            <button className={styles.btn} onClick={testSound}>
                                ทดสอบเสียง
                            </button>
                        </div>

                        <button
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={handleSave}
                            disabled={saving}
                            style={{ width: "100%", marginTop: 16 }}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                        </button>
                    </div>
                )}

                {/* ---------- Donation Goal ---------- */}
                {activeTab === "goal" && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>เป้าหมายเดือนนี้</div>

                            <div className={styles.field}>
                                <label className={styles.label}>เป้าหมายรายเดือน (บาท)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={1}
                                    placeholder="ไม่ได้ตั้งไว้"
                                    value={settings.monthlyGoalAmount ?? ""}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            monthlyGoalAmount: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>รีเซ็ตอัตโนมัติทุกเดือน</label>
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    checked={settings.monthlyGoalAutoReset}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            monthlyGoalAutoReset: e.target.checked,
                                        })
                                    }
                                />
                            </div>
                            <p className={styles.hint}>
                                เปิด = นับยอดเฉพาะเดือนปัจจุบัน (รีเซ็ตเองทุกวันที่ 1) <br />
                                ปิด = นับยอดสะสมทั้งหมดตลอดเวลาเทียบกับเป้านี้
                            </p>

                            {monthlyProgress && (
                                <div className={styles.goalProgressBox}>
                                    ตอนนี้: {monthlyProgress.currentAmount.toLocaleString()} /{" "}
                                    {monthlyProgress.goalAmount.toLocaleString()} บาท (
                                    {monthlyProgress.percentage}%)
                                </div>
                            )}

                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={handleSave}
                                disabled={saving}
                                style={{ width: "100%", marginTop: 16 }}
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                            </button>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>
                                เป้าหมายสตรีม (Campaign) {!campaign && "— ยังไม่มี ต้องสร้างใหม่"}
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>ชื่อแคมเปญ</label>
                                <input
                                    className={styles.input}
                                    type="text"
                                    value={campaignForm.title}
                                    onChange={(e) =>
                                        setCampaignForm({ ...campaignForm, title: e.target.value })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>เป้าหมาย (บาท)</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={1}
                                    value={campaignForm.goalAmount}
                                    onChange={(e) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            goalAmount: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>วันเริ่มแคมเปญ</label>
                                <input
                                    className={styles.input}
                                    type="date"
                                    value={campaignForm.startDate}
                                    onChange={(e) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            startDate: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>วันสิ้นสุดแคมเปญ</label>
                                <input
                                    className={styles.input}
                                    type="date"
                                    value={campaignForm.endDate}
                                    onChange={(e) =>
                                        setCampaignForm({ ...campaignForm, endDate: e.target.value })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>จำนวนคนใน Top Donators</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={1}
                                    value={campaignForm.topDonatorLimit}
                                    onChange={(e) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            topDonatorLimit: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>จำนวนรายการใน Recent Donations</label>
                                <input
                                    className={styles.input}
                                    type="number"
                                    min={1}
                                    value={campaignForm.recentLimit}
                                    onChange={(e) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            recentLimit: Number(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={handleSaveCampaign}
                                disabled={savingCampaign}
                                style={{ width: "100%", marginTop: 8 }}
                            >
                                {savingCampaign
                                    ? "กำลังบันทึก..."
                                    : campaign
                                        ? "บันทึกแคมเปญ"
                                        : "สร้างแคมเปญใหม่"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}