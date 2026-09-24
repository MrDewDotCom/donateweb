import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, getTopDonators, getRecentDonations } from '../services/campaign.service';
import type { TopDonator } from '../types/topDonator';
import type { RecentDonation } from '../types/recentDonation';
import { getSettings } from '../services/settings.service';
import { useLang, type Lang } from '../i18n/useLang';
import { landingText } from '../i18n/landing';
import Icon from '../components/Icon';
import styles from './DonatePageLanding.module.css';

interface GoalProgress {
    title?: string;
    goalAmount: number;
    currentAmount: number;
    percentage: number;
}

const LEADERBOARD_SIZE = 10;
const RECENT_SIZE = 8;
const REFRESH_MS = 15000;

const baht = (n: number) => `฿${n.toLocaleString()}`;

// บนมือถือ ปุ่ม "โดเนทเลย" จะเลื่อนลงไปที่ส่วน "รูปแบบการโดเนท" แทน
// เพื่อให้ผู้ใช้เห็นว่ามีโดเนทจับเวลา/คลิปวิดีโอด้วย (บนคอมไปหน้า /donate ตามปกติ)
const MOBILE_QUERY = '(max-width: 768px)';
const TYPES_SECTION_ID = 'donation-types';

function handleHeroDonateClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!window.matchMedia(MOBILE_QUERY).matches) return;
    const target = document.getElementById(TYPES_SECTION_ID);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

// "3 นาทีที่แล้ว" / "3 minutes ago"
function timeAgo(iso: string | undefined, lang: Lang): string {
    if (!iso) return '';
    const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const abs = Math.abs(diffSec);
    if (abs < 60) return rtf.format(diffSec, 'second');
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    return rtf.format(Math.round(diffSec / 86400), 'day');
}

const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

