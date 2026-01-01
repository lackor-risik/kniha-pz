'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';

interface DashboardStats {
    activeVisit: {
        id: string;
        locality: { name: string };
        startDate: string;
        catchCount: number;
    } | null;
    activeSeason: {
        id: string;
        name: string;
        dateFrom: string;
        dateTo: string;
    } | null;
    totalCatches: number;
    activeVisitsCount: number;
    unreadAnnouncements: number;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadDashboard();
            // Load avatar URL
            fetch('/api/me')
                .then(res => res.json())
                .then(data => {
                    if (data.avatarUrl) {
                        setAvatarUrl(data.avatarUrl);
                    }
                })
                .catch(() => { });
        }
    }, [session]);

    async function loadDashboard() {
        try {
            // Load active visit for current user
            const visitsRes = await fetch(`/api/visits?active=true&limit=1&memberId=${session?.user?.id}`);
            const visitsData = await visitsRes.json();
            const activeVisit = visitsData.data?.[0] || null;

            // Load active season
            const seasonsRes = await fetch('/api/seasons');
            const seasonsData = await seasonsRes.json();
            const activeSeason = Array.isArray(seasonsData)
                ? seasonsData.find((s: { isActive: boolean }) => s.isActive)
                : null;

            // Load announcements for unread count
            const announcementsRes = await fetch('/api/announcements?limit=1');
            const announcementsData = await announcementsRes.json();

            // Load active visits count (all members)
            const activeVisitsRes = await fetch('/api/visits?active=true&limit=1');
            const activeVisitsData = await activeVisitsRes.json();

            setStats({
                activeVisit,
                activeSeason,
                totalCatches: activeVisit?.catchCount || 0,
                activeVisitsCount: activeVisitsData.pagination?.total || 0,
                unreadAnnouncements: announcementsData.unreadCount || 0,
            });
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!session?.user) {
        return null;
    }

    return (
        <div className="page">
            {/* Header */}
            <header style={{
                background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)',
                color: 'var(--color-white)',
                padding: 'var(--spacing-6)',
                paddingBottom: 'var(--spacing-8)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-4)' }}>
                    <div
                        onClick={() => router.push('/settings')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-3)',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            <Avatar src={avatarUrl} name={session.user.name || ''} size={50} />
                            <div style={{
                                position: 'absolute',
                                bottom: -2,
                                right: -2,
                                width: 22,
                                height: 22,
                                background: 'rgba(255,255,255,0.95)',
                                borderRadius: 'var(--radius-full)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                            }}>
                                ⚙️
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>{session.user.name}</p>
                            <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.7 }}>Nastavenia profilu →</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-1)' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); signOut({ callbackUrl: '/login' }); }}
                            className="badge"
                            style={{
                                background: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                cursor: 'pointer',
                                border: 'none',
                                fontSize: 'var(--font-size-xs)'
                            }}
                        >
                            🚪 Odhlásiť
                        </button>
                    </div>
                </div>

                {stats?.activeSeason && (
                    <div style={{
                        marginTop: 'var(--spacing-3)',
                        padding: 'var(--spacing-3)',
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: 'var(--radius-md)',
                    }}>
                        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>Aktuálna sezóna</div>
                        <div style={{ fontWeight: 600 }}>{stats.activeSeason.name}</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', opacity: 0.8 }}>
                            {new Date(stats.activeSeason.dateFrom).toLocaleDateString('sk')} - {new Date(stats.activeSeason.dateTo).toLocaleDateString('sk')}
                        </div>
                    </div>
                )}
            </header>

            <div className="page-content" style={{ marginTop: '-40px' }}>
                {/* Active Visit Card */}
                {stats?.activeVisit ? (
                    <Link href={`/visits/${stats.activeVisit.id}`}>
                        <div className="card" style={{
                            marginBottom: 'var(--spacing-4)',
                            border: '2px solid var(--color-visit-active)',
                        }}>
                            <div className="card-body">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        background: 'var(--color-success-light)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px',
                                    }}>
                                        📍
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)', fontWeight: 600 }}>
                                            Aktívna návšteva
                                        </p>
                                        <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>
                                            {stats.activeVisit.locality.name}
                                        </p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                            {new Date(stats.activeVisit.startDate).toLocaleDateString('sk')} • {stats.activeVisit.catchCount} úlovkov
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--color-gray-400)' }}>→</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-body" style={{ textAlign: 'center', padding: 'var(--spacing-6)' }}>
                            <p style={{ color: 'var(--color-gray-500)', marginBottom: 'var(--spacing-4)' }}>
                                Nemáte aktívnu návštevu
                            </p>
                            <Link href="/visits/new" className="btn btn-primary">
                                + Začať návštevu
                            </Link>
                        </div>
                    </div>
                )}

                {/* Quick Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-3)',
                    marginBottom: 'var(--spacing-4)',
                }}>
                    <Link href="/visits?tab=active">
                        <div className="stat-card" style={{ cursor: 'pointer' }}>
                            <div className="stat-value">{stats?.activeVisitsCount || 0}</div>
                            <div className="stat-label">
                                {(() => {
                                    const count = stats?.activeVisitsCount || 0;
                                    if (count === 0) return 'nikto v revíri';
                                    if (count === 1) return 'člen v revíri';
                                    if (count >= 2 && count <= 4) return 'členovia v revíri';
                                    return 'členov v revíri';
                                })()}
                            </div>
                        </div>
                    </Link>
                    {stats?.unreadAnnouncements && stats.unreadAnnouncements > 0 ? (
                        <Link href="/announcements">
                            <div className="stat-card" style={{ background: 'var(--color-error-light)' }}>
                                <div className="stat-value" style={{ color: 'var(--color-error)' }}>
                                    {stats.unreadAnnouncements}
                                </div>
                                <div className="stat-label">Neprečítané oznamy</div>
                            </div>
                        </Link>
                    ) : (
                        <div className="stat-card">
                            <div className="stat-value">✓</div>
                            <div className="stat-label">Všetko prečítané</div>
                        </div>
                    )}
                </div>

                {/* Quick Links */}
                <h2 style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 600,
                    marginBottom: 'var(--spacing-3)',
                    color: 'var(--color-gray-700)'
                }}>
                    Rýchle akcie
                </h2>
                <div className="card">
                    <Link href="/visits?tab=mine" className="list-item">
                        <span style={{ fontSize: '24px' }}>🗺️</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Moje návštevy</div>
                            <div className="list-item-subtitle">Zobraziť moje návštevy revíru</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/catches" className="list-item">
                        <span style={{ fontSize: '24px' }}>🎯</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Úlovky</div>
                            <div className="list-item-subtitle">Prehľad úlovkov za sezónu</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/harvest-plan" className="list-item">
                        <span style={{ fontSize: '24px' }}>📊</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Plán lovu</div>
                            <div className="list-item-subtitle">Prehľad sezónnych kvót</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/cabin" className="list-item">
                        <span style={{ fontSize: '24px' }}>🏠</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Rezervácie chaty</div>
                            <div className="list-item-subtitle">Kalendár rezervácií</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
