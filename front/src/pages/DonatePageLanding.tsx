import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProgress, getTopDonators, getRecentDonations } from '../services/campaign.service';
import type { TopDonator } from '../types/topDonator';
import type { RecentDonation } from '../types/recentDonation';
import styles from './DonatePageLanding.module.css';

interface GoalProgress {
    title?: string;
    goalAmount: number;
    currentAmount: number;
    percentage: number;
}

export default function DonatePageLanding() {
    const [topDonators, setTopDonators] = useState<TopDonator[]>([]);
    const [campaignProgress, setCampaignProgress] = useState<GoalProgress | null>(null);
    const [recentDonation, setRecentDonation] = useState<RecentDonation | null>(null);

    useEffect(() => {
        const load = async () => {
            // แยกแต่ละ request ไม่ผูกกับ Promise.all
            // เพราะถ้าตัวใดตัวหนึ่ง fail (เช่น endpoint นี้ error) จะไม่ให้กราฟ/ข้อมูลอื่นพังตามไปด้วย
            try {
                const topRes = await getTopDonators();
                setTopDonators(topRes.data ?? []);
            } catch (err) {
                console.error('getTopDonators failed', err);
            }

            try {
                const progressRes = await getProgress();
                setCampaignProgress(progressRes.data);
            } catch (err) {
                console.error('getProgress failed', err);
            }

            try {
                const recentRes = await getRecentDonations();
                setRecentDonation(recentRes.data[0] ?? null);
            } catch (err) {
                console.error('getRecentDonations failed', err);
            }
        };

        load();
        const interval = setInterval(load, 15000);
        return () => clearInterval(interval);
    }, []);

    const topDonator = topDonators[0] ?? null;

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
                </div>
            </nav>

            <div className={styles.wrap}>
                {/* HERO */}
                <section className={styles.hero}>
                    <div className={styles.heroGrid}>
                        <div>
                            <div className={styles.eyebrow}>Dew Donation Center</div>
                            <h1 className={styles.h1}>
                                Thanks
                                <br />
                                For Supporting
                                <br />
                                <span>My Content</span>
                            </h1>
                            <p className={styles.heroSub}>
                                Every donation helps me create better content and continue doing what I love. Thank you for being part of this journey.
                            </p>
                            <div className={styles.heroActions}>
                                <Link to="/donate" className={`${styles.btn} ${styles.btnPrimary}`}>
                                    Donate Now
                                </Link>
                            </div>
                        </div>

                        {/* DASHBOARD MOCKUP */}
                        <div className={styles.mock}>
                            <div className={styles.mockBar}>
                                <div className={styles.mockDots}>
                                    <span />
                                    <span />
                                    <span />
                                </div>
                                <div className={styles.mockTitle}>dashboard / overview</div>
                                <div style={{ width: 40 }} />
                            </div>

                            <div className={styles.mockStats}>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>Special Thanks</div>
                                    <div className={styles.statValue}>
                                        {topDonator ? topDonator.name : '—'}
                                    </div>
                                    <div className={styles.statDelta}>
                                        {topDonator
                                            ? `฿${topDonator.total.toLocaleString()} donated`
                                            : 'No donations yet'}
                                    </div>
                                </div>
                                <div className={styles.statCard}>
                                    <div className={styles.statLabel}>ACTIVE CAMPAIGN</div>
                                    <div className={styles.statValue}>
                                        {campaignProgress
                                            ? `฿${campaignProgress.currentAmount.toLocaleString()}`
                                            : '฿0'}
                                        <span className={styles.statValueSmall}>
                                            /{campaignProgress ? campaignProgress.goalAmount.toLocaleString() : '0'}
                                        </span>
                                    </div>
                                    <div className={`${styles.statDelta} ${styles.statDeltaBlue}`}>
                                        {campaignProgress ? `${campaignProgress.percentage}% funded` : 'No active goal'}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.mockChart}>
                                <div className={styles.mockChartHead}>
                                    <span>Top Donators</span>
                                    <span>THB</span>
                                </div>
                                {topDonators.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {topDonators.slice(0, 3).map((d) => (
                                            <div
                                                key={d.name}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <span className={styles.statDelta}>
                                                    {d.name}
                                                </span>
                                                <span className={styles.feedAmount}>
                                                    ฿{d.total.toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.statDelta} style={{ height: 64, display: 'flex', alignItems: 'center' }}>
                                        No data yet
                                    </div>
                                )}
                            </div>

                            <div className={styles.mockChart}>
                                <div className={styles.mockChartHead}>
                                    <span>Recent Donation</span>
                                    <span>THB</span>
                                </div>
                                <div className={styles.mockFeed}>
                                    <div className={styles.feedAvatar} />
                                    <div className={styles.feedText}>
                                        <b>{recentDonation ? recentDonation.name : 'No donations yet'}</b>
                                        {recentDonation ? ' donated · slip verified' : ''}
                                    </div>
                                    <div className={styles.feedAmount}>
                                        {recentDonation ? `+฿${recentDonation.amount.toLocaleString()}` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES */}
                <section className={styles.section}>
                    <div className={styles.sectionHead}>
                        <div className={styles.sectionLabel}>Capabilities</div>
                        <h2>Built for live, real-money operations</h2>
                    </div>
                    <div className={styles.featureGrid}>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>💳</div>
                            <h3>PromptPay QR Payment</h3>
                            <p>Automatically generate QR Codes for every donation.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>⚡</div>
                            <h3>Automatic Slip Verification</h3>
                            <p>Upload payment slips with automatic validation.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📺</div>
                            <h3>OBS Overlay</h3>
                            <p>Display donations in real time during livestreams.</p>
                        </div>
                        <div className={styles.featureCard}>
                            <div className={styles.featureIcon}>📊</div>
                            <h3>Dashboard Analytics</h3>
                            <p>Manage campaigns, donations, and settings from one dashboard.</p>
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
                                <div className={styles.footerStack}>
                                    Built with <b>React</b> · <b>TypeScript</b> · <b>NestJS</b> ·{' '}
                                    <b>PostgreSQL</b> · <b>Prisma</b>
                                </div>
                            </div>
                        </div>
                        <a href="https://github.com" className={styles.socialIcon} aria-label="GitHub">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.11.81 2.25 0 1.635-.015 2.945-.015 3.36 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}