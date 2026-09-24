// ไอคอนเส้น (stroke) ใช้ currentColor — สีตามข้อความรอบ ๆ
const PATHS = {
    dashboard: (
        <>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </>
    ),
    list: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
    target: (
        <>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1" />
        </>
    ),
    trophy: <path d="M8 21h8M12 16v5M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />,
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    timer: (
        <>
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2 2M10 2h4" />
        </>
    ),
    card: (
        <>
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20" />
        </>
    ),
    globe: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
        </>
    ),
    logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    toggle: (
        <>
            <rect x="2" y="6" width="20" height="12" rx="6" />
            <circle cx="16" cy="12" r="3" />
        </>
    ),
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    video: (
        <>
            <rect x="2" y="6" width="14" height="12" rx="2" />
            <path d="M16 10l6-4v12l-6-4" />
        </>
    ),
    check: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12l3 3 5-6" />
        </>
    ),
    alert: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
        </>
    ),
    help: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.2 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 17h.01" />
        </>
    ),
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({
    name,
    size = 18,
    className,
    strokeWidth = 2,
}: {
    name: IconName;
    size?: number;
    className?: string;
    strokeWidth?: number;
}) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name]}
        </svg>
    );
}
