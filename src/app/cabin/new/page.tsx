'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Cabin {
    id: string;
    name: string;
}

function NewBookingContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [cabins, setCabins] = useState<Cabin[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        cabinId: '',
        startDate: '',
        endDate: '',
        title: '',
        note: '',
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user) {
            loadCabins();
        }
    }, [session]);

    // Get startDate from URL params
    const searchParams = useSearchParams();
    const startDateParam = searchParams.get('startDate');

    useEffect(() => {
        if (startDateParam) {
            setFormData((prev) => ({ ...prev, startDate: startDateParam }));
        }
    }, [startDateParam]);

    async function loadCabins() {
        try {
            const res = await fetch('/api/cabins');
            const data = await res.json();
            setCabins(data || []);
            if (data.length > 0) {
                setFormData((prev) => ({ ...prev, cabinId: data[0].id }));
            }
        } catch (error) {
            console.error('Failed to load cabins:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/cabin-bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cabinId: formData.cabinId,
                    startAt: new Date(formData.startDate).toISOString(),
                    endAt: new Date(formData.endDate).toISOString(),
                    title: formData.title || undefined,
                    note: formData.note || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri vytváraní rezervácie');
                return;
            }

            router.push('/cabin');
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    // Get today as min date (allow same-day bookings)
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/cabin" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Nová rezervácia</h1>
                        <p className="page-subtitle">Rezervujte chatu</p>
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
                                <label className="form-label form-label-required">Chata</label>
                                <select
                                    className="form-select"
                                    value={formData.cabinId}
                                    onChange={(e) => setFormData({ ...formData, cabinId: e.target.value })}
                                    required
                                >
                                    {cabins.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Dátum príchodu</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    min={minDate}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Dátum odchodu</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    min={formData.startDate || minDate}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Názov rezervácie</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="napr. Víkendový pobyt"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Voliteľná poznámka..."
                                    value={formData.note}
                                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        disabled={submitting || !formData.startDate || !formData.endDate}
                    >
                        {submitting ? <span className="spinner"></span> : 'Vytvoriť rezerváciu'}
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}

export default function NewBookingPage() {
    return (
        <Suspense fallback={
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        }>
            <NewBookingContent />
        </Suspense>
    );
}