export default function DonatePageLanding() {
    const { lang, setLang } = useLang();
    const t = landingText[lang];

    const [topDonators, setTopDonators] = useState<TopDonator[]>([]);
    const [campaignProgress, setCampaignProgress] = useState<GoalProgress | null>(null);
    const [recent, setRecent] = useState<RecentDonation[]>([]);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(false);

    useEffect(() => {
        const load = async () => {
            // แยกแต่ละ request ไม่ผูกกับ Promise.all
            // ถ้าตัวใดตัวหนึ่ง fail ส่วนอื่นของหน้ายังแสดงได้ตามปกติ
            try {
                const topRes = await getTopDonators(LEADERBOARD_SIZE);
                setTopDonators(topRes.data ?? []);
            } catch (err) {
                console.error('getTopDonators failed', err);
            }

            try {
                const progressRes = await getProgress();
                setCampaignProgress(progressRes.data || null);
            } catch (err) {
                console.error('getProgress failed', err);
            }

            try {
                const recentRes = await getRecentDonations(RECENT_SIZE);
                setRecent(recentRes.data ?? []);
            } catch (err) {
                console.error('getRecentDonations failed', err);
            }
        };

        load();
        const interval = setInterval(load, REFRESH_MS);

        // การ์ด "โดเนทจับเวลา" จะขึ้นว่าใช้งานได้ เมื่อเปิดไว้ใน Settings
        getSettings()
            .then((res) => {
                setTimerEnabled(!!res.data?.timerEnabled);
                setVideoEnabled(!!res.data?.videoEnabled);
            })
            .catch((err) => console.error('getSettings failed', err));
        return () => clearInterval(interval);
    }, []);

    const topDonator = topDonators[0] ?? null;
    const latest = recent[0] ?? null;
    const pct = campaignProgress ? Math.min(100, Math.max(0, campaignProgress.percentage)) : 0;
    const maxTotal = topDonators[0]?.total || 1;

    const donationTypes = [
        {
            icon: 'message' as const,
            title: t.typeStandardTitle,
            desc: t.typeStandardDesc,
            note: null as string | null,
            ready: true,
            to: '/donate',
        },
        {
            icon: 'timer' as const,
            title: t.typeTimerTitle,
            desc: t.typeTimerDesc,
            note: null,
            ready: timerEnabled,
            to: '/donate?type=timer',
        },
        {
            icon: 'video' as const,
            title: t.typeVideoTitle,
            desc: t.typeVideoDesc,
            note: null,
            ready: videoEnabled,
            to: '/donate?type=video',
        },
    ];

    const steps = [
        { title: t.step1Title, desc: t.step1Desc },
        { title: t.step2Title, desc: t.step2Desc },
        { title: t.step3Title, desc: t.step3Desc },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.bgGrid} />
            <div className={styles.bgGlow} />

            {/* NAV */}
            <nav className={styles.nav}>
                <div className={styles.navInner}>
                    <div className={styles.logo}>
                        <div className={styles.logoMark}>D</div>
                        Dewdabid
                    </div>
                    <div className={styles.navRight}>
                        <div className={styles.langToggle} role="group" aria-label="Language">
                            {(['th', 'en'] as const).map((l) => (
                                <button
                                    key={l}
                                    type="button"
                                    className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}
                                    onClick={() => setLang(l)}
                                    aria-pressed={lang === l}
                                >
                                    {l.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </nav>

            <div className={styles.wrap}>
                {/* HERO */}
                <section className={styles.hero}>
                    <div className={styles.heroGrid}>
                        <div className={styles.fadeUp}>
                            <div className={styles.eyebrow}>{t.eyebrow}</div>
                            <h1 className={styles.h1}>
                                {t.h1a}
                                <br />
                                {t.h1b}
                                <br />
                                <span>{t.h1c}</span>
                            </h1>
                            <p className={styles.heroSub}>{t.heroSub}</p>
                            <div className={styles.heroActions}>
                                <Link
                                    to="/donate"
                                    onClick={handleHeroDonateClick}
                                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
                                >
                                    {t.donateNow}
                                    <span aria-hidden>→</span>
                                </Link>
                                <a href="#leaderboard" className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}>
                                    {t.seeLeaderboard}
                                </a>
                            </div>
                        </div>

                        {/* CAMPAIGN CARD */}
                        <div className={`${styles.mock} ${styles.fadeUp} ${styles.delay1}`}>
                            <div className={styles.campaignHead}>
                                <span className={styles.statLabel}>{t.campaign}</span>
                                {campaignProgress && (
                                    <span className={styles.livePill}>
                                        <span className={styles.dotLive} /> LIVE
                                    </span>
                                )}
                            </div>

                            {campaignProgress ? (
                                <>
                                    {campaignProgress.title && (
                                        <div className={styles.campaignTitle}>{campaignProgress.title}</div>
                                    )}
                                    <div className={styles.campaignAmount}>
                                        {baht(campaignProgress.currentAmount)}
                                    </div>
                                    <div className={styles.campaignSub}>
                                        {t.raisedOf(baht(campaignProgress.goalAmount))}
                                    </div>
                                    <div className={styles.progressTrack}>
                                        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className={styles.progressMeta}>
                                        <span>
                                            <b>{campaignProgress.percentage}%</b> {t.funded}
                                        </span>
                                        <span>{baht(campaignProgress.goalAmount)}</span>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.emptyBox}>{t.noCampaign}</div>
                            )}

                            <div className={styles.miniGrid}>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>{t.specialThanks}</div>
                                    <div className={styles.statValue}>{topDonator ? topDonator.name : '—'}</div>
                                    <div className={styles.statDelta}>
                                        {topDonator ? baht(topDonator.total) : t.noDonations}
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>{t.latest}</div>
                                    <div className={styles.statValue}>{latest ? latest.name : '—'}</div>
                                    <div className={styles.statDelta}>
                                        {latest ? `+${baht(latest.amount)} · ${timeAgo(latest.paidAt, lang)}` : t.noDonations}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* DONATION TYPES (แทนส่วน Capabilities เดิม) */}
                <section className={styles.section}>
                    {/* จุดที่ปุ่ม "โดเนทเลย" (มือถือ) เลื่อนมาถึง — หัวข้ออยู่บนสุดของจอพอดี */}
                    <div id={TYPES_SECTION_ID} className={`${styles.sectionHead} ${styles.anchorSection}`}>
                        <div className={styles.sectionLabel}>{t.typesLabel}</div>
                        <h2>{t.typesTitle}</h2>
                    </div>
                    <div className={styles.typeGrid}>
                        {donationTypes.map((d) => {
                            const body = (
                                <>
                                    <div className={styles.featureIcon}><Icon name={d.icon} size={20} /></div>
                                    <span className={`${d.ready ? styles.badgeReady : styles.badgeSoon} ${styles.featureBadge}`}>
                                        {d.ready ? t.available : t.comingSoon}
                                    </span>
                                    <div className={styles.featureMain}>
                                        <h3>{d.title}</h3>
                                        <p>{d.desc}</p>
                                        {d.note && <div className={styles.featureNote}>{d.note}</div>}
                                    </div>
                                    {d.ready && (
                                        <span className={styles.featurePick}>
                                            {t.pickThis}
                                            <span aria-hidden>→</span>
                                        </span>
                                    )}
                                </>
                            );

                            // เปิดใช้งาน = ทั้งการ์ดกดได้ (ไปหน้าโดเนทพร้อมเลือกแบบนี้ไว้)
                            return d.ready ? (
                                <Link
                                    key={d.title}
                                    to={d.to}
                                    className={`${styles.featureCard} ${styles.featureCardReady} ${styles.featureCardLink}`}
                                >
                                    {body}
                                </Link>
                            ) : (
                                <div key={d.title} className={`${styles.featureCard} ${styles.featureCardSoon}`}>
                                    {body}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* HOW TO DONATE */}
                <section className={`${styles.section} ${styles.sectionTight}`}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>{t.stepsLabel}</div>
                        <h2>{t.stepsTitle}</h2>
                    </div>
                    <ol className={styles.steps}>
                        {steps.map((s, i) => (
                            <li key={s.title} className={styles.step}>
                                <span className={styles.stepNum}>{i + 1}</span>
                                <div>
                                    <h3>{s.title}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                {/* LEADERBOARD + RECENT */}
                <section id="leaderboard" className={`${styles.section} ${styles.sectionTight} ${styles.anchorSection}`}>
                    <div className={styles.boardGrid}>
                        <div className={styles.panel}>
                            <div className={styles.sectionLabel}>{t.leaderboardLabel}</div>
                            <h2 className={styles.panelTitle}>{t.leaderboardTitle}</h2>
                            {topDonators.length === 0 ? (
                                <div className={styles.emptyBox}>{t.empty}</div>
                            ) : (
                                <ol className={styles.rankList}>
                                    {topDonators.map((d, i) => (
                                        <li key={d.name} className={styles.rankRow}>
                                            <span className={`${styles.rankNo} ${i < 3 ? styles[`rank${i + 1}`] : ''}`}>
                                                {i + 1}
                                            </span>
                                            <div className={styles.rankBody}>
                                                <div className={styles.rankLine}>
                                                    <span className={styles.rankName}>{d.name}</span>
                                                    <span className={styles.feedAmount}>{baht(d.total)}</span>
                                                </div>
                                                <div className={styles.rankBar}>
                                                    <div style={{ width: `${(d.total / maxTotal) * 100}%` }} />
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        <div className={styles.panel}>
                            <div className={styles.sectionLabel}>{t.recentLabel}</div>
                            <h2 className={styles.panelTitle}>{t.recentTitle}</h2>
                            {recent.length === 0 ? (
                                <div className={styles.emptyBox}>{t.noDonations}</div>
                            ) : (
                                <ul className={styles.feedList}>
                                    {recent.map((d) => (
                                        <li key={d.id} className={styles.mockFeed}>
                                            <div className={styles.feedAvatar}>{initial(d.name)}</div>
                                            <div className={styles.feedText}>
                                                <div className={styles.feedLine}>
                                                    <b>{d.name}</b>
                                                    <span className={styles.feedTime}>{timeAgo(d.paidAt, lang)}</span>
                                                </div>
                                                {d.displayMessage && (
                                                    <div className={styles.feedMsg}>{d.displayMessage}</div>
                                                )}
                                            </div>
                                            <div className={styles.feedAmount}>+{baht(d.amount)}</div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* FOOTER */}
            <footer className={styles.footer}>
                <div className={styles.wrap}>
                    <div className={styles.footerInner}>
                        <div className={styles.footerLeft}>
                            <div className={`${styles.logoMark} ${styles.logoMarkSmall}`}>D</div>
                            <div>
                                <div className={styles.footerName}>DewDotCom</div>
                                <div className={styles.footerStack}>{t.footerThanks}</div>
                            </div>
                        </div>
                        <a href="https://misterdew.com" className={styles.footerLink}>
                            misterdew.com
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
