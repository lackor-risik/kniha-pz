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
}

interface Locality {
    id: string;
    name: string;
}

interface CatchData {
    id: string;
    species: { id: string; name: string };
    huntingLocality: { id: string; name: string };
    sex: string;
    age: string | null;
    weight: number | null;
    tagNumber: string | null;
    shooterType: string;
    guestShooterName: string | null;
    huntedAt: string;
    note: string | null;
    visit: {
        id: string;
        memberId: string;
        hasGuest: boolean;
        guestName: string | null;
        member: { displayName: string };
    };
}

export default function EditCatchPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const catchId = params.id as string;

    const [catchData, setCatchData] = useState<CatchData | null>(null);
    const [species, setSpecies] = useState<Species[]>([]);
    const [localities, setLocalities] = useState<Locality[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        speciesId: '',
        sex: 'UNKNOWN',
        age: '',
        weight: '',
        tagNumber: '',
        shooterType: 'MEMBER',
        guestShooterName: '',
        huntingLocalityId: '',
        huntedAt: '',
        note: '',
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && catchId) {
            loadData();
        }
    }, [session, catchId]);

    async function loadData() {
        try {
            const [catchRes, speciesRes, localitiesRes] = await Promise.all([
                fetch(`/api/catches/${catchId}`),
                fetch('/api/species'),
                fetch('/api/localities'),
            ]);

            if (!catchRes.ok) {
                router.push('/visits');
                return;
            }

            const catchDataResult = await catchRes.json();
            const speciesData = await speciesRes.json();
            const localitiesData = await localitiesRes.json();

            // Check permissions
            const isAdmin = session?.user?.role === 'ADMIN';
            const isOwner = session?.user?.id === catchDataResult.visit.memberId;
            if (!isAdmin && !isOwner) {
                router.push(`/catches/${catchId}`);
                return;
            }

            setCatchData(catchDataResult);
            setSpecies(speciesData);
            setLocalities(localitiesData);
            setFormData({
                speciesId: catchDataResult.species.id,
                sex: catchDataResult.sex,
                age: catchDataResult.age || '',
                weight: catchDataResult.weight?.toString() || '',
                tagNumber: catchDataResult.tagNumber || '',
                shooterType: catchDataResult.shooterType,
                guestShooterName: catchDataResult.guestShooterName || '',
                huntingLocalityId: catchDataResult.huntingLocality.id,
                huntedAt: new Date(new Date(catchDataResult.huntedAt).getTime() - new Date(catchDataResult.huntedAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                note: catchDataResult.note || '',
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    const selectedSpecies = species.find((s) => s.id === formData.speciesId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/catches/${catchId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speciesId: formData.speciesId,
                    sex: formData.sex,
                    age: formData.age || undefined,
                    weight: formData.weight ? parseFloat(formData.weight) : undefined,
                    tagNumber: formData.tagNumber || undefined,
                    shooterType: formData.shooterType,
                    guestShooterName: formData.shooterType === 'GUEST' ? formData.guestShooterName : undefined,
                    huntingLocalityId: formData.huntingLocalityId,
                    huntedAt: formData.huntedAt ? new Date(formData.huntedAt).toISOString() : undefined,
                    note: formData.note || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukladaní úlovku');
                return;
            }

            router.push(`/catches/${catchId}`);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/catches/${catchId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                router.push(`/visits/${catchData?.visit.id}`);
            } else {
                const data = await res.json();
                setError(data.error || 'Chyba pri mazaní');
            }
        } catch {
            setError('Chyba pripojenia k serveru');
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

    if (!catchData) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href={`/catches/${catchId}`} className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Upraviť úlovok</h1>
                        <p className="page-subtitle">{catchData.species.name}</p>
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
                            {/* Species */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Druh zveri</label>
                                <select
                                    className="form-select"
                                    value={formData.speciesId}
                                    onChange={(e) => setFormData({ ...formData, speciesId: e.target.value })}
                                    required
                                >
                                    {species.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sex - only show when required */}
                            {selectedSpecies?.requiresSex && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">
                                        Pohlavie
                                    </label>
                                    <select
                                        className="form-select"
                                        value={formData.sex}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        required
                                    >
                                        <option value="">Vyberte pohlavie...</option>
                                        <option value="MALE">Samec</option>
                                        <option value="FEMALE">Samica</option>
                                    </select>
                                </div>
                            )}

                            {/* Age */}
                            {selectedSpecies?.requiresAge && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Vek</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Tag */}
                            {selectedSpecies?.requiresTag && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Číslo značky</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.tagNumber}
                                        onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Weight */}
                            {selectedSpecies?.requiresWeight && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Váha (kg)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        step="0.1"
                                        min="0"
                                        value={formData.weight}
                                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Shooter Type */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Strelec</label>
                                <select
                                    className="form-select"
                                    value={formData.shooterType}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        setFormData({
                                            ...formData,
                                            shooterType: newType,
                                            guestShooterName: newType === 'GUEST' && catchData.visit.guestName ? catchData.visit.guestName : '',
                                        });
                                    }}
                                >
                                    <option value="MEMBER">{catchData.visit.member.displayName} (člen)</option>
                                    {catchData.visit.hasGuest && <option value="GUEST">{catchData.visit.guestName || 'Hosť'} (hosť)</option>}
                                </select>
                            </div>

                            {/* Hunted At */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Čas lovu</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.huntedAt}
                                    onChange={(e) => setFormData({ ...formData, huntedAt: e.target.value })}
                                    required
                                />
                            </div>

                            {/* Hunting Locality */}
                            <div className="form-group">
                                <label className="form-label">Lokalita lovu</label>
                                <select
                                    className="form-select"
                                    value={formData.huntingLocalityId}
                                    onChange={(e) => setFormData({ ...formData, huntingLocalityId: e.target.value })}
                                >
                                    {localities.map((l) => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Note */}
                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
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
                        disabled={submitting || !formData.speciesId}
                    >
                        {submitting ? <span className="spinner"></span> : 'Uložiť zmeny'}
                    </button>
                </form>

                <button
                    className="btn btn-danger btn-full"
                    style={{ marginTop: 'var(--spacing-4)' }}
                    onClick={() => setShowDeleteModal(true)}
                >
                    🗑️ Zmazať úlovok
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Zmazať úlovok?</h3>
                        <p className="modal-message">
                            Naozaj chcete zmazať tento úlovok? Táto akcia sa nedá vrátiť späť.
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
                                {deleting ? <span className="spinner"></span> : 'Zmazať'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
