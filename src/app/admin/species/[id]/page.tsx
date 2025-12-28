'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Species {
    id: string;
    name: string;
    requiresAge: boolean;
    requiresSex: boolean;
    requiresTag: boolean;
    requiresWeight: boolean;
    isActive: boolean;
}

export default function EditSpeciesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const speciesId = params.id as string;

    const [species, setSpecies] = useState<Species | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        requiresAge: false,
        requiresSex: false,
        requiresTag: false,
        requiresWeight: false,
        isActive: true,
    });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            router.push('/');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN' && speciesId) {
            loadSpecies();
        }
    }, [session, speciesId]);

    async function loadSpecies() {
        try {
            const res = await fetch(`/api/species/${speciesId}`);
            if (!res.ok) {
                router.push('/admin/species');
                return;
            }
            const data = await res.json();
            setSpecies(data);
            setFormData({
                name: data.name,
                requiresAge: data.requiresAge,
                requiresSex: data.requiresSex,
                requiresTag: data.requiresTag,
                requiresWeight: data.requiresWeight,
                isActive: data.isActive,
            });
        } catch (error) {
            console.error('Failed to load species:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/species/${speciesId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukladaní');
                return;
            }

            router.push('/admin/species');
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

    if (!species) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/admin/species" className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Upraviť druh</h1>
                        <p className="page-subtitle">{species.name}</p>
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
                            <div className="form-group">
                                <label className="form-switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span className="form-switch-toggle"></span>
                                    <span>Aktívny druh</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner"></span> : 'Uložiť zmeny'}
                    </button>
                </form>

                <button
                    className="btn btn-danger btn-full"
                    style={{ marginTop: 'var(--spacing-4)' }}
                    onClick={async () => {
                        if (!confirm(`Naozaj chcete odstrániť druh "${species.name}"? Druh bude deaktivovaný.`)) return;
                        try {
                            const res = await fetch(`/api/species/${speciesId}`, { method: 'DELETE' });
                            if (res.ok) {
                                router.push('/admin/species');
                            } else {
                                const data = await res.json();
                                setError(data.error || 'Chyba pri odstraňovaní');
                            }
                        } catch {
                            setError('Chyba pripojenia k serveru');
                        }
                    }}
                >
                    🗑️ Odstrániť druh
                </button>
            </div>

            <BottomNav />
        </div>
    );
}
