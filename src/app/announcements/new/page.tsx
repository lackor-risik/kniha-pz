'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

export default function NewAnnouncementPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        body: '',
        pinned: false,
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri vytváraní oznamu');
                return;
            }

            router.push(`/announcements/${data.id}`);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    if (status === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    const isAdmin = session?.user?.role === 'ADMIN';

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/announcements" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Nový oznam</h1>
                        <p className="page-subtitle">Zdieľajte informácie s členmi</p>
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
                                <label className="form-label form-label-required">Nadpis</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nadpis oznamu"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    maxLength={200}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label form-label-required">Text oznamu</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Napíšte text oznamu..."
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                    required
                                    rows={8}
                                />
                            </div>

                            {isAdmin && (
                                <div className="form-group">
                                    <label className="form-switch">
                                        <input
                                            type="checkbox"
                                            checked={formData.pinned}
                                            onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                                        />
                                        <span className="form-switch-toggle"></span>
                                        <span>📌 Pripnutý oznam</span>
                                    </label>
                                    <p className="form-hint">Pripnuté oznamy sa zobrazujú na vrchu zoznamu</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        disabled={submitting || !formData.title || !formData.body}
                    >
                        {submitting ? <span className="spinner"></span> : 'Zverejniť oznam'}
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}
