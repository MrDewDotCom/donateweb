import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { createDonation, getDonation } from "../services/donation.service";
import { useParams, useNavigate } from "react-router-dom";
import { uploadSlip } from "../services/upload.service";

type PageState = "form" | "active" | "paid" | "expired" | "not_found" | "loading";

export default function DonatePage() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);
    const [qrCode, setQrCode] = useState("");
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [pageState, setPageState] = useState<PageState>("form");
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [remainingSec, setRemainingSec] = useState<number | null>(null);

    const { id, token } = useParams();
    const navigate = useNavigate();
    const allowed = ["image/jpeg", "image/png", "image/webp"];

    // เก็บ interval ไว้ใน ref เพื่อ clear ได้จากหลายที่
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    // โหลดข้อมูล donation ตาม id/token ในลิงก์ — เช็ค state ที่ backend ส่งมาก่อนเสมอ
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

                // state === "active"
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

    // Poll เช็คสถานะทุก 3 วิ — เฉพาะตอน active เท่านั้น
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

    // นับเวลาถอยหลังจาก expiresAt — ถึงเวลาแล้วเปลี่ยนเป็นหน้า expired ทันที ไม่ต้อง refresh
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
        try {
            const res = await createDonation(name, message, amount);
            navigate(`/donate/${res.data.id}/${res.data.accessToken}`);
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด");
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

                    // ถ้าลิงก์หมดอายุไปแล้วระหว่างอัปโหลด ให้สลับหน้าไปเลย
                    if (message.includes("หมดอายุ")) {
                        setPageState("expired");
                    }
                } else if (data.message?.message) {
                    message = data.message.message;
                }
            }

            alert(message);
        }
    };

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60)
            .toString()
            .padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    // ---------- หน้าจอตาม state ----------

    if (pageState === "loading") {
        return <p>กำลังโหลด...</p>;
    }

    if (pageState === "not_found") {
        return (
            <div>
                <h2>ไม่พบข้อมูลการบริจาคนี้</h2>
                <button onClick={() => navigate("/donate")}>
                    สร้างการบริจาคใหม่
                </button>
            </div>
        );
    }

    if (pageState === "expired") {
        return (
            <div>
                <h2> ลิงก์หมดอายุแล้ว</h2>
                <p>กรุณาสร้างการบริจาคใหม่เพื่อรับ QR Code อีกครั้ง</p>
                <button onClick={() => navigate("/donate")}>
                    สร้างการบริจาคใหม่
                </button>
            </div>
        );
    }

    if (pageState === "paid") {
        return (
            <div>
                <h2>✅ Payment Success</h2>
                <p>ขอบคุณสำหรับการสนับสนุน</p>
            </div>
        );
    }

    if (pageState === "active") {
        return (
            <div>
                <h2>สแกนเพื่อชำระเงิน</h2>
                <img src={qrCode} alt="QR" width={300} />

                {remainingSec !== null && (
                    <p>
                        เหลือเวลาอีก <strong>{formatTime(remainingSec)}</strong> นาที
                        ก่อนลิงก์หมดอายุ
                    </p>
                )}

                <p>ชื่อ: {name}</p>
                {message && <p>ข้อความ: {message}</p>}
                <p>จำนวน: {amount} บาท</p>

                <br />
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                />

                <button onClick={handleUploadSlip}>Upload Slip</button>
            </div>
        );
    }

    // pageState === "form" — หน้าสร้าง donation ใหม่
    return (
        <div>
            <h1>Donate</h1>

            <input
                placeholder="ชื่อ"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />

            <br />

            <textarea
                placeholder="ข้อความ"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            />

            <br />

            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
            />

            <br />

            <button onClick={handleSubmit}>Submit</button>
        </div>
    );
}