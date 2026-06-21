import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { createDonation, getDonation } from "../services/donation.service";
import { useParams, useNavigate } from "react-router-dom";
import { uploadSlip } from "../services/upload.service";
import styles from "./donate.module.css";

type PageState = "form" | "active" | "paid" | "expired" | "not_found" | "loading";

const QUICK_AMOUNTS = [20, 50, 100, 200];

export default function DonatePage() {
    const [name, setName] = useState("Anonymous");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);
    const [qrCode, setQrCode] = useState("");
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [pageState, setPageState] = useState<PageState>("form");
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [remainingSec, setRemainingSec] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    const { id, token } = useParams();
    const navigate = useNavigate();
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    useEffect(() => {
        if (!id || !token) {
            setPageState("form");
            return;
        }

        setPageState("loading");

        const load = async () => {
            try {
                const res = await getDonation(Number(id), token!);
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
                setPageState("not_found");
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

        pollRef.current = setInterval(async () => {
            try {
                const res = await getDonation(Number(id), token!);
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
            alert("กรุณากรอกชื่อ");
            return;
        }

        setSubmitting(true);

        try {
            const res = await createDonation(name, message, amount);
            navigate(`/donate/${res.data.id}/${res.data.accessToken}`);
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUploadSlip = async () => {
        if (!slipFile) {
            alert("เลือกสลิปก่อน");
            return;
        }

        if (!id) {
            alert("ไม่พบข้อมูล donation");
            return;
        }

        if (slipFile.size > 5 * 1024 * 1024) {
            alert("ไฟล์ต้องไม่เกิน 5MB");
            return;
        }

        if (!allowed.includes(slipFile.type)) {
            alert("รองรับเฉพาะ JPG PNG WEBP");
            return;
        }

        if (!token) {
            alert("ไม่พบ token");
            return;
        }

        setUploading(true);

        try {
            const res = await uploadSlip(slipFile, Number(id), token);

            if (res.data.donation?.status === "paid") {
                setPageState("paid");
            }

            alert("ตรวจสอบสลิปสำเร็จ");
            setSlipFile(null);
        } catch (err: unknown) {
            console.error(err);
            let message = "ตรวจสอบสลิปไม่ผ่าน";

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

            alert(message);
        } finally {
            setUploading(false);
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // ---------- หน้าจอตาม state ----------

    if (pageState === "loading") {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.loadingWrap}>กำลังโหลด...</div>
                </div>
            </div>
        );
    }

    if (pageState === "not_found") {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.statusWrap}>
                        <div className={styles.statusIcon}>❓</div>
                        <div className={styles.statusTitle}>ลิงก์นี้หมดอายุเเล้ว</div>
                        <p className={styles.statusText}>
                            ขอบคุณสำหรับค่าขนมเเต่ลิ้งนี้หมดอายุเเล้ว
                        </p>
                        <button
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/")}
                        >
                            โดเนทใหม่ที่นี่
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pageState === "expired") {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.statusWrap}>
                        <div className={styles.statusIcon}>⏰</div>
                        <div className={styles.statusTitle}>ลิงก์หมดอายุแล้ว</div>
                        <p className={styles.statusText}>
                            กรุณาสร้างการโดเนทใหม่เพื่อรับ QR Code อีกครั้ง
                        </p>
                        <button
                            className={styles.secondaryBtn}
                            onClick={() => navigate("/")}
                        >
                            สร้างการโดเนทใหม่
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (pageState === "paid") {
        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.statusWrap}>
                        <div className={styles.statusIcon}>✅</div>
                        <div className={styles.statusTitle}>การบริจาคสำเร็จ</div>
                        <p className={styles.statusText}>ขอบคุณสำหรับการสนับสนุน 💙</p>
                    </div>
                </div>
            </div>
        );
    }

    if (pageState === "active") {
        const isUrgent = remainingSec !== null && remainingSec <= 120;

        return (
            <div className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.qrWrap}>
                        <h2 className={styles.title}>สแกนเพื่อชำระเงิน</h2>

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
                            className={styles.fileInput}
                            type="file"
                            accept="image/*"
                            onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                        />

                        <button
                            className={styles.submitBtn}
                            onClick={handleUploadSlip}
                            disabled={uploading}
                        >
                            {uploading ? "กำลังตรวจสอบ..." : "อัปโหลดสลิป"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // pageState === "form"
    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>สนับสนุนเรา 💙</h1>

                <div className={styles.field}>
                    <label className={styles.label}>ชื่อของคุณ</label>
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
                    {submitting ? "กำลังสร้าง..." : "บริจาคเลย"}
                </button>
            </div>
        </div>
    );
}