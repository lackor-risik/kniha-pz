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
}

export default function EditBookingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const bookingId = params.id as string;

    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        startAt: '',
        endAt: '',
        note: '',
    });

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

    const formatDateForInput = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
    };

    async function loadBooking() {
        try {
            const res = await fetch(`/api/cabin-bookings/${bookingId}`);
            if (!res.ok) {
                router.push('/cabin');
                return;
            }
            const data = await res.json();

            // Check permissions
            const isAdmin = session?.user?.role === 'ADMIN';
            const isOwner = session?.user?.id === data.member.id;
            if (!isAdmin && !isOwner) {
                router.push(`/cabin/booking/${bookingId}`);
                return;
            }

            setBooking(data);
            setFormData({
                title: data.title || '',
                startAt: formatDateForInput(data.startAt),
                endAt: formatDateForInput(data.endAt),
                note: data.note || '',
            });
        } catch (error) {
            console.error('Failed to load booking:', error);
            router.push('/cabin');
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/cabin-bookings/${bookingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title || undefined,
                    startAt: new Date(formData.startAt).toISOString(),
                    endAt: new Date(formData.endAt).toISOString(),
                    note: formData.note || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri aktualizácii rezervácie');
                return;
            }

            router.push(`/cabin/booking/${bookingId}`);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
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

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href={`/cabin/booking/${bookingId}`} className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Upraviť rezerváciu</h1>
                        <p className="page-subtitle">{booking.cabin.name}</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label">Názov / účel</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="napr. Víkendový pobyt"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Dátum od</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startAt}
                                    onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Dátum do</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.endAt}
                                    onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                                    min={formData.startAt}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Ďalšie informácie..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        disabled={submitting || !formData.startAt || !formData.endAt}
                    >
                        {submitting ? <span className="spinner"></span> : 'Uložiť zmeny'}
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}
