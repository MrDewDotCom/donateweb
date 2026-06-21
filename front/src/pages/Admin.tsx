import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Donation } from "../types/donation";
import { getDonations, markDonationAsPaid } from "../services/donation.service";
import { API_URL } from "../config/api";
import styles from "./Admin.module.css";

const WIDGET_LINKS = [
    {
        title: "Overlay",
        desc: "แสดงการแจ้งเตือนโดเนทสด — ใส่ใน OBS Browser Source",
        path: "/overlay",
    },
    {
        title: "Goal Widget",
        desc: "แถบเป้าหมายยอดโดเนท",
        path: "/goal",
    },
    {
        title: "Top Donators",
        desc: "อันดับผู้บริจาคสูงสุด",
        path: "/top",
    },
    {
        title: "Recent Donations",
        desc: "รายการโดเนทล่าสุด",
        path: "/recent",
    },
];

export default function AdminPage() {
    const [donations, setDonations] = useState<Donation[]>([]);
    const [loading, setLoading] = useState(true);

    const loadDonations = async () => {
        try {
            const res = await getDonations();
            setDonations(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markAsPaid = async (id: number) => {
        await markDonationAsPaid(id);
        loadDonations();
    };

    useEffect(() => {
        loadDonations();
    }, []);

    const copyLink = (path: string) => {
        const url = `${window.location.origin}${path}`;
        navigator.clipboard.writeText(url);
        alert("คัดลอกลิงก์แล้ว");
    };

    const totalPaid = donations.filter((d) => d.status === "paid");
    const totalAmount = totalPaid.reduce((sum, d) => sum + d.amount, 0);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Admin Dashboard</h1>

                <div className={styles.navTabs}>
                    <Link to="/admin" className={styles.navTab}>
                        Dashboard
                    </Link>
                    <Link to="/settings" className={styles.navTab}>
                        Settings
                    </Link>
                </div>
            </div>

            {/* สถิติรวม */}
            <div className={styles.statsRow}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>ยอดบริจาคทั้งหมด</div>
                    <div className={styles.statValue}>
                        {totalAmount.toLocaleString()} บาท
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>จ่ายแล้ว</div>
                    <div className={styles.statValue}>{totalPaid.length}</div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>ทั้งหมด</div>
                    <div className={styles.statValue}>{donations.length}</div>
                </div>
            </div>

            {/* ศูนย์กลางลิงก์ไปหน้าต่างๆ (OBS widgets) */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>Widgets สำหรับ OBS</div>

                <div className={styles.linkGrid}>
                    {WIDGET_LINKS.map((w) => (
                        <div key={w.path} className={styles.linkCard}>
                            <div className={styles.linkCardTitle}>{w.title}</div>
                            <p className={styles.linkCardDesc}>{w.desc}</p>

                            <div className={styles.linkCardActions}>
                                <a
                                    href={w.path}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={styles.smallBtn}
                                >
                                    เปิดดู
                                </a>
                                <button
                                    className={`${styles.smallBtn} ${styles.primary}`}
                                    onClick={() => copyLink(w.path)}
                                >
                                    คัดลอกลิงก์
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* รายการโดเนท */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>รายการบริจาค</div>

                {loading && <p className={styles.emptyText}>กำลังโหลด...</p>}

                {!loading && donations.length === 0 && (
                    <p className={styles.emptyText}>ยังไม่มีรายการบริจาค</p>
                )}

                <div className={styles.donationGrid}>
                    {donations.map((d) => (
                        <div key={d.id} className={styles.donationCard}>
                            <div className={styles.donationInfo}>
                                <div className={styles.donationName}>{d.name}</div>
                                {d.message && (
                                    <div className={styles.donationMessage}>{d.message}</div>
                                )}
                                <div className={styles.donationAmount}>
                                    {d.amount.toLocaleString()} บาท
                                </div>
                            </div>

                            <div className={styles.donationActions}>
                                <span
                                    className={`${styles.badge} ${d.status === "paid"
                                            ? styles.paid
                                            : d.status === "failed"
                                                ? styles.failed
                                                : styles.pending
                                        }`}
                                >
                                    {d.status === "paid"
                                        ? "จ่ายแล้ว"
                                        : d.status === "failed"
                                            ? "ล้มเหลว/หมดเวลา"
                                            : "รอชำระ"}
                                </span>

                                {d.slipImage && (
                                    <a
                                        href={`${API_URL}${d.slipImage}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.slipLink}
                                    >
                                        ดูสลิป
                                    </a>
                                )}

                                {d.status !== "paid" && (
                                    <button
                                        className={`${styles.smallBtn} ${styles.primary}`}
                                        onClick={() => markAsPaid(d.id)}
                                    >
                                        Mark as Paid
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}