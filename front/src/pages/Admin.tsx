import { useEffect, useMemo, useState } from "react";
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

type StatusFilter = "all" | "paid" | "pending" | "failed";

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
    const [loadError, setLoadError] = useState<string | null>(null);
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [campaignProgress, setCampaignProgress] = useState<GoalProgress | null>(null);
    const [monthlyProgress, setMonthlyProgress] = useState<GoalProgress | null>(null);
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
    const [refreshing, setRefreshing] = useState(false);

    // search / filter / sort
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount">("newest");

    const loadDonations = async () => {
        try {
            const res = await getDonations();
            setDonations(res.data);
            setLoadError(null);
        } catch (err) {
            console.error(err);
            setLoadError("โหลดรายการบริจาคไม่สำเร็จ");
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

    const loadAll = async () => {
        await Promise.all([loadDonations(), loadDailyStats(), loadGoalProgress()]);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const markAsPaid = async (id: number) => {
        if (pendingIds.has(id)) return; // guard against double-click

        setPendingIds((prev) => new Set(prev).add(id));

        // optimistic update so the row reflects the change immediately
        setDonations((prev) =>
            prev.map((d) => (d.id === id ? { ...d, status: "paid" } : d)),
        );

        try {
            await markDonationAsPaid(id);
            await Promise.all([loadDailyStats(), loadGoalProgress()]);
        } catch (err) {
            console.error(err);
            // roll back on failure
            setDonations((prev) =>
                prev.map((d) => (d.id === id ? { ...d, status: "pending" } : d)),
            );
            alert("อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const copyLink = async (path: string) => {
        const url = `${window.location.origin}${path}`;
        try {
            await navigator.clipboard.writeText(url);
            alert("คัดลอกลิงก์แล้ว");
        } catch (err) {
            console.error(err);
            alert("คัดลอกลิงก์ไม่สำเร็จ");
        }
    };

    const totalPaid = donations.filter((d) => d.status === "paid");
    const totalAmount = totalPaid.reduce((sum, d) => sum + d.amount, 0);

    const visibleDonations = useMemo(() => {
        let list = [...donations];

        if (statusFilter !== "all") {
            list = list.filter((d) => d.status === statusFilter);
        }

        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(
                (d) =>
                    d.name.toLowerCase().includes(q) ||
                    (d.message ?? "").toLowerCase().includes(q),
            );
        }

        list.sort((a, b) => {
            if (sortBy === "amount") return b.amount - a.amount;
            const aTime = new Date((a as any).createdAt ?? 0).getTime();
            const bTime = new Date((b as any).createdAt ?? 0).getTime();
            return sortBy === "newest" ? bTime - aTime : aTime - bTime;
        });

        return list;
    }, [donations, statusFilter, search, sortBy]);

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
                    <button
                        type="button"
                        className={styles.smallBtn}
                        onClick={handleRefresh}
                        disabled={refreshing}
                        style={{ marginLeft: "auto" }}
                    >
                        {refreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
                    </button>
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

                {/* แถบค้นหา / กรอง / เรียงลำดับ */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อหรือข้อความ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="ค้นหารายการบริจาค"
                        style={{
                            flex: "1 1 220px",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid #ccc",
                        }}
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        aria-label="กรองตามสถานะ"
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
                    >
                        <option value="all">ทุกสถานะ</option>
                        <option value="paid">จ่ายแล้ว</option>
                        <option value="pending">รอชำระ</option>
                        <option value="failed">ล้มเหลว/หมดเวลา</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        aria-label="เรียงลำดับ"
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc" }}
                    >
                        <option value="newest">ใหม่สุดก่อน</option>
                        <option value="oldest">เก่าสุดก่อน</option>
                        <option value="amount">ยอดเงินสูงสุด</option>
                    </select>
                </div>

                {loading && <p className={styles.emptyText}>กำลังโหลด...</p>}

                {!loading && loadError && (
                    <p className={styles.emptyText}>
                        {loadError}{" "}
                        <button
                            type="button"
                            className={styles.smallBtn}
                            onClick={loadDonations}
                        >
                            ลองใหม่
                        </button>
                    </p>
                )}

                {!loading && !loadError && donations.length === 0 && (
                    <p className={styles.emptyText}>ยังไม่มีรายการบริจาค</p>
                )}

                {!loading && !loadError && donations.length > 0 && visibleDonations.length === 0 && (
                    <p className={styles.emptyText}>ไม่พบรายการที่ตรงกับการค้นหา</p>
                )}

                <div className={styles.donationGrid}>
                    {visibleDonations.map((d) => {
                        const isPending = pendingIds.has(d.id);
                        return (
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
                                            disabled={isPending}
                                        >
                                            {isPending ? "กำลังอัปเดต..." : "Mark as Paid"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}