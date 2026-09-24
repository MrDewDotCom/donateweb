import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Donation } from "../types/donation";
import type { TopDonator } from "../types/topDonator";
import {
    getDailyStats,
    getDonations,
    getDonationSummary,
    type DonationSummary,
} from "../services/donation.service";
import { getProgress, getTopDonators } from "../services/campaign.service";
import { getMonthlyGoalProgress, getSettings } from "../services/settings.service";
import { getTimer, type TimerSnapshot } from "../services/timer.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { toDateInputValue } from "../utils/date";
import { formatClock, formatDuration } from "../utils/duration";
import styles from "./adminPages.module.css";

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

const RANGES = [7, 14, 30] as const;
type Range = (typeof RANGES)[number];

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;

function timeAgo(iso?: string | null): string {
    if (!iso) return "";
    const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const rtf = new Intl.RelativeTimeFormat("th", { numeric: "auto" });
    if (sec < 60) return rtf.format(-sec, "second");
    if (sec < 3600) return rtf.format(-Math.round(sec / 60), "minute");
    if (sec < 86400) return rtf.format(-Math.round(sec / 3600), "hour");
    return rtf.format(-Math.round(sec / 86400), "day");
}

// "25 ก.ย." จาก "YYYY-MM-DD" (ตีความเป็นวันตามปฏิทิน ไม่เลื่อนตาม timezone)
function shortDate(key: string): string {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    });
}

