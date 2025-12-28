'use client';

import { useSession } from 'next-auth/react';
import { redirect, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
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

export default function VisitsPage() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const [visits, setVisits] = useState<Visit[]>([]);
    const [loading, setLoading] = useState(true);

    // Get initial filter from URL param or default to 'all'
    const tabParam = searchParams.get('tab');
    const initialFilter = tabParam === 'active' ? 'active' : tabParam === 'closed' ? 'closed' : 'all';
    const [filter, setFilter] = useState<'all' | 'active' | 'closed'>(initialFilter);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadVisits();
        }
    }, [session, filter]);

    async function loadVisits() {
        try {
            const params = new URLSearchParams({ limit: '50' });
            if (filter === 'active') params.set('active', 'true');
            if (filter === 'closed') params.set('active', 'false');

            const res = await fetch(`/api/visits?${params}`);
            const data = await res.json();
            setVisits(data.data || []);
        } catch (error) {
            console.error('Failed to load visits:', error);
        } finally {
            setLoading(false);
        }
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
                        className={`tab ${filter === 'closed' ? 'active' : ''}`}
                        onClick={() => setFilter('closed')}
                    >
                        Ukončené
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                                    {visit.isOpen && (
                                        <span className="badge badge-visit-active">● Aktívna</span>
                                    )}
                                    {visit.catchCount > 0 && (
                                        <span className="badge badge-visit-catch">🎯 {visit.catchCount}</span>
                                    )}
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">{visit.locality.name}</div>
                                    <div className="list-item-subtitle">
                                        {visit.member.displayName} • {new Date(visit.startDate).toLocaleString('sk')}
                                        {visit.endDate && ` - ${new Date(visit.endDate).toLocaleString('sk')}`}
                                        {visit.hasGuest && ' • 👤 Hosť'}
                                    </div>
                                </div>
                                <span className="list-item-arrow">→</span>
                            </Link>
                        ))}
                    </div>
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
