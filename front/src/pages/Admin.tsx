import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Donation } from "../types/donation";
import { getDonations, markDonationAsPaid, getDailyStats } from "../services/donation.service";
import { getProgress } from "../services/campaign.service";
import { getMonthlyGoalProgress } from "../services/settings.service";
import { API_URL } from "../config/api";
import styles from "./Admin.module.css";

interface DailyStat {
    date: string;
    total: number;
}

interface GoalProgress {
    title?: string;
    goalAmount: number;
    currentAmount: number;
    percentage: number;
}

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
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [campaignProgress, setCampaignProgress] = useState<GoalProgress | null>(null);
    const [monthlyProgress, setMonthlyProgress] = useState<GoalProgress | null>(null);

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

    const loadDailyStats = async () => {
        try {
            const res = await getDailyStats(7);
            setDailyStats(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadGoalProgress = async () => {
        try {
            const [campaignRes, monthlyRes] = await Promise.all([
                getProgress(),
                getMonthlyGoalProgress(),
            ]);

            setCampaignProgress(campaignRes.data);
            setMonthlyProgress(monthlyRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const markAsPaid = async (id: number) => {
        await markDonationAsPaid(id);
        loadDonations();
        loadDailyStats();
        loadGoalProgress();
    };

    useEffect(() => {
        loadDonations();
        loadDailyStats();
        loadGoalProgress();
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
                    <span className={`${styles.navTab} ${styles.navTabActive}`}>
                        Dashboard
                    </span>
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

            {/* กราฟยอดโดเนทรายวัน + เป้าหมาย */}
            <div className={styles.section}>
                <div className={styles.sectionTitle}>สถิติ & เป้าหมาย</div>

                <div className={styles.chartCard}>
                    <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                        ยอดโดเนทรายวัน (7 วันล่าสุด)
                    </div>

                    {dailyStats.length === 0 ? (
                        <p className={styles.emptyText}>ยังไม่มีข้อมูล</p>
                    ) : (
                        <div className={styles.chartBars}>
                            {(() => {
                                const max = Math.max(
                                    ...dailyStats.map((d) => d.total),
                                    1,
                                );

                                return dailyStats.map((d) => (
                                    <div key={d.date} className={styles.chartCol}>
                                        <span className={styles.chartValue}>
                                            {d.total > 0 ? d.total.toLocaleString() : ""}
                                        </span>
                                        <div
                                            className={styles.chartBar}
                                            style={{
                                                height: `${Math.max((d.total / max) * 100, 2)}%`,
                                            }}
                                        />
                                        <span className={styles.chartLabel}>
                                            {new Date(d.date).toLocaleDateString("th-TH", {
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}

                    {monthlyProgress && (
                        <div className={styles.goalRow} style={{ marginTop: 20 }}>
                            <div className={styles.goalHeader}>
                                <span>เป้าหมายเดือนนี้</span>
                                <span>
                                    {monthlyProgress.currentAmount.toLocaleString()} /{" "}
                                    {monthlyProgress.goalAmount.toLocaleString()} บาท (
                                    {monthlyProgress.percentage}%)
                                </span>
                            </div>
                            <div className={styles.goalTrack}>
                                <div
                                    className={styles.goalFill}
                                    style={{
                                        width: `${Math.min(monthlyProgress.percentage, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {campaignProgress && (
                        <div className={styles.goalRow}>
                            <div className={styles.goalHeader}>
                                <span>เป้าหมายสตรีม {campaignProgress.title ? `(${campaignProgress.title})` : ""}</span>
                                <span>
                                    {campaignProgress.currentAmount.toLocaleString()} /{" "}
                                    {campaignProgress.goalAmount.toLocaleString()} บาท (
                                    {campaignProgress.percentage}%)
                                </span>
                            </div>
                            <div className={styles.goalTrack}>
                                <div
                                    className={styles.goalFill}
                                    style={{
                                        width: `${Math.min(campaignProgress.percentage, 100)}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {!monthlyProgress && !campaignProgress && (
                        <p className={styles.emptyText}>
                            ยังไม่มีเป้าหมายที่เปิดใช้งาน — ไปตั้งค่าได้ที่{" "}
                            <Link to="/settings" className={styles.slipLink}>
                                Settings
                            </Link>
                        </p>
                    )}
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