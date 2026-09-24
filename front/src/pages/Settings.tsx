import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NumberInput, OptionalNumberInput } from "../components/NumberInput";
import type { Campaign } from "../types/campaign";
import { getCampaign, updateCampaign, createCampaign } from "../services/campaign.service";
import type { Settings, MonthlyGoalProgress } from "../types/settings";
import {
    getAdminSettings,
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
import { toDateInputValue } from "../utils/date";
import { resolveAlertSoundUrl, resolveBackendAsset } from "../utils/assets";
import TimerControlPanel from "../components/TimerControlPanel";
import VideoQueuePanel from "../components/VideoQueuePanel";
import WidgetPreview from "../components/WidgetPreview";
import type { PreviewPayload } from "../utils/preview";
import { formatDuration, secondsForAmount, videoSecondsForAmount } from "../utils/duration";
import styles from "./Settings.module.css";

interface CustomSound {
    filename: string;
    url: string;
}

interface OverlayImage {
    filename: string;
    url: string;
}

// เดิมเป็น iso.slice(0, 10) ซึ่งอ่านวันที่แบบ UTC ทำให้ช่องวันที่เลื่อนไป 1 วัน
// ตอนนี้ย้ายไปใช้ตัวแปลงที่รู้จัก timezone ใน utils/date.ts
const toDateInput = toDateInputValue;

export type SettingsSection = "alert" | "goal" | "top" | "recent" | "timer" | "video" | "payment";

const SECTION_TITLES: Record<SettingsSection, string> = {
    alert: "Alert & เสียง",
    goal: "Goal",
    top: "Top Donators",
    recent: "Recent Donations",
    timer: "Timer (โดเนทจับเวลา)",
    video: "Video (โดเนทคลิป)",
    payment: "การชำระเงิน",
};

// เปิด/ปิดรับโดเนทแต่ละแบบย้ายไปอยู่หน้า "รูปแบบการโดเนท" แล้ว — ที่นี่แสดงสถานะอย่างเดียว
function TypeStatus({ enabled }: { enabled: boolean }) {
    return (
        <div className={`${styles.typeStatus} ${enabled ? styles.typeStatusOn : ""}`}>
            <span>
                สถานะ: <b>{enabled ? "เปิดรับอยู่" : "ปิดอยู่"}</b>
            </span>
            <Link to="/admin/types" className={styles.backLink}>
                เปิด/ปิดที่หน้า รูปแบบการโดเนท →
            </Link>
        </div>
    );
}

// สีข้อความใน alert — ค่าเดิมต้องตรงกับ default ใน schema.prisma
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const ALERT_COLOR_FIELDS: {
    key: "alertNameColor" | "alertAmountColor" | "alertMessageColor";
    label: string;
    default: string;
}[] = [
    { key: "alertNameColor", label: "สีชื่อผู้บริจาค", default: "#ffffff" },
    { key: "alertAmountColor", label: "สีจำนวนเงิน", default: "#00ff88" },
    { key: "alertMessageColor", label: "สีข้อความที่ส่งมา", default: "#ffffff" },
];

// widget ที่มีพรีวิวสด (payment ไม่มี)
const SECTION_PREVIEW: Partial<Record<SettingsSection, {
    path: string;
    height: number;
    obsSize: string;
    replayable?: boolean;
}>> = {
    alert: { path: "/overlay", height: 380, obsSize: "1920 × 1080", replayable: true },
    goal: { path: "/goal", height: 220, obsSize: "600 × 200" },
    top: { path: "/top", height: 380, obsSize: "400 × 400" },
    recent: { path: "/recent", height: 380, obsSize: "400 × 400" },
    timer: { path: "/timer", height: 260, obsSize: "400 × 220" },
    video: { path: "/video", height: 340, obsSize: "1920 × 1080" },
};

// หน้าตั้งค่าแต่ละส่วน (เลือกจาก sidebar) — widget มีพรีวิวสดอยู่ด้านขวา
export default function SettingsPage({ section }: { section: SettingsSection }) {

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
        const res = await getAdminSettings();
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
                    // เก็บเป็น path อย่างเดียว ไม่ผูกกับ host (ดูเหตุผลใน utils/assets.ts)
                    overlayImage: res.data.url,
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

            // เลือกเสียงที่อัปโหลดใหม่ให้เป็นค่าที่ใช้ทันที (เก็บเป็น path อย่างเดียว)
            if (settings) {
                setSettings({
                    ...settings,
                    alertSound: res.data.url,
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
        const audio = new Audio(resolveAlertSoundUrl(settings?.alertSound));
        audio.volume = (settings?.alertVolume ?? 100) / 100;
        audio.play();
    };

    // ค่าที่กำลังแก้ไข (ยังไม่บันทึก) ส่งให้พรีวิว
    const previewPayload = useMemo<PreviewPayload>(
        () => ({
            settings: settings ?? undefined,
            campaign: {
                title: campaignForm.title,
                goalAmount: campaignForm.goalAmount,
                topDonatorLimit: campaignForm.topDonatorLimit,
                recentLimit: campaignForm.recentLimit,
            },
        }),
        [settings, campaignForm],
    );
    const previewConfig = SECTION_PREVIEW[section];

    // พรีวิวแบบมีเสียง: สร้าง TTS ตัวอย่างถ้าเปิด TTS (ตามค่าที่กำลังแก้อยู่)
    const previewTtsUrl = async () => {
        if (!settings?.ttsEnabled) return null;
        const res = await testTts();
        return res.data.url;
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
            <div className={`${styles.container} ${previewConfig ? styles.containerWide : ""}`}>
                <div className={styles.header}>
                    <h1 className={styles.title}>{SECTION_TITLES[section]}</h1>
                </div>

                <div className={previewConfig ? styles.split : undefined}>
                <div className={styles.formCol}>
                {/* ---------- Payment ---------- */}
                {section === "payment" && (
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
                            <OptionalNumberInput
                                className={styles.input}
                                min={0}
                                value={settings.minDonationAmount}
                                placeholder="ไม่จำกัด"
                                onChange={(v) =>
                                    setSettings({
                                        ...settings,
                                        minDonationAmount: v,
                                    })
                                }
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>จำนวนโดเนทสูงสุด (บาท)</label>
                            <OptionalNumberInput
                                className={styles.input}
                                min={1}
                                value={settings.maxDonationAmount}
                                placeholder="ไม่จำกัด"
                                onChange={(v) =>
                                    setSettings({
                                        ...settings,
                                        maxDonationAmount: v,
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

                {/* ---------- Timer donation ---------- */}
                {section === "timer" && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>ตั้งค่าโดเนทจับเวลา</div>

                            <TypeStatus enabled={settings.timerEnabled} />

                            <div className={`${styles.field} ${styles.fieldStack}`}>
                                <label className={styles.label}>เรท (กี่บาท = กี่นาที)</label>
                                <div className={styles.rateRow}>
                                    <span>฿</span>
                                    <NumberInput
                                        className={styles.input}
                                        min={1}
                                        value={settings.timerRateAmount}
                                        onChange={(v) =>
                                            setSettings({ ...settings, timerRateAmount: v })
                                        }
                                    />
                                    <span>=</span>
                                    <NumberInput
                                        className={styles.input}
                                        min={1}
                                        value={settings.timerRateMinutes}
                                        onChange={(v) =>
                                            setSettings({ ...settings, timerRateMinutes: v })
                                        }
                                    />
                                    <span>นาที</span>
                                </div>
                                <p className={styles.hint}>
                                    ตัวอย่าง: โดเนท ฿100 ได้{" "}
                                    <b>
                                        {formatDuration(
                                            secondsForAmount(100, settings.timerRateAmount, settings.timerRateMinutes),
                                        )}
                                    </b>
                                    {" · "}฿50 ได้{" "}
                                    <b>
                                        {formatDuration(
                                            secondsForAmount(50, settings.timerRateAmount, settings.timerRateMinutes),
                                        )}
                                    </b>
                                </p>
                            </div>

                            <div className={`${styles.field} ${styles.fieldStack}`}>
                                <label className={styles.label}>ขั้นต่ำเฉพาะโดเนทจับเวลา (บาท)</label>
                                <OptionalNumberInput
                                    className={styles.input}
                                    min={1}
                                    value={settings.timerMinAmount}
                                    placeholder="ใช้ขั้นต่ำทั่วไป"
                                    onChange={(v) =>
                                        setSettings({
                                            ...settings,
                                            timerMinAmount: v,
                                        })
                                    }
                                />
                                <p className={styles.hint}>
                                    เปลี่ยนเรทแล้ว รายการที่กำลังรอจ่ายเงินยังได้เวลาตามเรทเดิมตอนที่กดสร้าง
                                </p>
                            </div>

                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={handleSave}
                                disabled={saving || settings.timerRateAmount < 1 || settings.timerRateMinutes < 1}
                                style={{ width: "100%" }}
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                            </button>
                        </div>

                        <TimerControlPanel />
                    </>
                )}

                {/* ---------- Video clip donation ---------- */}
                {section === "video" && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>ตั้งค่าโดเนทคลิป</div>

                            <TypeStatus enabled={settings.videoEnabled} />

                            <div className={`${styles.field} ${styles.fieldStack}`}>
                                <label className={styles.label}>เรท (กี่บาท = เล่นกี่วินาที)</label>
                                <div className={styles.rateRow}>
                                    <span>฿</span>
                                    <NumberInput
                                        className={styles.input}
                                        min={1}
                                        value={settings.videoRateAmount}
                                        onChange={(v) => setSettings({ ...settings, videoRateAmount: v })}
                                    />
                                    <span>=</span>
                                    <NumberInput
                                        className={styles.input}
                                        min={1}
                                        value={settings.videoRateSeconds}
                                        onChange={(v) => setSettings({ ...settings, videoRateSeconds: v })}
                                    />
                                    <span>วินาที</span>
                                </div>
                                <p className={styles.hint}>
                                    ตัวอย่าง: ฿50 เล่นได้{" "}
                                    <b>
                                        {formatDuration(
                                            videoSecondsForAmount(50, settings.videoRateAmount, settings.videoRateSeconds, settings.videoMaxSeconds),
                                        )}
                                    </b>
                                    {" · "}฿100 เล่นได้{" "}
                                    <b>
                                        {formatDuration(
                                            videoSecondsForAmount(100, settings.videoRateAmount, settings.videoRateSeconds, settings.videoMaxSeconds),
                                        )}
                                    </b>
                                </p>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>เล่นนานสุดต่อคลิป (วินาที)</label>
                                <NumberInput
                                    className={styles.input}
                                    min={5}
                                    value={settings.videoMaxSeconds}
                                    onChange={(v) => setSettings({ ...settings, videoMaxSeconds: v })}
                                />
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>ขั้นต่ำเฉพาะโดเนทคลิป (บาท)</label>
                                <OptionalNumberInput
                                    className={styles.input}
                                    min={1}
                                    value={settings.videoMinAmount}
                                    placeholder="ใช้ขั้นต่ำทั่วไป"
                                    onChange={(v) =>
                                        setSettings({ ...settings, videoMinAmount: v })
                                    }
                                />
                            </div>

                            <div className={`${styles.field} ${styles.fieldStack}`}>
                                <label className={styles.label}>รอหลัง alert ก่อนเริ่มคลิป (วินาที)</label>
                                <NumberInput
                                    className={styles.input}
                                    min={0}
                                    value={settings.videoStartDelay}
                                    onChange={(v) => setSettings({ ...settings, videoStartDelay: v })}
                                />
                                <p className={styles.hint}>
                                    กันเสียงคลิปทับกับเสียง alert/TTS — ถ้า TTS อ่านข้อความยาว ให้เพิ่มค่านี้
                                </p>
                            </div>

                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={handleSave}
                                disabled={
                                    saving ||
                                    settings.videoRateAmount < 1 ||
                                    settings.videoRateSeconds < 1 ||
                                    settings.videoMaxSeconds < 5
                                }
                                style={{ width: "100%" }}
                            >
                                {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                            </button>
                        </div>

                        <VideoQueuePanel />
                    </>
                )}

                {/* ---------- Overlay ---------- */}
                {section === "alert" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>Overlay</div>

                        <div className={styles.field}>
                            <label className={styles.label}>ระยะเวลาแสดง Alert (วินาที)</label>
                            <NumberInput
                                className={styles.input}
                                value={settings.overlayDuration}
                                onChange={(v) =>
                                    setSettings({
                                        ...settings,
                                        overlayDuration: v,
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
                                        value={img.url}
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
                                src={resolveBackendAsset(settings.overlayImage)}
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

                {/* ---------- Alert text colors ---------- */}
                {section === "alert" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>สีข้อความ</div>

                        {ALERT_COLOR_FIELDS.map((f) => (
                            <div key={f.key} className={styles.field}>
                                <label className={styles.label} htmlFor={f.key}>{f.label}</label>
                                <div className={styles.colorRow}>
                                    <input
                                        id={f.key}
                                        type="color"
                                        className={styles.colorSwatch}
                                        value={settings[f.key]}
                                        onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                                    />
                                    <input
                                        className={`${styles.input} ${styles.colorHex}`}
                                        value={settings[f.key]}
                                        maxLength={7}
                                        aria-label={`${f.label} (รหัสสี)`}
                                        onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className={styles.btn}
                                        disabled={settings[f.key].toLowerCase() === f.default}
                                        onClick={() => setSettings({ ...settings, [f.key]: f.default })}
                                    >
                                        ค่าเดิม
                                    </button>
                                </div>
                            </div>
                        ))}
                        <p className={styles.hint}>ดูผลได้ทันทีในพรีวิวด้านขวา — บนไลฟ์จะเปลี่ยนหลังกดบันทึก</p>

                        <button
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={handleSave}
                            disabled={saving || ALERT_COLOR_FIELDS.some((f) => !HEX_COLOR.test(settings[f.key]))}
                            style={{ width: "100%" }}
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                        </button>
                    </div>
                )}

                {/* ---------- Sound & TTS ---------- */}
                {section === "alert" && (
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

                        <div className={`${styles.field} ${styles.fieldStack}`}>
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
                                            <option key={s.filename} value={s.url}>
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
                            <NumberInput
                                className={styles.input}
                                min={0}
                                max={100}
                                value={settings.alertVolume}
                                onChange={(v) =>
                                    setSettings({
                                        ...settings,
                                        alertVolume: v,
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
                                {testingOverlay ? "กำลังส่ง..." : "ส่งทดสอบขึ้นไลฟ์จริง"}
                            </button>
                        </div>
                        <p className={styles.hint}>
                            "ส่งทดสอบขึ้นไลฟ์จริง" จะส่งโดเนทตัวอย่างไปแสดงที่หน้า /overlay จริง
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
                {section === "goal" && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>เป้าหมายเดือนนี้</div>

                            <div className={styles.field}>
                                <label className={styles.label}>เป้าหมายรายเดือน (บาท)</label>
                                <OptionalNumberInput
                                    className={styles.input}
                                    min={1}
                                    placeholder="ไม่ได้ตั้งไว้"
                                    value={settings.monthlyGoalAmount}
                                    onChange={(v) =>
                                        setSettings({
                                            ...settings,
                                            monthlyGoalAmount: v,
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
                                <NumberInput
                                    className={styles.input}
                                    min={1}
                                    value={campaignForm.goalAmount}
                                    onChange={(v) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            goalAmount: v,
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

                {section === "top" && (
                    <>
                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>จำนวนที่แสดง</div>
                            <div className={styles.field}>
                                <label className={styles.label}>จำนวนคนใน Top Donators</label>
                                <NumberInput
                                    className={styles.input}
                                    min={1}
                                    max={20}
                                    value={campaignForm.topDonatorLimit}
                                    onChange={(v) =>
                                        setCampaignForm({
                                            ...campaignForm,
                                            topDonatorLimit: v,
                                        })
                                    }
                                />
                            </div>
                            {!campaign && (
                                <p className={styles.hint}>ต้องสร้างแคมเปญในหน้า Goal ก่อน ถึงจะบันทึกค่านี้ได้</p>
                            )}
                            <button
                                className={`${styles.btn} ${styles.primary}`}
                                onClick={handleSaveCampaign}
                                disabled={savingCampaign || !campaign}
                                style={{ width: "100%", marginTop: 8 }}
                            >
                                {savingCampaign ? "กำลังบันทึก..." : "บันทึก"}
                            </button>
                        </div>

                        <div className={styles.card}>
                            <div className={styles.sectionTitle}>ช่วงเวลาที่ใช้จัดอันดับ</div>

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
                                            value={toDateInput(settings.topDonatorFrom)}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    // ส่งเป็น "YYYY-MM-DD" ตรงๆ ให้ backend ขยายเป็นต้นวันตามเวลาไทยเอง
                                                    // เดิมแปลงเป็น ISO ที่ฝั่ง client ซึ่งได้เที่ยงคืน UTC = 7 โมงเช้าไทย
                                                    topDonatorFrom: e.target.value || null,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.label}>ถึงวันที่</label>
                                        <input
                                            className={styles.input}
                                            type="date"
                                            value={toDateInput(settings.topDonatorTo)}
                                            onChange={(e) =>
                                                setSettings({
                                                    ...settings,
                                                    // backend จะขยายเป็น 23:59:59.999 ของวันนี้ตามเวลาไทย
                                                    // เพื่อให้ "ถึงวันที่ X" นับรวมยอดทั้งวันของ X ด้วย
                                                    topDonatorTo: e.target.value || null,
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

                {section === "recent" && (
                    <div className={styles.card}>
                        <div className={styles.sectionTitle}>จำนวนที่แสดง</div>
                        <div className={styles.field}>
                            <label className={styles.label}>จำนวนรายการใน Recent Donations</label>
                            <NumberInput
                                className={styles.input}
                                min={1}
                                max={20}
                                value={campaignForm.recentLimit}
                                onChange={(v) =>
                                    setCampaignForm({
                                        ...campaignForm,
                                        recentLimit: v,
                                    })
                                }
                            />
                        </div>
                        <p className={styles.hint}>แสดงโดเนทที่จ่ายแล้วในช่วงแคมเปญที่เปิดอยู่</p>
                        {!campaign && (
                            <p className={styles.hint}>ต้องสร้างแคมเปญในหน้า Goal ก่อน ถึงจะบันทึกค่านี้ได้</p>
                        )}
                        <button
                            className={`${styles.btn} ${styles.primary}`}
                            onClick={handleSaveCampaign}
                            disabled={savingCampaign || !campaign}
                            style={{ width: "100%", marginTop: 8 }}
                        >
                            {savingCampaign ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </div>
                )}
                </div>

                {previewConfig && (
                    <div className={styles.previewCol}>
                        <WidgetPreview
                            path={previewConfig.path}
                            payload={previewPayload}
                            height={previewConfig.height}
                            obsSize={previewConfig.obsSize}
                            replayable={previewConfig.replayable}
                            getTtsUrl={previewTtsUrl}
                        />
                    </div>
                )}
                </div>
            </div>
        </div>
    );
}
