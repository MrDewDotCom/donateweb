import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { login } from "../services/frontend-auth.service";
import { API_URL } from "../config/api";
import styles from "./Login.module.css";

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
            navigate("/admin");
        } catch (err) {
            console.error("[login] ล้มเหลว:", err);

            // แยกสาเหตุให้ชัด ไม่งั้นทุกปัญหา (ต่อ server ไม่ติด, CORS, 500,
            // localStorage ใช้ไม่ได้) จะกลายเป็นข้อความเดียวกันหมดจนหาไม่เจอ
            let message = "เข้าสู่ระบบไม่สำเร็จ";

            if (axios.isAxiosError(err)) {
                const status = err.response?.status;

                if (status === 429) {
                    message = "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่";
                } else if (status === 401) {
                    message = "Username หรือ Password ไม่ถูกต้อง";
                } else if (!err.response) {
                    // ไม่มี response = request ไปไม่ถึง backend เลย
                    // (server ไม่ได้รัน / VITE_API_URL ผิด / โดน CORS บล็อค)
                    message =
                        `ติดต่อเซิร์ฟเวอร์ไม่ได้ที่ ${API_URL || "(ไม่ได้ตั้ง VITE_API_URL)"} — ` +
                        `${err.code ?? err.message}`;
                } else {
                    const detail =
                        typeof err.response.data === "string"
                            ? err.response.data.slice(0, 120)
                            : JSON.stringify(err.response.data).slice(0, 120);

                    message = `เซิร์ฟเวอร์ตอบกลับ ${status} — ${detail}`;
                }
            } else if (err instanceof Error) {
                // ไม่ใช่ error จาก axios = พังหลังได้ response แล้ว
                // เคสที่เจอบ่อยคือเบราว์เซอร์บล็อค localStorage (setStoredToken)
                message = `เกิดข้อผิดพลาดในเบราว์เซอร์: ${err.name} — ${err.message}`;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1 className={styles.title}>เข้าสู่ระบบ Admin</h1>

                <form onSubmit={handleSubmit}>
                    <input
                        className={styles.input}
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                    />

                    <input
                        className={styles.input}
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && <p className={styles.error}>{error}</p>}

                    <button className={styles.submitBtn} type="submit" disabled={loading}>
                        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
                    </button>
                </form>
            </div>
        </div>
    );
}