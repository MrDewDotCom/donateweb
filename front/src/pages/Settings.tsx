import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Campaign } from "../types/campaign";
import { getCampaign, updateCampaign, createCampaign } from "../services/campaign.service";
import type { Settings, MonthlyGoalProgress } from "../types/settings";
import {
    getSettings,
    updateSettings,
    getMonthlyGoalProgress,
    getCustomSounds,
    uploadSound,
    testOverlay,
    testTts,
    getOverlayImages,
    uploadOverlayImage,
} from "../services/settings.service";
import { API_URL } from "../config/api";
import styles from "./Settings.module.css";

interface CustomSound {
    filename: string;
    url: string;
}

interface OverlayImage {
    filename: string;
    url: string;
}

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
    const [saving, setSaving] = useState(false);
    const [savingCampaign, setSavingCampaign] = useState(false);
    const [monthlyProgress, setMonthlyProgress] = useState<MonthlyGoalProgress | null>(null);
    const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
    const [overlayImages, setOverlayImages] = useState<OverlayImage[]>([]);
    const [uploadingSound, setUploadingSound] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [testingOverlay, setTestingOverlay] = useState(false);
    const [testingTts, setTestingTts] = useState(false);

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
        loadCustomSounds();
        loadOverlayImages();
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

    const loadCustomSounds = async () => {
        try {
            const res = await getCustomSounds();
            setCustomSounds(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadOverlayImages = async () => {
        try {
            const res = await getOverlayImages();
            setOverlayImages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUploadOverlayImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExt = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

        if (!allowedExt.includes(ext)) {
            alert("รองรับเฉพาะไฟล์ .png .jpg .jpeg .gif .webp เท่านั้น");
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            alert("ไฟล์ต้องไม่เกิน 8MB");
            return;
        }

        setUploadingImage(true);

        try {
            const res = await uploadOverlayImage(file);
            await loadOverlayImages();

            if (settings) {
                setSettings({
                    ...settings,
                    overlayImage: `${API_URL}${res.data.url}`,
                });
            }

            alert("อัปโหลดรูปสำเร็จ");
        } catch (err) {
            console.error(err);
            alert("อัปโหลดไม่สำเร็จ");
        } finally {
            setUploadingImage(false);
            e.target.value = "";
        }
    };

    const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedExt = [".mp3", ".wav", ".ogg"];
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();

        if (!allowedExt.includes(ext)) {
            alert("รองรับเฉพาะไฟล์ .mp3 .wav .ogg เท่านั้น");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("ไฟล์ต้องไม่เกิน 5MB");
            return;
        }

        setUploadingSound(true);

        try {
            const res = await uploadSound(file);
            await loadCustomSounds();

            // เลือกเสียงที่อัปโหลดใหม่ให้เป็นค่าที่ใช้ทันที (เก็บเป็น URL เต็มของ backend)
            if (settings) {
                setSettings({
                    ...settings,
                    alertSound: `${API_URL}${res.data.url}`,
                });
            }

            alert("อัปโหลดเสียงสำเร็จ");
        } catch (err) {
            console.error(err);
            alert("อัปโหลดไม่สำเร็จ");
        } finally {
            setUploadingSound(false);
            e.target.value = "";
        }
    };

    const handleTestOverlay = async () => {
        setTestingOverlay(true);
        try {
            await testOverlay();
        } catch (err) {
            console.error(err);
            alert("ทดสอบ Overlay ไม่สำเร็จ");
        } finally {
            setTestingOverlay(false);
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

    const handleTestTts = async () => {
        setTestingTts(true);
        try {
            const res = await testTts();
            const audio = new Audio(`${API_URL}${res.data.url}`);
            await audio.play();
        } catch (err) {
            console.error(err);
            alert("ทดสอบ TTS ไม่สำเร็จ");
        } finally {
            setTestingTts(false);
        }
    };

    const testSound = () => {
        const alertSound = settings?.alertSound ?? "donation.mp3";
        // เสียงที่อัปโหลดเองเก็บเป็น URL เต็มของ backend (http...) ส่วนเสียงตั้งต้นใช้ path ของ frontend
        const src = alertSound.startsWith("http")
            ? alertSound
            : `/sounds/${alertSound}`;

        const audio = new Audio(src);
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
                            <label className={styles.label}>รูปตอนโดเนทขึ้น</label>
                            <select
                                className={styles.select}
                                value={settings.overlayImage ?? ""}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        overlayImage: e.target.value || null,
                                    })
                                }
                            >
                                <option value="">ไม่ใช้รูป</option>
                                {overlayImages.map((img) => (
                                    <option
                                        key={img.filename}
                                        value={`${API_URL}${img.url}`}
                                    >
                                        {img.filename}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>อัปโหลดรูปใหม่</label>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.gif,.webp,image/*"
                                onChange={handleUploadOverlayImage}
                                disabled={uploadingImage}
                            />
                        </div>
                        <p className={styles.hint}>
                            รองรับ .png .jpg .jpeg .gif (ภาพเคลื่อนไหวได้) .webp ขนาดไม่เกิน 8MB
                            {uploadingImage && " — กำลังอัปโหลด..."}
                        </p>

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
                            <label className={styles.label}>เสียง TTS</label>
                            <p className={styles.hint}>
                                ใช้เสียง Microsoft Premwadee (Edge TTS) คงที่ — generate
                                จากฝั่ง backend ไม่ขึ้นกับเสียงในเบราว์เซอร์อีกต่อไป
                            </p>
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
                                <option value="donation.mp3">Donation Sound (ตั้งต้น)</option>
                                <option value="aww.mp3">AWW (ตั้งต้น)</option>

                                {customSounds.length > 0 && (
                                    <optgroup label="เสียงที่อัปโหลดเอง">
                                        {customSounds.map((s) => (
                                            <option key={s.filename} value={`${API_URL}${s.url}`}>
                                                {s.filename}
                                            </option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>อัปโหลดเสียงใหม่</label>
                            <input
                                type="file"
                                accept=".mp3,.wav,.ogg,audio/*"
                                onChange={handleUploadSound}
                                disabled={uploadingSound}
                            />
                        </div>
                        <p className={styles.hint}>
                            รองรับไฟล์ .mp3 .wav .ogg ขนาดไม่เกิน 5MB
                            {uploadingSound && " — กำลังอัปโหลด..."}
                        </p>

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
                            <button className={styles.btn} onClick={handleTestTts} disabled={testingTts}>
                                {testingTts ? "กำลังสร้างเสียง..." : "ทดสอบ TTS"}
                            </button>
                            <button className={styles.btn} onClick={testSound}>
                                ทดสอบเสียง
                            </button>
                            <button
                                className={styles.btn}
                                onClick={handleTestOverlay}
                                disabled={testingOverlay}
                            >
                                {testingOverlay ? "กำลังส่ง..." : "ทดสอบ Overlay"}
                            </button>
                        </div>
                        <p className={styles.hint}>
                            "ทดสอบ Overlay" จะส่งโดเนทตัวอย่างไปแสดงที่หน้า /overlay จริง
                            (ไม่บันทึกลงฐานข้อมูล)
                        </p>

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

                            <div className={styles.field}>
                                <label className={styles.label}>
                                    เอฟเฟกต์ดาวตกตอนหลอด Goal เต็ม
                                </label>
                                <input
                                    className={styles.checkbox}
                                    type="checkbox"
                                    checked={settings.goalEffectEnabled}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            goalEffectEnabled: e.target.checked,
                                        })
                                    }
                                />
                            </div>

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

                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>Top Donators</div>

                            <div className={styles.field}>
                                <label className={styles.label}>ช่วงเวลาที่ใช้คำนวณ</label>
                                <select
                                    className={styles.input}
                                    value={settings.topDonatorMode}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            topDonatorMode: e.target.value as Settings["topDonatorMode"],
                                        })
                                    }
                                >
                                    <option value="all">ตลอดเวลา (All-time)</option>
                                    <option value="campaign">แคมเปญที่กำลังทำงานอยู่</option>
                                    <option value="custom">กำหนดช่วงเอง</option>
                                </select>
                            </div>

                            {settings.topDonatorMode === "custom" && (
                                <>
                                    <div className={styles.field}>
                                        <label className={styles.label}>จากวันที่</label>
                                        <input
                                            className={styles.input}
                                            type="date"
                                            value={toDateInput(settings.topDonatorFrom ?? undefined)}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    topDonatorFrom: e.target.value
                                                        ? new Date(e.target.value).toISOString()
                                                        : null,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>ถึงวันที่</label>
                                        <input
                                            className={styles.input}
                                            type="date"
                                            value={toDateInput(settings.topDonatorTo ?? undefined)}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    topDonatorTo: e.target.value
                                                        ? new Date(e.target.value).toISOString()
                                                        : null,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            )}

                            {settings.topDonatorMode === "campaign" && !campaign && (
                                <p className={styles.hint}>
                                    ยังไม่มีแคมเปญที่ active — ถ้าเลือกโหมดนี้ระบบจะแสดงลิสต์ว่างไว้ก่อน
                                </p>
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
                    </>
                )}
            </div>
        </div>
    );
}