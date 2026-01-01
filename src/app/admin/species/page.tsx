'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { getSpeciesEmoji } from '@/lib/speciesEmoji';

interface Species {
    id: string;
    name: string;
    requiresAge: boolean;
    requiresSex: boolean;
    requiresTag: boolean;
    requiresWeight: boolean;
    isActive: boolean;
}

export default function AdminSpeciesPage() {
    const { data: session, status } = useSession();
    const [species, setSpecies] = useState<Species[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const formRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({
        name: '',
        requiresAge: false,
        requiresSex: false,
        requiresTag: false,
        requiresWeight: false,
    });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            redirect('/');
        }
    }, [status, session]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            loadSpecies();
        }
    }, [session]);

    async function loadSpecies() {
        try {
            const res = await fetch('/api/species');
            const data = await res.json();
            setSpecies(data);
        } catch (error) {
            console.error('Failed to load species:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/species', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba');
                return;
            }

            setFormData({ name: '', requiresAge: false, requiresSex: false, requiresTag: false, requiresWeight: false });
            setShowForm(false);
            loadSpecies();
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
                        <h1 className="page-title">Druhy zveri</h1>
                        <p className="page-subtitle">{species.length} druhov</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {showForm && (
                    <div ref={formRef} className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-header"><strong>Nový druh</strong></div>
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
                                    <label className="form-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiresAge}
                                            onChange={(e) => setFormData({ ...formData, requiresAge: e.target.checked })}
                                        />
                                        <span>Vyžaduje vek</span>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiresSex}
                                            onChange={(e) => setFormData({ ...formData, requiresSex: e.target.checked })}
                                        />
                                        <span>Vyžaduje pohlavie</span>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiresTag}
                                            onChange={(e) => setFormData({ ...formData, requiresTag: e.target.checked })}
                                        />
                                        <span>Vyžaduje značku</span>
                                    </label>
                                </div>
                                <div className="form-group">
                                    <label className="form-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.requiresWeight}
                                            onChange={(e) => setFormData({ ...formData, requiresWeight: e.target.checked })}
                                        />
                                        <span>Vyžaduje váhu</span>
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
                    {species.map((s) => (
                        <Link key={s.id} href={`/admin/species/${s.id}`} className="list-item">
                            <span style={{ fontSize: '24px' }}>{getSpeciesEmoji(s.name)}</span>
                            <div className="list-item-content">
                                <div className="list-item-title">{s.name}</div>
                                <div className="list-item-meta">
                                    {s.requiresAge && <span className="badge badge-info">Vek</span>}
                                    {s.requiresSex && <span className="badge badge-info">Pohlavie</span>}
                                    {s.requiresTag && <span className="badge badge-warning">Značka</span>}
                                    {s.requiresWeight && <span className="badge badge-success">Váha</span>}
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
