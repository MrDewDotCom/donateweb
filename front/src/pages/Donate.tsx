import { useEffect, useState } from "react";
import { createDonation, getDonation } from "../services/donation.service";
import { useParams, useNavigate } from "react-router-dom";


export default function DonatePage() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);
    const [qrCode, setQrCode] = useState("");
    const [status, setStatus] = useState("");
    const [isPaid, setIsPaid] = useState(false);
    const { id, token } = useParams();
    const navigate = useNavigate();

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