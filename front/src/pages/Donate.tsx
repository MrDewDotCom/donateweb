import { useState } from "react";
import axios from "axios";

export default function DonatePage() {
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");
    const [amount, setAmount] = useState(20);

    const handleSubmit = async () => {
        try {
            const res = await axios.post(
                "http://localhost:3000/donations",
                {
                    name,
                    message,
                    amount,
                }
            );

            console.log(res.data);

            alert("ส่งข้อมูลสำเร็จ");

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
                Donate
            </button>
        </div>
    );
}