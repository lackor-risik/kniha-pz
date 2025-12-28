'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Booking {
    id: string;
    cabin: { id: string; name: string };
    member: { id: string; displayName: string };
    startAt: string;
    endAt: string;
    title: string | null;
    note: string | null;
    status: string;
    createdAt: string;
}

export default function BookingDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && bookingId) {
            loadBooking();
        }
    }, [session, bookingId]);

    async function loadBooking() {
        try {
            const res = await fetch(`/api/cabin-bookings/${bookingId}`);
            if (!res.ok) {
                router.push('/cabin');
                return;
            }
            const data = await res.json();
            setBooking(data);
        } catch (error) {
            console.error('Failed to load booking:', error);
            router.push('/cabin');
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/cabin-bookings/${bookingId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                router.push('/cabin');
            }
        } catch (error) {
            console.error('Failed to delete booking:', error);
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

    if (!booking) return null;

    const isAdmin = session?.user?.role === 'ADMIN';
    const isOwner = session?.user?.id === booking.member.id;
    const canEdit = isAdmin || isOwner;

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('sk', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/cabin" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div style={{ flex: 1 }}>
                        <h1 className="page-title">{booking.title || booking.cabin.name}</h1>
                        <p className="page-subtitle">{booking.member.displayName}</p>
                    </div>
                    {canEdit && (
                        <Link href={`/cabin/booking/${bookingId}/edit`} className="btn btn-ghost btn-icon">
                            ✏️
                        </Link>
                    )}
                </div>
            </header>

            <div className="page-content">
                <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <div className="card-body">
                        <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Chata</span>
                                <span style={{ fontWeight: 500 }}>{booking.cabin.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Od</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(booking.startAt)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Do</span>
                                <span style={{ fontWeight: 500 }}>{formatDate(booking.endAt)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Rezervoval</span>
                                <span style={{ fontWeight: 500 }}>{booking.member.displayName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Stav</span>
                                <span className={`badge ${booking.status === 'CONFIRMED' ? 'badge-success' : booking.status === 'CANCELLED' ? 'badge-error' : 'badge-warning'}`}>
                                    {booking.status === 'CONFIRMED' ? 'Potvrdená' : booking.status === 'CANCELLED' ? 'Zrušená' : 'Čaká'}
                                </span>
                            </div>
                            {booking.note && (
                                <div>
                                    <span style={{ color: 'var(--color-gray-500)', display: 'block', marginBottom: 'var(--spacing-1)' }}>
                                        Poznámka
                                    </span>
                                    <p style={{ whiteSpace: 'pre-wrap' }}>{booking.note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {canEdit && (
                    <button
                        className="btn btn-danger btn-full"
                        onClick={() => setShowDeleteModal(true)}
                    >
                        🗑️ Odstrániť rezerváciu
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Odstrániť rezerváciu?</h3>
                        <p className="modal-message">
                            Naozaj chcete odstrániť túto rezerváciu? Táto akcia sa nedá vrátiť späť.
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
