import { useEffect, useRef, useState } from "react";
import { NumberInput } from "../components/NumberInput";
import Segmented from "../components/Segmented";
import axios from "axios";
import { createDonation, getDonation, type DonationType } from "../services/donation.service";
import { getSettings } from "../services/settings.service";
import type { Settings } from "../types/settings";
import { formatDuration, secondsForAmount, videoSecondsForAmount } from "../utils/duration";
import { parseTimestamp, parseYouTubeId, youTubeThumb } from "../utils/youtube";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { uploadSlip } from "../services/upload.service";
import Icon from "../components/Icon";
import styles from "./donate.module.css";

type PageState = "form" | "active" | "paid" | "expired" | "not_found" | "loading";

// ปุ่มจำนวนเงินของโดเนททั่วไป (ค่าแรก = ค่าเริ่มต้น)
const QUICK_AMOUNTS = [10, 20, 50, 100, 200];
// โดเนทจับเวลา/คลิป: ปุ่มจำนวนเงินอิงจากขั้นต่ำของแบบนั้น (ขั้นต่ำ ×1, ×2, ×5, ×10, ×20)
const MIN_MULTIPLIERS = [1, 2, 5, 10, 20];

export default function DonatePage() {
    const [name, setName] = useState("Anonymous");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(QUICK_AMOUNTS[0]);
    const [qrCode, setQrCode] = useState("");
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [pageState, setPageState] = useState<PageState>("form");
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    // ประเภทโดเนท — เปิดมาจากลิงก์ ?type=timer / ?type=video ได้ (เช่นจากการ์ดในหน้าแรก)
    const [searchParams] = useSearchParams();
    const [donationType, setDonationType] = useState<DonationType>(() => {
        const t = searchParams.get("type");
        return t === "timer" || t === "video" ? t : "standard";
    });
    const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
    // โดเนทคลิป
    const [videoUrl, setVideoUrl] = useState("");
    const [videoStartText, setVideoStartText] = useState("");
    // true = มีเสียงแจ้งเตือน + อ่านข้อความก่อนเล่นคลิป, false = เล่นคลิปอย่างเดียว (ค่าเริ่มต้น)
    const [videoAlert, setVideoAlert] = useState(false);
    // โดเนทจับเวลา: คิดจาก "จำนวนเงิน" หรือ "เวลาที่ต้องการ" (แล้วคำนวณเงินให้)
    const [timerMode, setTimerMode] = useState<"amount" | "time">("amount");
    const [wantHours, setWantHours] = useState(0);
    const [wantMinutes, setWantMinutes] = useState(30);
    const [videoInfo, setVideoInfo] = useState<{ title: string | null; seconds: number | null } | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [errorModal, setErrorModal] = useState<{ title: string; message: string; type: "error" | "success" } | null>(null);

    const showError = (message: string, title = "เกิดข้อผิดพลาด") => {
        setErrorModal({ title, message, type: "error" });
    };

    const showSuccess = (message: string, title = "สำเร็จ") => {
        setErrorModal({ title, message, type: "success" });
    };

    const { id, token } = useParams();
    const navigate = useNavigate();
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // กัน response เก่าของ donation ก่อนหน้าทับสถานะของ donation ปัจจุบัน
    // (เกิดได้เพราะ React Router ใช้ component ตัวเดิมตอนแค่เปลี่ยน :id/:token ใน URL ไม่ remount)
    const currentKeyRef = useRef<string>("");

    const clearTimers = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    // ดึงเรทจับเวลา/เปิดปิด จาก Settings (public)
    useEffect(() => {
        getSettings()
            .then((res) => {
                const s: Settings = res.data;
                setSettings(s);
                // เปิดมาด้วย ?type=timer / ?type=video → ตั้งจำนวนเงินตามขั้นต่ำของแบบนั้น
                const t = searchParams.get("type");
                if ((t === "timer" && s.timerEnabled) || (t === "video" && s.videoEnabled)) {
                    const min = Math.max(
                        1,
                        (t === "timer" ? s.timerMinAmount : s.videoMinAmount) ?? s.minDonationAmount ?? 10,
                    );
                    setAmount(min);
                }
            })
            .catch((err) => console.error("getSettings failed", err));
    }, []);

    const timerEnabled = settings?.timerEnabled ?? false;
    const videoEnabled = settings?.videoEnabled ?? false;
    // ประเภทที่ปิดอยู่ใน Settings → กลับไปเป็นแบบทั่วไปเสมอ
    const effectiveType: DonationType =
        (donationType === "timer" && timerEnabled) || (donationType === "video" && videoEnabled)
            ? donationType
            : "standard";
    const timerMin = settings?.timerMinAmount ?? settings?.minDonationAmount ?? null;
    const videoMin = settings?.videoMinAmount ?? settings?.minDonationAmount ?? null;
    const videoId = parseYouTubeId(videoUrl);
    const videoStart = parseTimestamp(videoStartText);
    const previewVideoSeconds =
        settings && effectiveType === "video"
            ? videoSecondsForAmount(amount, settings.videoRateAmount, settings.videoRateSeconds, settings.videoMaxSeconds)
            : 0;
    // โดเนทคลิปแบบ "เล่นคลิปอย่างเดียว" ไม่มีการอ่าน/แสดงข้อความ → ไม่ต้องให้กรอก
    const showMessage = !(effectiveType === "video" && !videoAlert);

    // โหมด "ใส่เวลา": ยอดที่ต้องจ่าย = ปัดขึ้นให้ได้เวลาไม่น้อยกว่าที่ขอ และไม่ต่ำกว่าขั้นต่ำ
    const amountForMinutes = (totalMinutes: number) => {
        if (!settings || totalMinutes <= 0) return 0;
        const raw = Math.ceil((totalMinutes * settings.timerRateAmount) / settings.timerRateMinutes);
        return Math.max(raw, timerMin ?? 1);
    };
    const setWantedTime = (hours: number, minutes: number) => {
        setWantHours(hours);
        setWantMinutes(minutes);
        setAmount(amountForMinutes(hours * 60 + minutes));
    };
    const timeByTime = effectiveType === "timer" && timerMode === "time";

    // ขั้นต่ำของแต่ละแบบ (ไม่ได้ตั้ง = ใช้ขั้นต่ำทั่วไป, ไม่มีเลย = 10)
    const minFor = (t: DonationType, s: Settings | null = settings): number => {
        const general = s?.minDonationAmount ?? null;
        const specific = t === "timer" ? s?.timerMinAmount : t === "video" ? s?.videoMinAmount : null;
        return Math.max(1, specific ?? general ?? 10);
    };
    const quickAmountsFor = (t: DonationType, s: Settings | null = settings): number[] =>
        t === "standard" ? QUICK_AMOUNTS : MIN_MULTIPLIERS.map((m) => minFor(t, s) * m);
    const quickAmounts = quickAmountsFor(effectiveType);

    // เปลี่ยนแบบโดเนท → ตั้งจำนวนเงินเป็นค่าเริ่มต้นของแบบนั้น
    const selectType = (t: DonationType) => {
        setDonationType(t);
        setAmount(quickAmountsFor(t)[0]);
    };

    const typeOptions: [DonationType, string][] = [
        ["standard", "ทั่วไป"],
        ...(timerEnabled ? [["timer", "จับเวลา"] as [DonationType, string]] : []),
        ...(videoEnabled ? [["video", "คลิปวิดีโอ"] as [DonationType, string]] : []),
    ];
    const previewSeconds =
        settings && effectiveType === "timer"
            ? secondsForAmount(amount, settings.timerRateAmount, settings.timerRateMinutes)
            : 0;

    useEffect(() => {
        const key = `${id}-${token}`;
        currentKeyRef.current = key;

        if (!id || !token) {
            resetForm();
            return;
        }

        setPageState("loading");

        const load = async () => {
            try {
                const res = await getDonation(Number(id), token!);

                // ถ้าระหว่างรอ response ผู้ใช้เปลี่ยนไปดู donation อื่นแล้ว ทิ้ง response นี้ไปเลย
                if (currentKeyRef.current !== key) return;

                const data = res.data;

                if (data.state === "not_found") {
                    setPageState("not_found");
                    return;
                }

                if (data.state === "paid") {
                    const paid = data.donation;
                    setTimerSeconds(paid?.type === "timer" ? paid.timerSeconds ?? null : null);
                    setVideoInfo(paid?.type === "video" ? { title: paid.videoTitle ?? null, seconds: paid.videoSeconds ?? null } : null);
                    setPageState("paid");
                    return;
                }

                if (data.state === "expired") {
                    setPageState("expired");
                    return;
                }

                const donation = data.donation;
                setQrCode(donation.qrCode);
                setName(donation.name);
                setMessage(donation.message ?? "");
                setAmount(donation.amount);
                setTimerSeconds(donation.type === "timer" ? donation.timerSeconds ?? null : null);
                setVideoInfo(donation.type === "video" ? { title: donation.videoTitle ?? null, seconds: donation.videoSeconds ?? null } : null);
                setExpiresAt(donation.expiresAt ?? null);
                setPageState("active");
            } catch (err) {
                console.error(err);
                if (currentKeyRef.current === key) {
                    setPageState("not_found");
                }
            }
        };

        load();

        return () => clearTimers();
    }, [id, token]);

    useEffect(() => {
        clearTimers();

        if (pageState !== "active" || !id || !token) {
            return;
        }

        const key = `${id}-${token}`;

        pollRef.current = setInterval(async () => {
            try {
                const res = await getDonation(Number(id), token!);

                // กัน response ของ donation เก่าที่มาทีหลังตอนผู้ใช้เปลี่ยนไปหน้าอื่นแล้ว
                if (currentKeyRef.current !== key) return;

                const data = res.data;

                if (data.state === "paid") {
                    setPageState("paid");
                } else if (data.state === "expired") {
                    setPageState("expired");
                } else if (data.state === "not_found") {
                    setPageState("not_found");
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [pageState, id, token]);

    useEffect(() => {
        if (pageState !== "active" || !expiresAt) {
            setRemainingSec(null);
            return;
        }

        const tick = () => {
            const diff = Math.floor(
                (new Date(expiresAt).getTime() - Date.now()) / 1000,
            );

            if (diff <= 0) {
                setRemainingSec(0);
                setPageState("expired");
                if (countdownRef.current) clearInterval(countdownRef.current);
                return;
            }

            setRemainingSec(diff);
        };

        tick();
        countdownRef.current = setInterval(tick, 1000);

        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [pageState, expiresAt]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            showError("กรุณากรอกชื่อก่อนทำการบริจาค", "ข้อมูลไม่ครบ");
            return;
        }

        if (effectiveType === "video") {
            if (!videoId) {
                showError("กรุณาวางลิงก์ YouTube ที่ถูกต้อง", "ลิงก์ไม่ถูกต้อง");
                return;
            }
            if (videoStart === null) {
                showError("เวลาเริ่มต้องเป็นรูปแบบ 1:30 หรือจำนวนวินาที", "เวลาเริ่มไม่ถูกต้อง");
                return;
            }
            if (videoMin != null && amount < videoMin) {
                showError(`โดเนทคลิปขั้นต่ำ ${videoMin.toLocaleString()} บาท`, "ยอดไม่ถึงขั้นต่ำ");
                return;
            }
        }

        if (effectiveType === "timer" && timerMin != null && amount < timerMin) {
            showError(`โดเนทจับเวลาขั้นต่ำ ${timerMin.toLocaleString()} บาท`, "ยอดไม่ถึงขั้นต่ำ");
            return;
        }

        setSubmitting(true);

        try {
            const res = await createDonation(
                name,
                showMessage ? message : "",
                amount,
                effectiveType,
                effectiveType === "video"
                    ? {
                        videoUrl,
                        videoStart: videoStartText.trim() ? videoStart ?? undefined : undefined,
                        videoAlert,
                    }
                    : undefined,
            );
            navigate(`/donate/${res.data.id}/${res.data.accessToken}`);
        } catch (error) {
            console.error(error);
            // แสดงข้อความจาก backend ถ้ามี (เช่น ยอดต่ำกว่าขั้นต่ำ)
            let msg = "ไม่สามารถสร้างรายการบริจาคได้ กรุณาลองใหม่อีกครั้ง";
            if (axios.isAxiosError(error) && typeof error.response?.data?.message === "string") {
                msg = error.response.data.message;
            }
            showError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadSlip = async () => {
        if (!slipFile) {
            showError("กรุณาเลือกไฟล์สลิปก่อนอัปโหลด", "ยังไม่ได้เลือกไฟล์");
            return;
        }

        if (!id) {
            showError("ไม่พบข้อมูลการบริจาคนี้");
            return;
        }

        if (slipFile.size > 5 * 1024 * 1024) {
            showError("ไฟล์สลิปต้องมีขนาดไม่เกิน 5MB", "ไฟล์มีขนาดใหญ่เกินไป");
            return;
        }

        if (!allowed.includes(slipFile.type)) {
            showError("รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น", "ไฟล์ไม่รองรับ");
            return;
        }

        if (!token) {
            showError("ไม่พบ token ของการบริจาคนี้");
            return;
        }

        setUploading(true);

        try {
            const res = await uploadSlip(slipFile, Number(id), token);

            if (res.data.donation?.status === "paid") {
                setPageState("paid");
            } else {
                showSuccess("ระบบได้รับสลิปแล้ว กรุณารอการตรวจสอบจากแอดมิน");
            }

            setSlipFile(null);
        } catch (err: unknown) {
            console.error(err);
            let message = "ตรวจสอบสลิปไม่ผ่าน กรุณาตรวจสอบสลิปและลองใหม่อีกครั้ง";

            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as {
                    message?: string | { message?: string };
                };

                if (typeof data.message === "string") {
                    message = data.message;

                    if (message.includes("หมดอายุ")) {
                        setPageState("expired");
                    }
                } else if (data.message?.message) {
                    message = data.message.message;
                }
            }

            showError(message, "ตรวจสอบสลิปไม่สำเร็จ");
        } finally {
            setUploading(false);
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // ---------- Modal แสดงข้อผิดพลาด/ผลลัพธ์ ----------

    const ErrorModal = () => {
        if (!errorModal) return null;

        return (
            <div
                className={styles.modalOverlay}
                onClick={() => setErrorModal(null)}
            >
                <div
                    className={styles.modalBox}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={styles.modalIcon}>
                        <Icon name={errorModal.type === "success" ? "check" : "alert"} size={44} strokeWidth={1.75} />
                    </div>
                    <div className={styles.modalTitle}>{errorModal.title}</div>
                    <p className={styles.modalText}>{errorModal.message}</p>
                    <button
                        className={styles.submitBtn}
                        onClick={() => setErrorModal(null)}
                    >
                        ตกลง
                    </button>
                </div>
            </div>
        );
    };


    const resetForm = () => {
        setName("Anonymous");
        setMessage("");
        // ค่าเริ่มต้นตามแบบที่เลือกอยู่ (ทั่วไป = 10, จับเวลา/คลิป = ขั้นต่ำของแบบนั้น)
        setAmount(quickAmountsFor(effectiveType)[0]);
        setTimerSeconds(null);
        setVideoInfo(null);
        setVideoUrl("");
        setVideoStartText("");
        setVideoAlert(false);
        setTimerMode("amount");
        setQrCode("");
        setSlipFile(null);
        setExpiresAt(null);
        setRemainingSec(null);
        setPageState("form");
    };
    // ---------- หน้าจอตาม state ----------

    const renderContent = () => {
        if (pageState === "loading") {
            return (
                <div className={styles.card}>
                    <div className={styles.loadingWrap}>กำลังโหลด...</div>
                </div>
            );
        }

        if (pageState === "not_found") {
            return (
                <div className={styles.card}>
                    <div className={styles.statusWrap}>
                        <div className={styles.statusIcon}><Icon name="help" size={52} strokeWidth={1.75} /></div>
                        <div className={styles.statusTitle}>ไม่พบข้อมูลการบริจาคนี้</div>
                        <p className={styles.statusText}>
                            ลิงก์นี้อาจไม่ถูกต้องหรือถูกลบไปแล้ว
                        </p>
                        <button
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/")}
                        >
                            สร้างการบริจาคใหม่
                        </button>
                    </div>
                </div>
            );
        }

        if (pageState === "expired") {
            return (
                <div className={styles.card}>
                    <div className={styles.statusWrap}>
                        <div className={styles.statusIcon}><Icon name="clock" size={52} strokeWidth={1.75} /></div>
                        <div className={styles.statusTitle}>ลิงก์หมดอายุแล้ว</div>
                        <p className={styles.statusText}>
                            กรุณาสร้างการบริจาคใหม่เพื่อรับ QR Code อีกครั้ง
                        </p>
                        <button
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/")}
                        >
                            สร้างการบริจาคใหม่
                        </button>
                    </div>
                </div>
            );
        }

        if (pageState === "paid") {
            return (
                <div className={`${styles.card} ${styles.successCard}`}>
                    {/* Confetti particles */}
                    <div className={styles.confettiWrap} aria-hidden="true">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <span key={i} className={styles.confettiPiece} style={{
                                "--i": i,
                                "--x": `${Math.random() * 100}%`,
                                "--rot": `${Math.random() * 720 - 360}deg`,
                                "--scale": `${0.6 + Math.random() * 0.8}`,
                                "--delay": `${Math.random() * 0.5}s`,
                                "--color": ["#60a5fa", "#38bdf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"][i % 6],
                            } as React.CSSProperties} />
                        ))}
                    </div>

                    <div className={styles.statusWrap}>
                        {/* Animated checkmark ring */}
                        <div className={styles.successRing}>
                            <svg className={styles.checkSvg} viewBox="0 0 52 52">
                                <circle className={styles.checkCircle} cx="26" cy="26" r="23" fill="none" />
                                <path className={styles.checkMark} fill="none" d="M14 26 l8 8 l16-16" />
                            </svg>
                            <div className={styles.ringGlow} />
                        </div>

                        <div className={`${styles.statusTitle} ${styles.successTitle}`}>บริจาคสำเร็จ</div>
                        <p className={`${styles.statusText} ${styles.successText}`}>ขอบคุณสำหรับการสนับสนุน</p>
                        {timerSeconds ? (
                            <p className={styles.timerPaidNote}>
                                เพิ่มเวลา {formatDuration(timerSeconds)} บนไลฟ์แล้ว
                            </p>
                        ) : null}
                        {videoInfo ? (
                            <p className={styles.timerPaidNote}>
                                คลิปของคุณเข้าคิวเล่นบนไลฟ์แล้ว
                                {videoInfo.seconds ? ` (${formatDuration(videoInfo.seconds)})` : ""}
                            </p>
                        ) : null}
                        <button
                            className={`${styles.secondaryBtn} ${styles.successBtn}`}
                            onClick={() => navigate("/donate")}
                        >
                            สร้างการบริจาคใหม่
                        </button>
                    </div>
                </div>
            );
        }

        if (pageState === "active") {
            const isUrgent = remainingSec !== null && remainingSec <= 120;

            return (
                <div className={styles.card}>
                    <div className={styles.qrWrap}>
                        <h2 className={styles.title}>แสกนเชำระเงินด้วยเเอพธนาคาร</h2>

                        {remainingSec !== null && (
                            <span
                                className={`${styles.timerBadge} ${isUrgent ? styles.urgent : ""}`}
                            >
                                เหลือเวลา {formatTime(remainingSec)} นาที
                            </span>
                        )}

                        <img src={qrCode} alt="QR Code" className={styles.qrImg} />

                        <div className={styles.infoBox}>
                            <p>ชื่อ: {name}</p>
                            {message && <p>ข้อความ: {message}</p>}
                            <p>จำนวน: {amount.toLocaleString()} บาท</p>
                            {timerSeconds ? <p>ได้เวลา: {formatDuration(timerSeconds)}</p> : null}
                            {videoInfo ? (
                                <p>
                                    คลิป: {videoInfo.title ?? "YouTube"}
                                    {videoInfo.seconds ? ` · เล่น ${formatDuration(videoInfo.seconds)}` : ""}
                                </p>
                            ) : null}
                        </div>

                        <input
                            ref={fileInputRef}
                            className={styles.hiddenFileInput}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                        />

                        <button
                            type="button"
                            className={styles.fileSelectBtn}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {slipFile ? slipFile.name : "เลือกไฟล์สลิป"}
                        </button>

                        <button
                            className={styles.submitBtn}
                            onClick={handleUploadSlip}
                            disabled={uploading}
                        >
                            {uploading ? "กำลังตรวจสอบ..." : "อัปโหลดสลิป"}
                        </button>
                    </div>
                </div>
            );
        }

        // pageState === "form"
        // ลำดับหลักทุกแบบ: 1 ชื่อ → 2 ข้อความ → 3 จำนวนเงิน แล้วค่อยตามด้วยส่วนเฉพาะของแต่ละแบบ
        return (
            <div className={styles.card}>
                <h1 className={styles.title}>ใ ห้ ค่ า ข้ า ว พ รี่ ดิ ว</h1>

                {typeOptions.length > 1 && (
                    <div className={styles.field}>
                        <label className={styles.label}>รูปแบบการโดเนท</label>
                        <Segmented
                            options={typeOptions}
                            value={effectiveType}
                            onChange={selectType}
                            ariaLabel="รูปแบบการโดเนท"
                        />
                    </div>
                )}

                {/* 1. ชื่อ */}
                <div className={styles.field}>
                    <label className={styles.label}>ชื่อที่ขึ้นจอ</label>
                    <input
                        className={styles.input}
                        placeholder="ชื่อ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                {/* 2. ข้อความ (ซ่อนเมื่อเป็นคลิปแบบเล่นอย่างเดียว) */}
                {showMessage && (
                    <div className={`${styles.field} ${styles.reveal}`}>
                        <label className={styles.label}>ข้อความ (ไม่บังคับ)</label>
                        <div className={styles.textareaWrap}>
                            <textarea
                                className={styles.textarea}
                                placeholder="ฝากข้อความถึงผู้รับ..."
                                value={message}
                                maxLength={210}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <div className={styles.charCount}>{message.length}/210</div>
                        </div>
                    </div>
                )}

                {/* 3. จำนวนเงิน */}
                <div className={styles.field}>
                    <div className={styles.labelRow}>
                        <label className={styles.label}>
                            {timeByTime ? "เวลาที่ต้องการ" : "จำนวนเงิน (บาท)"}
                        </label>
                        {effectiveType === "timer" && (
                            <Segmented
                                size="sm"
                                ariaLabel="คิดจาก"
                                options={[
                                    ["amount", "ใส่จำนวนเงิน"],
                                    ["time", "ใส่เวลา"],
                                ] as const}
                                value={timerMode}
                                onChange={(value) => {
                                    setTimerMode(value);
                                    if (value === "time") setWantedTime(wantHours, wantMinutes);
                                }}
                            />
                        )}
                    </div>

                    {timeByTime ? (
                        <div key="time" className={styles.reveal}>
                            <div className={styles.amountRow}>
                                {([
                                    [0, 15, "15 นาที"],
                                    [0, 30, "30 นาที"],
                                    [1, 0, "1 ชม."],
                                    [2, 0, "2 ชม."],
                                ] as const).map(([h, m, label]) => (
                                    <button
                                        key={label}
                                        type="button"
                                        className={`${styles.amountChip} ${wantHours === h && wantMinutes === m ? styles.active : ""}`}
                                        onClick={() => setWantedTime(h, m)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className={styles.timeInputs}>
                                <label>
                                    <NumberInput
                                        className={styles.input}
                                        min={0}
                                        value={wantHours}
                                        onChange={(v) => setWantedTime(Math.max(0, Math.floor(v)), wantMinutes)}
                                        aria-label="ชั่วโมง"
                                    />
                                    <span>ชั่วโมง</span>
                                </label>
                                <label>
                                    <NumberInput
                                        className={styles.input}
                                        min={0}
                                        max={59}
                                        value={wantMinutes}
                                        onChange={(v) => setWantedTime(wantHours, Math.min(59, Math.max(0, Math.floor(v))))}
                                        aria-label="นาที"
                                    />
                                    <span>นาที</span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div key="amount" className={styles.reveal}>
                            <div className={styles.amountRow}>
                                {quickAmounts.map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={`${styles.amountChip} ${amount === v ? styles.active : ""}`}
                                        onClick={() => setAmount(v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>

                            <NumberInput
                                className={styles.input}
                                min={1}
                                value={amount}
                                onChange={(v) => setAmount(v)}
                            />
                        </div>
                    )}

                    {effectiveType === "timer" && settings && (
                        <div className={`${styles.timerPreview} ${styles.reveal}`}>
                            <div className={styles.timerPreviewMain}>
                                {timeByTime ? (
                                    <>
                                        ต้องจ่าย <b>{amount > 0 ? `฿${amount.toLocaleString()}` : "-"}</b>
                                        {amount > 0 && ` · ได้เวลา ${formatDuration(previewSeconds)}`}
                                    </>
                                ) : (
                                    <>
                                        ได้เวลา <b>{previewSeconds > 0 ? formatDuration(previewSeconds) : "-"}</b>
                                    </>
                                )}
                            </div>
                            <div className={styles.timerPreviewSub}>
                                เรท ฿{settings.timerRateAmount.toLocaleString()} = {formatDuration(settings.timerRateMinutes * 60)}
                                {timerMin != null && ` · ขั้นต่ำ ฿${timerMin.toLocaleString()}`}
                            </div>
                        </div>
                    )}

                    {effectiveType === "video" && settings && (
                        <div className={`${styles.timerPreview} ${styles.reveal}`}>
                            <div className={styles.timerPreviewMain}>
                                คลิปเล่นได้ <b>{previewVideoSeconds > 0 ? formatDuration(previewVideoSeconds) : "-"}</b>
                            </div>
                            <div className={styles.timerPreviewSub}>
                                เรท ฿{settings.videoRateAmount.toLocaleString()} = {formatDuration(settings.videoRateSeconds)}
                                {` · สูงสุด ${formatDuration(settings.videoMaxSeconds)}`}
                                {videoMin != null && ` · ขั้นต่ำ ฿${videoMin.toLocaleString()}`}
                            </div>
                        </div>
                    )}
                </div>

                {/* ส่วนเฉพาะของโดเนทคลิป */}
                {effectiveType === "video" && (
                    <div className={styles.reveal}>
                        <div className={styles.field}>
                            <label className={styles.label}>ลิงก์คลิป YouTube</label>
                            <input
                                className={styles.input}
                                type="url"
                                inputMode="url"
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                            />
                            {videoUrl.trim() && !videoId && (
                                <div className={styles.fieldError}>ลิงก์นี้ไม่ใช่คลิป YouTube</div>
                            )}
                            {videoId && (
                                <div className={`${styles.videoPick} ${styles.reveal}`}>
                                    <img src={youTubeThumb(videoId)} alt="" className={styles.videoThumb} />
                                    <div className={styles.videoPickBody}>
                                        <label className={styles.label} htmlFor="videoStart">เริ่มที่ (ไม่บังคับ)</label>
                                        <input
                                            id="videoStart"
                                            className={styles.input}
                                            placeholder="เช่น 1:30"
                                            value={videoStartText}
                                            onChange={(e) => setVideoStartText(e.target.value)}
                                        />
                                        {videoStart === null && (
                                            <div className={styles.fieldError}>ใช้รูปแบบ 1:30 หรือจำนวนวินาที</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>แสดงบนไลฟ์แบบไหน</label>
                            <Segmented
                                ariaLabel="แสดงบนไลฟ์แบบไหน"
                                options={[
                                    [false, "เล่นคลิปอย่างเดียว"],
                                    [true, "เสียงแจ้งเตือน + คลิป"],
                                ] as const}
                                value={videoAlert}
                                onChange={setVideoAlert}
                            />
                            <div key={String(videoAlert)} className={`${styles.timerPreviewSub} ${styles.reveal}`} style={{ textAlign: "left", marginTop: 6 }}>
                                {videoAlert
                                    ? "มีเสียงแจ้งเตือนและอ่านข้อความก่อน แล้วค่อยเล่นคลิป"
                                    : "ไม่มีเสียงแจ้งเตือนหรือเสียงอ่าน — เล่นคลิปพร้อมชื่อคุณทันที"}
                            </div>
                        </div>
                    </div>
                )}

                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={submitting || (timeByTime && amount <= 0)}
                >
                    {submitting ? "กำลังสร้าง..." : "จ่ายเงินที่นี่"}
                </button>
            </div>
        );
    };

    return (
        <div className={`${styles.page} ${pageState === "paid" ? styles.pagePaid : ""}`}>
            <div className={styles.pageNoise} aria-hidden="true" />
            {renderContent()}
            <ErrorModal />
        </div>
    );
}