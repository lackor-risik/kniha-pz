'use client';

import { useSession } from 'next-auth/react';
import { redirect, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Visit {
    id: string;
    locality: { id: string; name: string };
    member: { id: string; displayName: string };
    startDate: string;
    endDate: string | null;
    hasGuest: boolean;
    isOpen: boolean;
    catchCount: number;
}

function VisitsContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 50;

    // Get initial filter from URL param or default to 'all'
    const tabParam = searchParams.get('tab');
    const initialFilter = tabParam === 'active' ? 'active' : tabParam === 'mine' ? 'mine' : 'all';
    const [filter, setFilter] = useState<'all' | 'active' | 'mine'>(initialFilter);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            // Reset when filter changes
            setVisits([]);
            setPage(1);
            setHasMore(true);
            loadVisits(1, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, filter]);

    async function loadVisits(pageNum: number, reset = false) {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const params = new URLSearchParams({
                limit: String(LIMIT),
                page: String(pageNum)
            });
            if (filter === 'active') params.set('active', 'true');
            if (filter === 'mine' && session?.user?.id) params.set('memberId', session.user.id);

            const res = await fetch(`/api/visits?${params}`);
            const data = await res.json();
            const newVisits = data.data || [];

            if (reset) {
                setVisits(newVisits);
            } else {
                setVisits(prev => [...prev, ...newVisits]);
            }

            // Check if there are more pages
            const totalPages = data.pagination?.totalPages || 1;
            setHasMore(pageNum < totalPages);
        } catch (error) {
            console.error('Failed to load visits:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    function loadMore() {
        const nextPage = page + 1;
        setPage(nextPage);
        loadVisits(nextPage, false);
    }

    if (status === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!session?.user) return null;

    return (
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">Návštevy</h1>
                <p className="page-subtitle">Prehľad všetkých návštev revíru</p>
            </header>

            <div className="page-content">
                {/* Filter Tabs */}
                <div className="tabs" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <button
                        className={`tab ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Všetky
                    </button>
                    <button
                        className={`tab ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Aktívne
                    </button>
                    <button
                        className={`tab ${filter === 'mine' ? 'active' : ''}`}
                        onClick={() => setFilter('mine')}
                    >
                        Moje
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : visits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🗺️</div>
                        <h3 className="empty-state-title">Žiadne návštevy</h3>
                        <p className="empty-state-description">
                            {filter === 'active'
                                ? 'Momentálne nie sú aktívne žiadne návštevy.'
                                : 'Zatiaľ neboli zaznamenané žiadne návštevy.'}
                        </p>
                    </div>
                ) : (
                    <div className="card">
                        {visits.map((visit) => (
                            <Link key={visit.id} href={`/visits/${visit.id}`} className="list-item">
                                <div className="list-item-content">
                                    <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)', flexWrap: 'wrap' }}>
                                        {visit.locality.name}
                                        {visit.isOpen && (
                                            <span className="badge badge-visit-active">● Aktívna</span>
                                        )}
                                        {visit.catchCount > 0 && (
                                            <span className="badge badge-visit-catch">🎯 {visit.catchCount}</span>
                                        )}
                                    </div>
                                    <div className="list-item-subtitle">
                                        {visit.member.displayName} • {(() => {
                                            const start = new Date(visit.startDate);
                                            const startDateStr = start.toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                                            if (!visit.endDate) return startDateStr;

                                            const end = new Date(visit.endDate);
                                            const sameDay = start.toDateString() === end.toDateString();

                                            if (sameDay) {
                                                const endTimeStr = end.toLocaleString('sk', { hour: '2-digit', minute: '2-digit' });
                                                return `${startDateStr} - ${endTimeStr}`;
                                            } else {
                                                const endDateStr = end.toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                return `${startDateStr} - ${endDateStr}`;
                                            }
                                        })()}
                                        {visit.hasGuest && ' • 👤 Hosť'}
                                    </div>
                                </div>
                                <span className="list-item-arrow">→</span>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Load More Button */}
                {!loading && visits.length > 0 && hasMore && (
                    <button
                        className="btn btn-secondary btn-full"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? <span className="spinner"></span> : 'Načítať viac'}
                    </button>
                )}
            </div>

            {/* FAB for new visit */}
            <Link href="/visits/new" className="fab">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </Link>

            <BottomNav />
        </div>
    );
}

export default function VisitsPage() {
    return (
        <Suspense fallback={
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        }>
            <VisitsContent />
        </Suspense>
    );
}
