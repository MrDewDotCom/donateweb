import { useEffect, useState } from "react";
import axios from "axios";
import { createDonation, getDonation } from "../services/donation.service";
import { useParams, useNavigate } from "react-router-dom";
import { uploadSlip } from "../services/upload.service";


export default function DonatePage() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);
    const [qrCode, setQrCode] = useState("");
    const [status, setStatus] = useState("");
    const [isPaid, setIsPaid] = useState(false);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const { id, token } = useParams();
    const navigate = useNavigate();
    const allowed = ["image/jpeg", "image/png", "image/webp",];

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            const res = await getDonation(Number(id), token!);
            setQrCode(res.data.qrCode);
            setStatus(res.data.status);
            setName(res.data.name);
            setMessage(res.data.message ?? "");
            setAmount(res.data.amount);
        };

        load();
    }, [id, token]);

    useEffect(() => {
        if (!token) return;

        const interval = setInterval(async () => {
            try {
                const res = await getDonation(Number(id), token!);

                if (res.data.status === "paid") {
                    setIsPaid(true);
                    clearInterval(interval);
                }
            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [token, id]);

    const handleSubmit = async () => {
        try {
            const res = await createDonation(name, message, amount);
            navigate(`/donate/${res.data.id}/${res.data.accessToken}`);

            setQrCode(res.data.qrCode);
            setStatus(res.data.status);

            setName("");
            setMessage("");
            setAmount(20);
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
            alert("ไฟล์ต้องไม่เกิน 5MB",);
            return;
        }
        if (!allowed.includes(slipFile.type,)
        ) {
            alert("รองรับเฉพาะ JPG PNG WEBP",);
            return;
        }

        if (!token) {
            alert("ไม่พบ token");
            return;
        }

        try {
            const res = await uploadSlip(slipFile, Number(id), token);

            if (res.data.donation?.status === "paid") {
                setStatus("paid");
                setIsPaid(true);
            }

            alert("ตรวจสอบสลิปสำเร็จ");
            setSlipFile(null);
        } catch (err: unknown) {
            console.error(err);
            let message = "ตรวจสอบสลิปไม่ผ่าน";

            if (axios.isAxiosError(err) && err.response?.data) {
                const data = err.response.data as { message?: string | { message?: string } };
                if (typeof data.message === "string") {
                    message = data.message;
                } else if (data.message?.message) {
                    message = data.message.message;
                }
            }

            alert(message);
        }
    };

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

            <button onClick={handleSubmit}>
                Submit
            </button>

            {!isPaid && qrCode && (
                <div>
                    <h2>สแกนเพื่อชำระเงิน</h2>
                    <img src={qrCode} alt="QR" width={300} />
                    <p>สถานะ: {status}</p>

                    <br />
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSlipFile(e.target.files?.[0] ?? null)}
                    />

                    <button onClick={handleUploadSlip}>
                        Upload Slip
                    </button>
                </div>
            )}

            {isPaid && (
                <div>
                    <h2>✅ Payment Success</h2>
                    <p>ขอบคุณสำหรับการสนับสนุน</p>
                </div>
            )}

        </div>
    );
}