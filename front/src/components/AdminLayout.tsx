import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../services/frontend-auth.service";
import Icon, { type IconName } from "./Icon";
import styles from "./AdminLayout.module.css";

interface NavItem {
    to: string;
    icon: IconName;
    label: string;
    end?: boolean;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
    {
        title: "ภาพรวม",
        items: [
            { to: "/admin", icon: "dashboard", label: "Dashboard", end: true },
            { to: "/admin/donations", icon: "list", label: "รายการโดเนท" },
        ],
    },
    {
        title: "Widgets (OBS)",
        items: [
            { to: "/admin/alert", icon: "bell", label: "Alert & เสียง" },
            { to: "/admin/goal", icon: "target", label: "Goal" },
            { to: "/admin/top", icon: "trophy", label: "Top Donators" },
            { to: "/admin/recent", icon: "clock", label: "Recent Donations" },
            { to: "/admin/timer", icon: "timer", label: "Timer" },
            { to: "/admin/video", icon: "video", label: "Video (คลิป)" },
        ],
    },
    {
        title: "ตั้งค่า",
        items: [
            { to: "/admin/types", icon: "toggle", label: "รูปแบบการโดเนท" },
            { to: "/admin/payment", icon: "card", label: "การชำระเงิน" },
        ],
    },
];

export default function AdminLayout() {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className={styles.shell}>
            <header className={styles.mobileBar}>
                <button
                    type="button"
                    className={styles.menuBtn}
                    aria-label="เปิดเมนู"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                >
                    <Icon name="menu" size={20} />
                </button>
                <span className={styles.brand}>Dewdabid Admin</span>
            </header>

            {menuOpen && <div className={styles.backdrop} onClick={() => setMenuOpen(false)} />}

            <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
                <div className={styles.brandRow}>
                    <div className={styles.logoMark}>D</div>
                    <span className={styles.brand}>Dewdabid Admin</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_GROUPS.map((g) => (
                        <div key={g.title} className={styles.group}>
                            <div className={styles.groupTitle}>{g.title}</div>
                            {g.items.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    // ปิดเมนูบนมือถือเมื่อเลือกหน้า
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `${styles.link} ${isActive ? styles.linkActive : ""}`
                                    }
                                >
                                    <Icon name={item.icon} className={styles.icon} />
                                    {item.label}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className={styles.footer}>
                    <a className={styles.link} href="/" target="_blank" rel="noreferrer">
                        <Icon name="globe" className={styles.icon} />
                        ดูหน้าเว็บ
                    </a>
                    <button type="button" className={styles.link} onClick={handleLogout}>
                        <Icon name="logout" className={styles.icon} />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>

            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
}
