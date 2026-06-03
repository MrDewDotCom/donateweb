import { useState } from "react";
import { createDonation } from "../services/donation.service";


export default function DonatePage() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);
    const [qrCode, setQrCode] = useState("");
    const [status, setStatus] = useState("");

    const handleSubmit = async () => {
        try {
            const res = await createDonation(
                name,
                message,
                amount
            );

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

            {qrCode && (
                <div>
                    <h2>สแกนเพื่อชำระเงิน</h2>

                    <img
                        src={qrCode}
                        alt="PromptPay QR"
                        width={300}
                    />

                    <p>สถานะ: {status}</p>
                </div>
            )}
        </div>
    );
}