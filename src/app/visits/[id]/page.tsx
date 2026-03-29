'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Visit {
    id: string;
    locality: { id: string; name: string };
    member: { id: string; displayName: string; avatarUrl?: string };
    startDate: string;
    endDate: string | null;
    hasGuest: boolean;
    guestName: string | null;
    guestNote: string | null;
    note: string | null;
    isOpen: boolean;
    catchCount: number;
    catches: Catch[];
}

interface Catch {
    id: string;
    species: { id: string; name: string };
    huntingLocality: { id: string; name: string };
    count: number;
    sex: string;
    age: string | null;
    tagNumber: string | null;
    shooterType: string;
    guestShooterName: string | null;
    huntedAt: string;
    _count: { photos: number };
}

interface Locality {
    id: string;
    name: string;
}

interface Member {
    id: string;
    displayName: string;
}

export default function VisitDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const visitId = params.id as string;

    const [visit, setVisit] = useState<Visit | null>(null);
    const [loading, setLoading] = useState(true);
    const [ending, setEnding] = useState(false);
    const [error, setError] = useState('');
    const [showEndModal, setShowEndModal] = useState(false);
    const [endDateTime, setEndDateTime] = useState('');
    const [endNote, setEndNote] = useState('');
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [addingGuest, setAddingGuest] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState<Record<string, unknown>>({ note: '', hasGuest: false, guestName: '', guestNote: '' });
    const [saving, setSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [localities, setLocalities] = useState<Locality[]>([]);
    const [members, setMembers] = useState<Member[]>([]);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && visitId) {
            loadVisit();
        }
    }, [session, visitId]);

    async function loadVisit() {
        try {
            const res = await fetch(`/api/visits/${visitId}`);
            if (!res.ok) {
                router.push('/visits');
                return;
            }
            const data = await res.json();
            setVisit(data);

            // Load admin data (localities + members) if admin
            if (session?.user?.role === 'ADMIN' && localities.length === 0) {
                const [locRes, memRes] = await Promise.all([
                    fetch('/api/localities'),
                    fetch('/api/members'),
                ]);
                if (locRes.ok) setLocalities(await locRes.json());
                if (memRes.ok) setMembers(await memRes.json());
            }
        } catch (error) {
            console.error('Failed to load visit:', error);
            router.push('/visits');
        } finally {
            setLoading(false);
        }
    }

    function openEndModal() {
        // Set default to current time
        const now = new Date();
        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setEndDateTime(localDateTime);
        setEndNote(visit?.note || '');
        setShowEndModal(true);
    }

    async function handleEndVisit() {
        if (!endDateTime) return;

        const endDate = new Date(endDateTime);
        const now = new Date();

        // Validate end time is not in the future
        if (endDate > now) {
            setError('Čas ukončenia nemôže byť v budúcnosti');
            return;
        }

        // Validate end time is after start
        if (visit && endDate < new Date(visit.startDate)) {
            setError('Čas ukončenia nemôže byť pred začiatkom návštevy');
            return;
        }

        setEnding(true);
        setError('');

        try {
            const res = await fetch(`/api/visits/${visitId}/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endDate: endDate.toISOString(),
                    note: endNote || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukončovaní návštevy');
                return;
            }

            setVisit(data);
            setShowEndModal(false);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setEnding(false);
        }
    }

    async function handleAddGuest() {
        if (!guestName.trim()) return;

        setAddingGuest(true);
        setError('');

        try {
            const res = await fetch(`/api/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hasGuest: true,
                    guestName: guestName.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri pridávaní hosťa');
                return;
            }

            // Reload visit to get updated data
            await loadVisit();
            setShowGuestModal(false);
            setGuestName('');
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setAddingGuest(false);
        }
    }

    function toLocalDateTimeString(dateStr: string) {
        const d = new Date(dateStr);
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }

    function openEditModal() {
        if (visit) {
            const base: Record<string, unknown> = {
                note: visit.note || '',
                hasGuest: visit.hasGuest,
                guestName: visit.guestName || '',
                guestNote: visit.guestNote || '',
            };
            if (session?.user?.role === 'ADMIN') {
                base.localityId = visit.locality.id;
                base.memberId = visit.member.id;
                base.startDate = toLocalDateTimeString(visit.startDate);
                base.endDate = visit.endDate ? toLocalDateTimeString(visit.endDate) : '';
            }
            setEditData(base);
            setShowEditModal(true);
        }
    }

    async function handleSaveEdit() {
        setSaving(true);
        setError('');

        try {
            const payload: Record<string, unknown> = { ...editData };

            // Convert local datetime strings to ISO for admin
            if (session?.user?.role === 'ADMIN') {
                if (payload.startDate) {
                    payload.startDate = new Date(payload.startDate as string).toISOString();
                }
                if (payload.endDate) {
                    payload.endDate = new Date(payload.endDate as string).toISOString();
                } else {
                    payload.endDate = null;
                }
            }

            const res = await fetch(`/api/visits/${visitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukladaní');
                return;
            }

            await loadVisit();
            setShowEditModal(false);
        } catch {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteVisit() {
        setDeleting(true);
        setError('');

        try {
            const res = await fetch(`/api/visits/${visitId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Chyba pri mazaní');
                setDeleting(false);
                return;
            }

            router.push('/visits');
        } catch {
            setError('Chyba pripojenia k serveru');
            setDeleting(false);
        }
    }

    const isAdmin = session?.user?.role === 'ADMIN';
    const canEdit = session?.user && (
        isAdmin || session.user.id === visit?.member.id
    );

    // Get max datetime (now)
    const now = new Date();
    const maxDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    // Get min datetime (visit start)
    const minDateTime = visit ? new Date(new Date(visit.startDate).getTime() - new Date(visit.startDate).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16) : '';

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!visit) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/visits" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div style={{ flex: 1 }}>
                        <h1 className="page-title">{visit.locality.name}</h1>
                        <p className="page-subtitle">{visit.member.displayName}</p>
                    </div>
                    {visit.isOpen && (
                        <span className="badge badge-visit-active">● Aktívna</span>
                    )}
                    {canEdit && (
                        <button onClick={openEditModal} className="btn btn-ghost btn-sm">
                            ✏️
                        </button>
                    )}
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                {/* Visit Info Card */}
                <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <div className="card-body">
                        <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Začiatok</span>
                                <span style={{ fontWeight: 500 }}>
                                    {new Date(visit.startDate).toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            {visit.endDate && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>Koniec</span>
                                    <span style={{ fontWeight: 500 }}>
                                        {new Date(visit.endDate).toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Hosť</span>
                                <span style={{ fontWeight: 500 }}>
                                    {visit.hasGuest ? (visit.guestName || 'Áno') + (visit.guestNote ? ` (${visit.guestNote})` : '') : 'Nie'}
                                </span>
                            </div>
                            {visit.note && (
                                <div>
                                    <span style={{ color: 'var(--color-gray-500)', display: 'block', marginBottom: 'var(--spacing-1)' }}>
                                        Poznámka
                                    </span>
                                    <p>{visit.note}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {visit.isOpen && canEdit && (
                        <div className="card-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                            {!visit.hasGuest && (
                                <button
                                    className="btn btn-secondary btn-full"
                                    onClick={() => setShowGuestModal(true)}
                                >
                                    👥 Pridať hosťa
                                </button>
                            )}
                            <button
                                className="btn btn-danger btn-full"
                                onClick={openEndModal}
                            >
                                Ukončiť návštevu
                            </button>
                        </div>
                    )}
                </div>

                {/* Catches Section */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-3)' }}>
                    <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                        Úlovky ({visit.catches.length})
                    </h2>
                    {canEdit && (
                        <Link href={`/visits/${visit.id}/catches/new`} className="btn btn-primary btn-sm">
                            + Pridať úlovok
                        </Link>
                    )}
                </div>

                {visit.catches.length === 0 ? (
                    <div className="card">
                        <div className="card-body empty-state" style={{ padding: 'var(--spacing-6)' }}>
                            <p style={{ color: 'var(--color-gray-500)' }}>Zatiaľ žiadne úlovky</p>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        {visit.catches.map((c) => (
                            <Link key={c.id} href={`/catches/${c.id}`} className="list-item">
                                <span style={{ fontSize: '24px' }}>🎯</span>
                                <div className="list-item-content">
                                    <div className="list-item-title">{c.species.name}</div>
                                    <div className="list-item-subtitle">
                                        {c.huntingLocality.name} • {new Date(c.huntedAt).toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        {c.shooterType === 'GUEST' && ` • 👤 ${c.guestShooterName}`}
                                    </div>
                                    <div className="list-item-meta">
                                        {c.tagNumber && <span className="badge badge-info">{c.tagNumber}</span>}
                                        {c._count.photos > 0 && <span className="badge badge-gray">📷 {c._count.photos}</span>}
                                    </div>
                                </div>
                                <span className="list-item-arrow">→</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* End Visit Modal */}
            {showEndModal && (
                <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ukončiť návštevu</h3>
                            <button className="modal-close" onClick={() => setShowEndModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">
                                    Dátum a čas ukončenia
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={endDateTime}
                                    onChange={(e) => setEndDateTime(e.target.value)}
                                    min={minDateTime}
                                    max={maxDateTime}
                                />
                                <p className="form-hint">
                                    Maximálne teraz ({new Date().toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })})
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
                                    value={endNote}
                                    onChange={(e) => setEndNote(e.target.value)}
                                    placeholder="Poznámka k návšteve..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowEndModal(false)}
                            >
                                Zrušiť
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleEndVisit}
                                disabled={ending || !endDateTime}
                            >
                                {ending ? <span className="spinner"></span> : 'Ukončiť'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Guest Modal */}
            {showGuestModal && (
                <div className="modal-overlay" onClick={() => setShowGuestModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Pridať hosťa</h3>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">Meno hosťa</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Meno a priezvisko hosťa"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowGuestModal(false);
                                    setGuestName('');
                                }}
                            >
                                Zrušiť
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddGuest}
                                disabled={addingGuest || !guestName.trim()}
                            >
                                {addingGuest ? <span className="spinner"></span> : 'Pridať'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Visit Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Upraviť návštevu</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Admin-only fields */}
                            {isAdmin && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Člen</label>
                                        <select
                                            className="form-select"
                                            value={(editData.memberId as string) || ''}
                                            onChange={(e) => setEditData({ ...editData, memberId: e.target.value })}
                                        >
                                            {members.map((m) => (
                                                <option key={m.id} value={m.id}>{m.displayName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Lokalita</label>
                                        <select
                                            className="form-select"
                                            value={(editData.localityId as string) || ''}
                                            onChange={(e) => setEditData({ ...editData, localityId: e.target.value })}
                                        >
                                            {localities.map((l) => (
                                                <option key={l.id} value={l.id}>{l.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Začiatok</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={(editData.startDate as string) || ''}
                                            onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Koniec</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={(editData.endDate as string) || ''}
                                            onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                                        />
                                        <p className="form-hint">Nechajte prázdne pre aktívnu návštevu</p>
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <label className="form-label">Poznámka</label>
                                <textarea
                                    className="form-textarea"
                                    value={(editData.note as string) || ''}
                                    onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                                    placeholder="Poznámka k návšteve..."
                                    rows={3}
                                />
                            </div>

                            {isAdmin && (
                                <>
                                    <div className="form-group">
                                        <label className="form-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={editData.hasGuest as boolean}
                                                onChange={(e) => setEditData({ ...editData, hasGuest: e.target.checked })}
                                            />
                                            <span>S hosťom</span>
                                        </label>
                                    </div>

                                    {editData.hasGuest && (
                                        <>
                                            <div className="form-group">
                                                <label className="form-label">Meno hosťa</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={(editData.guestName as string) || ''}
                                                    onChange={(e) => setEditData({ ...editData, guestName: e.target.value })}
                                                    placeholder="Meno a priezvisko"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Poznámka k hosťovi</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={(editData.guestNote as string) || ''}
                                                    onChange={(e) => setEditData({ ...editData, guestNote: e.target.value })}
                                                    placeholder="Napr. číslo povolenia"
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Zrušiť
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                >
                                    {saving ? <span className="spinner"></span> : 'Uložiť'}
                                </button>
                            </div>
                            {isAdmin && (
                                <button
                                    className="btn btn-danger"
                                    onClick={() => { setShowEditModal(false); setShowDeleteModal(true); }}
                                >
                                    🗑️ Zmazať
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Zmazať návštevu</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Naozaj chcete zmazať túto návštevu?</p>
                            {visit && visit.catches.length > 0 && (
                                <div className="alert alert-error" style={{ marginTop: 'var(--spacing-3)' }}>
                                    ⚠️ Spolu s návštevou sa zmaže aj {visit.catches.length} úlovkov a všetky ich fotky!
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Zrušiť
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteVisit}
                                disabled={deleting}
                            >
                                {deleting ? <span className="spinner"></span> : '🗑️ Zmazať návštevu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
