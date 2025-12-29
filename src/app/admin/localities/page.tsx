'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Locality {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    isOccupied: boolean;
}

export default function AdminLocalitiesPage() {
    const { data: session, status } = useSession();
    const [localities, setLocalities] = useState<Locality[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({ name: '', description: '' });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            redirect('/');
        }
    }, [status, session]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            loadLocalities();
        }
    }, [session]);

    async function loadLocalities() {
        try {
            const res = await fetch('/api/localities');
            const data = await res.json();
            setLocalities(data);
        } catch (error) {
            console.error('Failed to load localities:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/localities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba');
                return;
            }

            setFormData({ name: '', description: '' });
            setShowForm(false);
            loadLocalities();
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
                        <h1 className="page-title">Lokality</h1>
                        <p className="page-subtitle">{localities.length} lokalít</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {showForm && (
                    <div ref={formRef} className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-header"><strong>Nová lokalita</strong></div>
                        <form onSubmit={handleSubmit}>
                            <div className="card-body">
                                {error && <div className="alert alert-error">{error}</div>}
                                <div className="form-group">
                                    <label className="form-label form-label-required">Názov</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Popis</label>
                                    <textarea
                                        className="form-textarea"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
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
                    {localities.map((loc) => (
                        <Link key={loc.id} href={`/admin/localities/${loc.id}`} className="list-item">
                            <span style={{ fontSize: '24px' }}>📍</span>
                            <div className="list-item-content">
                                <div className="list-item-title">{loc.name}</div>
                                {loc.description && <div className="list-item-subtitle">{loc.description}</div>}
                                <div className="list-item-meta">
                                    {loc.isOccupied && <span className="badge badge-visit-active">● Obsadená</span>}
                                    {!loc.isActive && <span className="badge badge-error">Neaktívna</span>}
                                </div>
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
