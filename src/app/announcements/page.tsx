'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Announcement {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    isRead: boolean;
    author: { id: string; displayName: string };
    createdAt: string;
}

export default function AnnouncementsPage() {
    const { data: session, status } = useSession();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadAnnouncements();
        }
    }, [session]);

    async function loadAnnouncements() {
        try {
            const res = await fetch('/api/announcements?limit=50');
            const data = await res.json();
            setAnnouncements(data.data || []);
        } catch (error) {
            console.error('Failed to load announcements:', error);
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
                <h1 className="page-title">Oznamy</h1>
                <p className="page-subtitle">Informácie a novinky z revíru</p>
            </header>

            <div className="page-content">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📢</div>
                        <h3 className="empty-state-title">Žiadne oznamy</h3>
                        <p className="empty-state-description">
                            Zatiaľ neboli zverejnené žiadne oznamy.
                        </p>
                    </div>
                ) : (
                    <div className="card">
                        {announcements.map((ann) => (
                            <Link key={ann.id} href={`/announcements/${ann.id}`} className="list-item">
                                {!ann.isRead && <div className="unread-indicator"></div>}
                                <div className="list-item-content">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                                        {ann.pinned && <span>📌</span>}
                                        <span className="list-item-title" style={{
                                            fontWeight: ann.isRead ? 400 : 600
                                        }}>
                                            {ann.title}
                                        </span>
                                    </div>
                                    <div className="list-item-subtitle">
                                        {ann.author.displayName} • {new Date(ann.createdAt).toLocaleDateString('sk')}
                                    </div>
                                    <p style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-gray-600)',
                                        marginTop: 'var(--spacing-1)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                    }}>
                                        {ann.body}
                                    </p>
                                </div>
                                <span className="list-item-arrow">→</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB for new announcement */}
            <Link href="/announcements/new" className="fab">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </Link>

            <BottomNav />
        </div>
    );
}
