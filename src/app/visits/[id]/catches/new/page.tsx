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

interface Visit {
    id: string;
    isOpen: boolean;
    localityId: string;
    locality: { id: string; name: string };
    member: { id: string; displayName: string };
    hasGuest: boolean;
    guestName: string | null;
    startDate: string;
    endDate: string | null;
}

export default function NewCatchPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const visitId = params.id as string;

    const [visit, setVisit] = useState<Visit | null>(null);
    const [species, setSpecies] = useState<Species[]>([]);
    const [localities, setLocalities] = useState<Locality[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Format for datetime-local input
    const formatDateTime = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    };

    const [formData, setFormData] = useState({
        speciesId: '',
        sex: 'UNKNOWN',
        age: '',
        weight: '',
        tagNumber: '',
        shooterType: 'MEMBER',
        guestShooterName: '',
        huntingLocalityId: '',
        huntedAt: formatDateTime(new Date()),
        note: '',
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && visitId) {
            loadData();
        }
    }, [session, visitId]);

    async function loadData() {
        try {
            const [visitRes, speciesRes, localitiesRes] = await Promise.all([
                fetch(`/api/visits/${visitId}`),
                fetch('/api/species'),
                fetch('/api/localities'),
            ]);

            if (!visitRes.ok) {
                router.push('/visits');
                return;
            }

            const visitData = await visitRes.json();
            const speciesData = await speciesRes.json();
            const localitiesData = await localitiesRes.json();

            setVisit(visitData);
            setSpecies(speciesData);
            setLocalities(localitiesData);

            // Set default values based on visit data
            const updates: Partial<typeof formData> = {
                huntingLocalityId: visitData.locality.id
            };

            // If visit is not active (ended), set default time to visit start
            if (!visitData.isOpen) {
                updates.huntedAt = formatDateTime(new Date(visitData.startDate));
            }

            setFormData((prev) => ({ ...prev, ...updates }));
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    const selectedSpecies = species.find((s) => s.id === formData.speciesId);

    // Check if user can add catches
    const isAdmin = session?.user?.role === 'ADMIN';
    const isOwner = session?.user?.id === visit?.member.id;
    const canAddCatch = isAdmin || isOwner; // Admin can always, owner can add to own visits (even ended)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/visits/${visitId}/catches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speciesId: formData.speciesId,
                    count: 1, // Always 1
                    sex: formData.sex,
                    age: formData.age || undefined,
                    weight: formData.weight ? parseFloat(formData.weight) : undefined,
                    tagNumber: formData.tagNumber || undefined,
                    shooterType: formData.shooterType,
                    guestShooterName: formData.shooterType === 'GUEST' ? formData.guestShooterName : undefined,
                    huntingLocalityId: formData.huntingLocalityId || undefined,
                    huntedAt: new Date(formData.huntedAt).toISOString(),
                    note: formData.note || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri vytváraní úlovku');
                return;
            }

            router.push(`/catches/${data.id}`);
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

    if (!visit) return null;

    if (!canAddCatch) {
        return (
            <div className="page">
                <header className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                        <Link href={`/visits/${visitId}`} className="btn btn-ghost btn-icon">←</Link>
                        <h1 className="page-title">Prístup zamietnutý</h1>
                    </div>
                </header>
                <div className="page-content">
                    <div className="alert alert-error">Nemáte oprávnenie pridávať úlovky do tejto návštevy.</div>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href={`/visits/${visitId}`} className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Nový úlovok</h1>
                        <p className="page-subtitle">{visit.locality.name}</p>
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
                                    <option value="">Vyberte druh...</option>
                                    {species.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Conditional: Sex - only show when required */}
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

                            {/* Conditional: Age */}
                            {selectedSpecies?.requiresAge && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Vek</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Odhadovaný vek"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Conditional: Tag */}
                            {selectedSpecies?.requiresTag && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Číslo značky</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Zadajte číslo značky"
                                        value={formData.tagNumber}
                                        onChange={(e) => setFormData({ ...formData, tagNumber: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Conditional: Weight */}
                            {selectedSpecies?.requiresWeight && (
                                <div className="form-group">
                                    <label className="form-label form-label-required">Váha (kg)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        step="0.1"
                                        min="0"
                                        placeholder="Zadajte váhu v kg"
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
                                            guestShooterName: newType === 'GUEST' && visit.guestName ? visit.guestName : '',
                                        });
                                    }}
                                >
                                    <option value="MEMBER">{visit.member.displayName} (člen)</option>
                                    {visit.hasGuest && <option value="GUEST">{visit.guestName || 'Hosť'} (hosť)</option>}
                                </select>
                            </div>

                            {/* Hunt Time */}
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
                                <p className="form-hint">Predvolená je lokalita návštevy</p>
                            </div>

                            {/* Note */}
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
                        disabled={submitting || !formData.speciesId}
                    >
                        {submitting ? <span className="spinner"></span> : 'Uložiť úlovok'}
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}
