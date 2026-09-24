import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Donation } from "../types/donation";
import { getDonations, markDonationAsPaid, type DonationSort } from "../services/donation.service";
import { acquireSocket, releaseSocket } from "../services/socket";
import { API_URL } from "../config/api";
import { formatDuration } from "../utils/duration";
import styles from "./adminPages.module.css";

type StatusFilter = "all" | "paid" | "pending" | "failed";

const PAGE_SIZE = 50;

const STATUS_LABEL: Record<string, string> = {
    paid: "จ่ายแล้ว",
    pending: "รอชำระ",
    failed: "ล้มเหลว/หมดเวลา",
};

function formatDateTime(iso?: string | null): string {
    if (!iso) return "-";
    return new Date(iso).toLocaleString("th-TH", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function AdminDonations() {
    const [searchParams] = useSearchParams();
    const initialStatus = searchParams.get("status");

    const [donations, setDonations] = useState<Donation[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(
        initialStatus === "paid" || initialStatus === "pending" || initialStatus === "failed"
            ? initialStatus
            : "all",
    );
    const [sortBy, setSortBy] = useState<DonationSort>("newest");

    // กัน response ของ query เก่ามาทับผลลัพธ์ล่าสุด ตอนพิมพ์ค้นหารัว ๆ
    const seqRef = useRef(0);

    const load = useCallback(async () => {
        const seq = ++seqRef.current;
        try {
            const res = await getDonations({
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                status: statusFilter,
                search,
                sort: sortBy,
            });
            if (seq !== seqRef.current) return;
            setDonations(res.data.items);
            setTotal(res.data.total);
            setLoadError(null);
        } catch (err) {
            if (seq !== seqRef.current) return;
            console.error(err);
            setLoadError("โหลดรายการบริจาคไม่สำเร็จ");
        } finally {
            if (seq === seqRef.current) setLoading(false);
        }
    }, [page, statusFilter, search, sortBy]);

    // หน่วงการค้นหา 300ms
    useEffect(() => {
        const t = setTimeout(load, 300);
        return () => clearTimeout(t);
    }, [load]);

    // มีโดเนทจ่ายสำเร็จ → โหลดใหม่
    useEffect(() => {
        const socket = acquireSocket();
        socket.on("donationPaid", load);
        return () => {
            socket.off("donationPaid", load);
            releaseSocket();
        };
    }, [load]);

    const changeFilter = (fn: () => void) => {
        fn();
        setPage(0);
    };

    const markAsPaid = async (id: number) => {
        if (pendingIds.has(id)) return;
        if (!confirm("ยืนยันว่ารายการนี้จ่ายเงินแล้ว? (จะขึ้น alert บนไลฟ์)")) return;

        const prevStatus = donations.find((d) => d.id === id)?.status ?? "pending";
        setPendingIds((prev) => new Set(prev).add(id));
        setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status: "paid" } : d)));

        try {
            await markDonationAsPaid(id);
        } catch (err) {
            console.error(err);
            setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, status: prevStatus } : d)));
            alert("อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่");
        } finally {
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const hasFilters = statusFilter !== "all" || search.trim() !== "";

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>
                    รายการโดเนท <span className={styles.count}>{total.toLocaleString()} รายการ</span>
                </h1>
                <button type="button" className={styles.btn} onClick={load}>
                    รีเฟรช
                </button>
            </div>

            <div className={styles.card}>
                <div className={styles.filterBar}>
                    <input
                        type="text"
                        placeholder="ค้นหาชื่อหรือข้อความ..."
                        value={search}
                        onChange={(e) => changeFilter(() => setSearch(e.target.value))}
                        aria-label="ค้นหารายการบริจาค"
                        className={styles.input}
                    />
                    <div className={styles.segmented} role="group" aria-label="กรองตามสถานะ">
                        {(["all", "paid", "pending", "failed"] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                className={statusFilter === s ? styles.segActive : ""}
                                aria-pressed={statusFilter === s}
                                onClick={() => changeFilter(() => setStatusFilter(s))}
                            >
                                {s === "all" ? "ทั้งหมด" : STATUS_LABEL[s]}
                            </button>
                        ))}
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => changeFilter(() => setSortBy(e.target.value as DonationSort))}
                        aria-label="เรียงลำดับ"
                        className={styles.select}
                    >
                        <option value="newest">ใหม่สุดก่อน</option>
                        <option value="oldest">เก่าสุดก่อน</option>
                        <option value="amount">ยอดเงินสูงสุด</option>
                    </select>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>เวลา</th>
                                <th>ชื่อ</th>
                                <th>ข้อความ</th>
                                <th>ประเภท</th>
                                <th className={styles.num}>จำนวน</th>
                                <th>สถานะ</th>
                                <th>สลิป</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {donations.map((d) => (
                                <tr key={d.id}>
                                    <td className={styles.muted}>{d.id}</td>
                                    <td className={styles.nowrap}>{formatDateTime(d.paidAt ?? d.createdAt)}</td>
                                    <td className={styles.nameCell}>{d.name}</td>
                                    <td className={styles.msgCell} title={d.message ?? ""}>
                                        {d.message || <span className={styles.muted}>-</span>}
                                    </td>
                                    <td className={styles.nowrap}>
                                        {d.type === "timer" ? (
                                            <span className={styles.tag}>
                                                จับเวลา {d.timerSeconds ? formatDuration(d.timerSeconds) : ""}
                                            </span>
                                        ) : d.type === "video" ? (
                                            <a
                                                className={styles.tag}
                                                href={`https://www.youtube.com/watch?v=${d.videoId}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                title={d.videoTitle ?? ""}
                                            >
                                                คลิป {d.videoSeconds ? formatDuration(d.videoSeconds) : ""}
                                            </a>
                                        ) : (
                                            <span className={styles.muted}>ทั่วไป</span>
                                        )}
                                    </td>
                                    <td className={`${styles.num} ${styles.amount}`}>
                                        ฿{d.amount.toLocaleString()}
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${styles[`badge_${d.status}`] ?? ""}`}>
                                            {STATUS_LABEL[d.status] ?? d.status}
                                        </span>
                                    </td>
                                    <td>
                                        {d.slipImage ? (
                                            <a
                                                href={`${API_URL}${d.slipImage}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={styles.cardLink}
                                            >
                                                ดูสลิป
                                            </a>
                                        ) : (
                                            <span className={styles.muted}>-</span>
                                        )}
                                    </td>
                                    <td className={styles.nowrap}>
                                        {d.status !== "paid" && (
                                            <button
                                                type="button"
                                                className={`${styles.btn} ${styles.btnSm}`}
                                                onClick={() => markAsPaid(d.id)}
                                                disabled={pendingIds.has(d.id)}
                                            >
                                                {pendingIds.has(d.id) ? "กำลังอัปเดต..." : "Mark as Paid"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && <p className={styles.empty}>กำลังโหลด...</p>}
                {!loading && loadError && (
                    <p className={styles.empty}>
                        {loadError}{" "}
                        <button type="button" className={styles.btn} onClick={load}>ลองใหม่</button>
                    </p>
                )}
                {!loading && !loadError && donations.length === 0 && (
                    <p className={styles.empty}>
                        {hasFilters ? "ไม่พบรายการที่ตรงกับการค้นหา" : "ยังไม่มีรายการบริจาค"}
                    </p>
                )}

                {total > PAGE_SIZE && (
                    <div className={styles.pager}>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                        >
                            ← ก่อนหน้า
                        </button>
                        <span className={styles.muted}>หน้า {page + 1} / {totalPages}</span>
                        <button
                            type="button"
                            className={styles.btn}
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            ถัดไป →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
