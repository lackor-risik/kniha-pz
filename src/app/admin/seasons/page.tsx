'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Season {
    id: string;
    name: string;
    dateFrom: string;
    dateTo: string;
    isActive: boolean;
}

export default function AdminSeasonsPage() {
    const { data: session, status } = useSession();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({ name: '', dateFrom: '', dateTo: '', isActive: false });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            redirect('/');
        }
    }, [status, session]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            loadSeasons();
        }
    }, [session]);

    async function loadSeasons() {
        try {
            const res = await fetch('/api/seasons');
            const data = await res.json();
            setSeasons(data);
        } catch (error) {
            console.error('Failed to load seasons:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/seasons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    dateFrom: new Date(formData.dateFrom).toISOString(),
                    dateTo: new Date(formData.dateTo).toISOString(),
                    isActive: formData.isActive,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba');
                return;
            }

            setFormData({ name: '', dateFrom: '', dateTo: '', isActive: false });
            setShowForm(false);
            loadSeasons();
        } catch (error) {
            setError('Chyba pripojenia');
        }
    }

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
                    <Link href="/admin" className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Sezóny</h1>
                        <p className="page-subtitle">{seasons.length} sezón</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {showForm && (
                    <div ref={formRef} className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-header"><strong>Nová sezóna</strong></div>
                        <form onSubmit={handleSubmit}>
                            <div className="card-body">
                                {error && <div className="alert alert-error">{error}</div>}
                                <div className="form-group">
                                    <label className="form-label form-label-required">Názov</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="napr. 2024/2025"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Od</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.dateFrom}
                                        onChange={(e) => setFormData({ ...formData, dateFrom: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Do</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.dateTo}
                                        onChange={(e) => setFormData({ ...formData, dateTo: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span>Aktívna sezóna</span>
                                    </label>
                                </div>
                            </div>
                            <div className="card-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                <button type="submit" className="btn btn-primary">Vytvoriť</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Zrušiť</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="card">
                    {seasons.map((s) => (
                        <Link key={s.id} href={`/admin/seasons/${s.id}`} className="list-item">
                            <span style={{ fontSize: '24px' }}>📅</span>
                            <div className="list-item-content">
                                <div className="list-item-title">{s.name}</div>
                                <div className="list-item-subtitle">
                                    {new Date(s.dateFrom).toLocaleDateString('sk')} - {new Date(s.dateTo).toLocaleDateString('sk')}
                                </div>
                                {s.isActive && <span className="badge badge-success">Aktívna</span>}
                            </div>
                            <span className="list-item-arrow">→</span>
                        </Link>
                    ))}
                </div>
            </div>

            <button className="fab" onClick={() => {
                setShowForm(true);
                setTimeout(() => {
                    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    const input = formRef.current?.querySelector('input[type="text"]') as HTMLInputElement;
                    input?.focus();
                }, 100);
            }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <BottomNav />
        </div>
    );
}
