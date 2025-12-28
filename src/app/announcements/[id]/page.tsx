'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Announcement {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    isRead: boolean;
    author: { id: string; displayName: string; avatarUrl?: string };
    createdAt: string;
    updatedAt: string;
}

export default function AnnouncementDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const announcementId = params.id as string;

    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && announcementId) {
            loadAnnouncement();
        }
    }, [session, announcementId]);

    async function loadAnnouncement() {
        try {
            const res = await fetch(`/api/announcements/${announcementId}`);
            if (!res.ok) {
                router.push('/announcements');
                return;
            }
            const data = await res.json();
            setAnnouncement(data);

            // Mark as read
            if (!data.isRead) {
                fetch(`/api/announcements/${announcementId}/read`, { method: 'POST' });
            }
        } catch (error) {
            console.error('Failed to load announcement:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/announcements/${announcementId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.push('/announcements');
            }
        } catch (error) {
            console.error('Failed to delete announcement:', error);
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!announcement) return null;

    const isAdmin = session?.user?.role === 'ADMIN';
    const isAuthor = session?.user?.id === announcement.author.id;
    const canEdit = isAdmin || isAuthor;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/announcements" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div style={{ flex: 1 }}>
                        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                            {announcement.pinned && <span>📌</span>}
                            {announcement.title}
                        </h1>
                        <p className="page-subtitle">
                            {announcement.author.displayName} • {new Date(announcement.createdAt).toLocaleDateString('sk')}
                        </p>
                    </div>
                    {canEdit && (
                        <Link href={`/announcements/${announcementId}/edit`} className="btn btn-ghost btn-icon">
                            ✏️
                        </Link>
                    )}
                </div>
            </header>

            <div className="page-content">
                <div className="card">
                    <div className="card-body">
                        <div style={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                            fontSize: 'var(--font-size-base)',
                        }}>
                            {announcement.body}
                        </div>
                    </div>
                </div>

                {canEdit && (
                    <button
                        className="btn btn-danger btn-full"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        onClick={() => setShowDeleteModal(true)}
                    >
                        🗑️ Odstrániť oznam
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Odstrániť oznam?</h3>
                        <p className="modal-message">
                            Naozaj chcete odstrániť tento oznam? Táto akcia sa nedá vrátiť späť.
                        </p>
                        <div className="modal-actions">
                            <button
                                className="btn btn-ghost"
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                            >
                                Zrušiť
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? <span className="spinner"></span> : 'Odstrániť'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

