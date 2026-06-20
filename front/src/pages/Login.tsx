import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { login } from "../services/frontend-auth.service";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(username, password);
            navigate("/admin"); // เปลี่ยนเป็น path หน้า admin dashboard จริงของโปรเจกต์
        } catch (err) {
            console.error(err);
            let message = "เข้าสู่ระบบไม่สำเร็จ";

            if (axios.isAxiosError(err) && err.response?.status === 429) {
                message = "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่";
            } else if (axios.isAxiosError(err) && err.response?.status === 401) {
                message = "Username หรือ Password ไม่ถูกต้อง";
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 360, margin: "80px auto" }}>
            <h1>เข้าสู่ระบบ Admin</h1>

            <form onSubmit={handleSubmit}>
                <input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                />

                <br />
                <br />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <br />
                <br />

                {error && <p style={{ color: "red" }}>{error}</p>}

                <button type="submit" disabled={loading}>
                    {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                </button>
            </form>
        </div>
    );
}