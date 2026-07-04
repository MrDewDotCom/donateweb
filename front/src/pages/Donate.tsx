import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { createDonation, getDonation } from "../services/donation.service";
import { useParams, useNavigate } from "react-router-dom";
import { uploadSlip } from "../services/upload.service";
import styles from "./donate.module.css";

type PageState = "form" | "active" | "paid" | "expired" | "not_found" | "loading";

const QUICK_AMOUNTS = [10, 20, 50, 100];

export default function DonatePage() {
    const [name, setName] = useState("Anonymous");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(10);
    const [qrCode, setQrCode] = useState("");
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [pageState, setPageState] = useState<PageState>("form");
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
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

    // ---------- Sync document title ตาม state ----------
    useEffect(() => {
        const titles: Record<PageState, string> = {
            form: "โดเนท - DonateWeb",
            loading: "กำลังโหลด... - DonateWeb",
            active: "สแกนจ่ายเงิน - DonateWeb",
            paid: "ขอบคุณสำหรับโดเนท - DonateWeb",
            expired: "ลิงก์หมดอายุ - DonateWeb",
            not_found: "ไม่พบข้อมูล - DonateWeb",
        };

        document.title = titles[pageState];
    }, [pageState]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            showError("กรุณากรอกชื่อก่อนทำการบริจาค", "ข้อมูลไม่ครบ");
            return;
        }

        setSubmitting(true);

        try {
            const res = await createDonation(name, message, amount);
            navigate(`/donate/${res.data.id}/${res.data.accessToken}`);
        } catch (error) {
            console.error(error);
            showError("ไม่สามารถสร้างรายการบริจาคได้ กรุณาลองใหม่อีกครั้ง");
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
                        {errorModal.type === "success" ? "✅" : "⚠️"}
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
        setAmount(10);
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
                        <div className={styles.statusIcon}>❓</div>
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
                        <div className={styles.statusIcon}>⏰</div>
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
                                "--color": ["#8b5cf6", "#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa"][i % 6],
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
                        <p className={`${styles.statusText} ${styles.successText}`}>ขอบคุณสำหรับการสนับสนุน 💙</p>
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
                                ⏳ เหลือเวลา {formatTime(remainingSec)} นาที
                            </span>
                        )}

                        <img src={qrCode} alt="QR Code" className={styles.qrImg} />

                        <div className={styles.infoBox}>
                            <p>ชื่อ: {name}</p>
                            {message && <p>ข้อความ: {message}</p>}
                            <p>จำนวน: {amount.toLocaleString()} บาท</p>
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
                            📎 {slipFile ? slipFile.name : "เลือกไฟล์สลิป"}
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
        return (
            <div className={styles.card}>
                <h1 className={styles.title}>ใ ห้ ค่ า ข้ า ว พ รี่ ดิ ว</h1>

                <div className={styles.field}>
                    <label className={styles.label}>ชื่อที่ขึ้นจอ</label>
                    <input
                        className={styles.input}
                        placeholder="ชื่อ"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className={styles.field}>
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

                <div className={styles.field}>
                    <label className={styles.label}>จำนวนเงิน (บาท)</label>

                    <div className={styles.amountRow}>
                        {QUICK_AMOUNTS.map((v) => (
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

                    <input
                        className={styles.input}
                        type="number"
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                    />
                </div>

                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={submitting}
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