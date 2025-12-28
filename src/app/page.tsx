'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

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
    totalVisits: number;
    unreadAnnouncements: number;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadDashboard();
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

            // Load recent visits count
            const allVisitsRes = await fetch('/api/visits?limit=1');
            const allVisitsData = await allVisitsRes.json();

            setStats({
                activeVisit,
                activeSeason,
                totalCatches: activeVisit?.catchCount || 0,
                totalVisits: allVisitsData.pagination?.total || 0,
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
                    <div>
                        <p style={{ fontSize: 'var(--font-size-sm)', opacity: 0.9 }}>Vitajte späť,</p>
                        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 600 }}>
                            {session.user.name}
                        </h1>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="btn btn-ghost"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                    >
                        Odhlásiť
                    </button>
                </div>

                {session.user.role === 'ADMIN' && (
                    <Link
                        href="/admin"
                        className="badge badge-warning"
                        style={{ marginTop: 'var(--spacing-2)' }}
                    >
                        ⚙️ Admin
                    </Link>
                )}

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
                    <div className="stat-card">
                        <div className="stat-value">{stats?.totalVisits || 0}</div>
                        <div className="stat-label">Celkom návštev</div>
                    </div>
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
                    <Link href="/visits?tab=active" className="list-item">
                        <span style={{ fontSize: '24px' }}>🗺️</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Aktívne návštevy</div>
                            <div className="list-item-subtitle">Zobraziť práve prebiehajúce návštevy</div>
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
