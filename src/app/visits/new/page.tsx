'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Locality {
    id: string;
    name: string;
    isOccupied: boolean;
}

interface Member {
    id: string;
    displayName: string;
}

export default function NewVisitPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [localities, setLocalities] = useState<Locality[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isAdmin = session?.user?.role === 'ADMIN';

    // Calculate datetime limits
    const now = new Date();
    const maxFutureMs = 4 * 60 * 60 * 1000; // 4 hours
    const maxDateTime = new Date(now.getTime() + maxFutureMs);

    // Format for datetime-local input
    const formatDateTime = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    };

    const [formData, setFormData] = useState({
        localityId: '',
        startDateTime: formatDateTime(now),
        hasGuest: false,
        guestName: '',
        guestNote: '',
        note: '',
        memberId: '', // For admin only
    });

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user) {
            loadLocalities();
            if (isAdmin) {
                loadMembers();
            }
        }
    }, [session, isAdmin]);

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

    async function loadMembers() {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            setMembers(data.filter((m: Member & { isActive: boolean }) => m.isActive));
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        const startDate = new Date(formData.startDateTime);
        const currentTime = new Date();
        const maxAllowed = new Date(currentTime.getTime() + maxFutureMs);

        // Validate start time is not more than 4 hours in the future
        if (startDate > maxAllowed) {
            setError('Začiatok návštevy môže byť maximálne 4 hodiny v budúcnosti');
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch('/api/visits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localityId: formData.localityId,
                    startDate: startDate.toISOString(),
                    hasGuest: formData.hasGuest,
                    guestName: formData.hasGuest ? formData.guestName : undefined,
                    guestNote: formData.hasGuest ? formData.guestNote : undefined,
                    note: formData.note || undefined,
                    memberId: isAdmin && formData.memberId ? formData.memberId : undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri vytváraní návštevy');
                return;
            }

            router.push(`/visits/${data.id}`);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    const availableLocalities = localities.filter((l) => !l.isOccupied);

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
                    <Link href="/visits" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Nová návšteva</h1>
                        <p className="page-subtitle">Začať novú návštevu revíru</p>
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
                            {/* Member Selection - Admin only */}
                            {isAdmin && (
                                <div className="form-group">
                                    <label className="form-label">Člen</label>
                                    <select
                                        className="form-select"
                                        value={formData.memberId}
                                        onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                                    >
                                        <option value="">Ja (vlastná návšteva)</option>
                                        {members.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.displayName}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="form-hint">
                                        Ako admin môžete začať návštevu v mene iného člena
                                    </p>
                                </div>
                            )}

                            {/* Locality Selection */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Lokalita</label>
                                {availableLocalities.length === 0 ? (
                                    <div className="alert alert-warning">
                                        Všetky lokality sú momentálne obsadené.
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        value={formData.localityId}
                                        onChange={(e) => setFormData({ ...formData, localityId: e.target.value })}
                                        required
                                    >
                                        <option value="">Vyberte lokalitu...</option>
                                        {availableLocalities.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {localities.filter((l) => l.isOccupied).length > 0 && (
                                    <p className="form-hint">
                                        Obsadené lokality: {localities.filter((l) => l.isOccupied).map((l) => l.name).join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* Start DateTime */}
                            <div className="form-group">
                                <label className="form-label form-label-required">Dátum a čas začiatku</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={formData.startDateTime}
                                    onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                                    max={formatDateTime(maxDateTime)}
                                    required
                                />
                                <p className="form-hint">
                                    Maximálne 4 hodiny dopredu od terajšieho času
                                </p>
                            </div>

                            {/* Has Guest */}
                            <div className="form-group">
                                <label className="form-switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasGuest}
                                        onChange={(e) => setFormData({ ...formData, hasGuest: e.target.checked })}
                                    />
                                    <span className="form-switch-toggle"></span>
                                    <span>Mám hosťa</span>
                                </label>
                            </div>

                            {/* Guest Name & Note - shown only if hasGuest */}
                            {formData.hasGuest && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label form-label-required">Meno hosťa</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Meno a priezvisko hosťa"
                                            value={formData.guestName}
                                            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Poznámka k hosťovi</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Dodatočné informácie..."
                                            value={formData.guestNote}
                                            onChange={(e) => setFormData({ ...formData, guestNote: e.target.value })}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Note */}
                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Voliteľná poznámka k návšteve..."
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
                        disabled={submitting || !formData.localityId}
                    >
                        {submitting ? (
                            <span className="spinner"></span>
                        ) : (
                            'Začať návštevu'
                        )}
                    </button>
                </form>
            </div>

            <BottomNav />
        </div>
    );
}