export default function AdminOverview() {
    const [summary, setSummary] = useState<DonationSummary | null>(null);
    const [daily, setDaily] = useState<DailyStat[]>([]);
    const [range, setRange] = useState<Range>(14);
    const [pendingCount, setPendingCount] = useState(0);
    const [campaign, setCampaign] = useState<GoalProgress | null>(null);
    const [monthly, setMonthly] = useState<GoalProgress | null>(null);
    const [top, setTop] = useState<TopDonator[]>([]);
    const [latest, setLatest] = useState<Donation[]>([]);
    const [timer, setTimer] = useState<TimerSnapshot | null>(null);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [hover, setHover] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const loadAll = useCallback(async () => {
        // แต่ละส่วนโหลดแยกกัน ส่วนไหนพังส่วนอื่นยังแสดงได้
        const tasks: Promise<unknown>[] = [
            getDonationSummary().then((r) => setSummary(r.data)),
            getDailyStats(31).then((r) => setDaily(r.data)),
            getDonations({ status: "pending", limit: 1 }).then((r) => setPendingCount(r.data.total)),
            getProgress().then((r) => setCampaign(r.data || null)),
            getMonthlyGoalProgress().then((r) => setMonthly(r.data || null)),
            getTopDonators(5).then((r) => setTop(r.data ?? [])),
            getDonations({ status: "paid", limit: 8, sort: "newest" }).then((r) => setLatest(r.data.items)),
            getTimer().then((r) => setTimer(r.data)),
            getSettings().then((r) => setTimerEnabled(!!r.data?.timerEnabled)),
        ];
        const results = await Promise.allSettled(tasks);
        results.forEach((r) => r.status === "rejected" && console.error(r.reason));
    }, []);

    useEffect(() => {
        loadAll();

        // อัปเดตทันทีเมื่อมีโดเนทเข้า / timer เปลี่ยน
        const socket = acquireSocket();
        socket.on("donationPaid", loadAll);
        socket.on("timerUpdated", setTimer);

        // เดินเวลา "x นาทีที่แล้ว" และนาฬิกา timer
        const id = setInterval(() => setNow(Date.now()), 1000);

        return () => {
            socket.off("donationPaid", loadAll);
            socket.off("timerUpdated", setTimer);
            releaseSocket();
            clearInterval(id);
        };
    }, [loadAll]);

    const refresh = async () => {
        setRefreshing(true);
        await loadAll();
        setRefreshing(false);
    };

    const kpi = useMemo(() => {
        const todayKey = toDateInputValue(new Date().toISOString());
        const monthKey = todayKey.slice(0, 7);
        const today = daily.find((d) => d.date === todayKey)?.total ?? 0;
        const last7 = daily.slice(-7).reduce((s, d) => s + d.total, 0);
        const thisMonth = daily
            .filter((d) => d.date.startsWith(monthKey))
            .reduce((s, d) => s + d.total, 0);
        return { today, last7, thisMonth };
    }, [daily]);

    const chart = daily.slice(-range);
    const chartMax = Math.max(1, ...chart.map((d) => d.total));
    const chartSum = chart.reduce((s, d) => s + d.total, 0);
    const labelEvery = range <= 7 ? 1 : range <= 14 ? 2 : 5;

    const timerRemaining = !timer
        ? 0
        : timer.isRunning && timer.endsAt
            ? Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - now) / 1000))
            : timer.remainingSec;

    const avg = summary && summary.paidCount > 0 ? summary.totalAmount / summary.paidCount : 0;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>Dashboard</h1>
                <button type="button" className={styles.btn} onClick={refresh} disabled={refreshing}>
                    {refreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
                </button>
            </div>

            {/* KPI */}
            <div className={styles.kpiGrid}>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>ยอดรวมทั้งหมด</div>
                    <div className={styles.kpiValue}>{baht(summary?.totalAmount ?? 0)}</div>
                    <div className={styles.kpiSub}>{(summary?.paidCount ?? 0).toLocaleString()} รายการที่จ่ายแล้ว</div>
                </div>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>วันนี้</div>
                    <div className={styles.kpiValue}>{baht(kpi.today)}</div>
                </div>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>7 วันล่าสุด</div>
                    <div className={styles.kpiValue}>{baht(kpi.last7)}</div>
                </div>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>เดือนนี้</div>
                    <div className={styles.kpiValue}>{baht(kpi.thisMonth)}</div>
                </div>
                <div className={styles.kpi}>
                    <div className={styles.kpiLabel}>เฉลี่ยต่อครั้ง</div>
                    <div className={styles.kpiValue}>{baht(avg)}</div>
                </div>
                <Link
                    to="/admin/donations?status=pending"
                    className={`${styles.kpi} ${styles.kpiLink} ${pendingCount > 0 ? styles.kpiWarn : ""}`}
                >
                    <div className={styles.kpiLabel}>รอชำระ / รอตรวจ</div>
                    <div className={styles.kpiValue}>{pendingCount.toLocaleString()}</div>
                    <div className={styles.kpiSub}>ดูรายการ →</div>
                </Link>
            </div>

            <div className={styles.grid}>
                {/* กราฟรายวัน */}
                <section className={`${styles.card} ${styles.span2}`}>
                    <div className={styles.cardHead}>
                        <div>
                            <div className={styles.cardTitle}>ยอดโดเนทรายวัน</div>
                            <div className={styles.cardSub}>รวม {baht(chartSum)} ใน {range} วัน</div>
                        </div>
                        <div className={styles.segmented} role="group" aria-label="ช่วงเวลา">
                            {RANGES.map((r) => (
                                <button
                                    key={r}
                                    type="button"
                                    className={r === range ? styles.segActive : ""}
                                    aria-pressed={r === range}
                                    onClick={() => setRange(r)}
                                >
                                    {r} วัน
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.chart} onMouseLeave={() => setHover(null)}>
                        <div className={styles.chartGrid} aria-hidden>
                            {[1, 0.5, 0].map((f) => (
                                <div key={f} className={styles.gridLine}>
                                    <span>{baht(chartMax * f)}</span>
                                </div>
                            ))}
                        </div>
                        <div className={styles.bars}>
                            {chart.map((d, i) => (
                                <div
                                    key={d.date}
                                    className={styles.barCol}
                                    onMouseEnter={() => setHover(i)}
                                    onFocus={() => setHover(i)}
                                    tabIndex={0}
                                    aria-label={`${shortDate(d.date)} ${baht(d.total)}`}
                                >
                                    {hover === i && (
                                        <div className={styles.tooltip}>
                                            <b>{baht(d.total)}</b>
                                            <span>{shortDate(d.date)}</span>
                                        </div>
                                    )}
                                    <div
                                        className={`${styles.bar} ${hover === i ? styles.barHover : ""}`}
                                        style={{ height: d.total > 0 ? `${Math.max((d.total / chartMax) * 100, 2)}%` : 0 }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className={styles.axis}>
                            {chart.map((d, i) => (
                                <span key={d.date}>
                                    {(chart.length - 1 - i) % labelEvery === 0 ? shortDate(d.date) : ""}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* เป้าหมาย + timer */}
                <section className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.cardTitle}>เป้าหมาย</div>
                        <Link to="/admin/goal" className={styles.cardLink}>ตั้งค่า →</Link>
                    </div>

                    {!campaign && !monthly && <p className={styles.empty}>ยังไม่ได้ตั้งเป้าหมาย</p>}

                    {[
                        campaign && { label: campaign.title || "เป้าหมายสตรีม", g: campaign },
                        monthly && { label: "เป้าหมายเดือนนี้", g: monthly },
                    ]
                        .filter(Boolean)
                        .map((item) => {
                            const { label, g } = item as { label: string; g: GoalProgress };
                            return (
                                <div key={label} className={styles.goal}>
                                    <div className={styles.goalHead}>
                                        <span>{label}</span>
                                        <b>{g.percentage}%</b>
                                    </div>
                                    <div className={styles.track}>
                                        <div className={styles.fill} style={{ width: `${Math.min(g.percentage, 100)}%` }} />
                                    </div>
                                    <div className={styles.goalSub}>
                                        {baht(g.currentAmount)} / {baht(g.goalAmount)}
                                    </div>
                                </div>
                            );
                        })}

                    <div className={styles.divider} />

                    <div className={styles.cardHead}>
                        <div className={styles.cardTitle}>Timer</div>
                        <Link to="/admin/timer" className={styles.cardLink}>ควบคุม →</Link>
                    </div>
                    <div className={styles.timerRow}>
                        <span className={styles.timerClock}>{formatClock(timerRemaining)}</span>
                        <span className={styles.cardSub}>
                            {!timerEnabled
                                ? "ปิดรับโดเนทจับเวลาอยู่"
                                : timerRemaining <= 0
                                    ? "ไม่ได้จับเวลา"
                                    : timer?.isRunning
                                        ? "กำลังนับถอยหลัง"
                                        : "หยุดชั่วคราว"}
                        </span>
                    </div>
                </section>

                {/* โดเนทล่าสุด */}
                <section className={`${styles.card} ${styles.span2}`}>
                    <div className={styles.cardHead}>
                        <div className={styles.cardTitle}>โดเนทล่าสุด</div>
                        <Link to="/admin/donations" className={styles.cardLink}>ดูทั้งหมด →</Link>
                    </div>
                    {latest.length === 0 ? (
                        <p className={styles.empty}>ยังไม่มีโดเนท</p>
                    ) : (
                        <ul className={styles.feed}>
                            {latest.map((d) => (
                                <li key={d.id} className={styles.feedRow}>
                                    <span className={styles.avatar}>{(d.name.trim()[0] ?? "?").toUpperCase()}</span>
                                    <div className={styles.feedBody}>
                                        <div className={styles.feedLine}>
                                            <b>{d.name}</b>
                                            {d.type === "timer" && d.timerSeconds ? (
                                                <span className={styles.tag}>จับเวลา {formatDuration(d.timerSeconds)}</span>
                                            ) : null}
                                            {d.type === "video" && d.videoSeconds ? (
                                                <span className={styles.tag}>คลิป {formatDuration(d.videoSeconds)}</span>
                                            ) : null}
                                            <span className={styles.muted}>{timeAgo(d.paidAt ?? d.createdAt)}</span>
                                        </div>
                                        {d.message && <div className={styles.feedMsg}>{d.message}</div>}
                                    </div>
                                    <span className={styles.amount}>{baht(d.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Top donators */}
                <section className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.cardTitle}>Top Donators</div>
                        <Link to="/admin/top" className={styles.cardLink}>ตั้งค่า →</Link>
                    </div>
                    {top.length === 0 ? (
                        <p className={styles.empty}>ยังไม่มีข้อมูล</p>
                    ) : (
                        <ol className={styles.rank}>
                            {top.map((d, i) => (
                                <li key={d.name}>
                                    <span className={`${styles.rankNo} ${i < 3 ? styles[`r${i + 1}`] : ""}`}>{i + 1}</span>
                                    <span className={styles.rankName}>{d.name}</span>
                                    <span className={styles.amount}>{baht(d.total)}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>
        </div>
    );
}
