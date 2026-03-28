'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Season {
    id: string;
    name: string;
    dateFrom: string;
    dateTo: string;
    isActive: boolean;
}

interface Species {
    id: string;
    name: string;
}

interface HarvestPlanItem {
    id: string;
    species: { id: string; name: string };
    plannedCount: number;
    takenCount: number;
    remainingCount: number;
    percentage: number;
    exceeded: boolean;
    note: string | null;
}

export default function EditSeasonPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const seasonId = params.id as string;

    const [season, setSeason] = useState<Season | null>(null);
    const [harvestPlan, setHarvestPlan] = useState<HarvestPlanItem[]>([]);
    const [speciesList, setSpeciesList] = useState<Species[]>([]);
    const [allSeasons, setAllSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [copying, setCopying] = useState(false);
    const [copyMode, setCopyMode] = useState<'new' | 'existing'>('new');
    const [selectedTargetSeasonId, setSelectedTargetSeasonId] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState<HarvestPlanItem | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        dateFrom: '',
        dateTo: '',
        isActive: false,
    });

    const [planFormData, setPlanFormData] = useState({
        speciesId: '',
        plannedCount: 0,
        note: '',
    });

    const [copyFormData, setCopyFormData] = useState({
        name: '',
        dateFrom: '',
        dateTo: '',
        isActive: false,
    });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            router.push('/');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN' && seasonId) {
            loadData();
        }
    }, [session, seasonId]);

    async function loadData() {
        try {
            const [seasonRes, harvestRes, speciesRes, seasonsRes] = await Promise.all([
                fetch(`/api/seasons/${seasonId}`),
                fetch(`/api/seasons/${seasonId}/harvest-plan`),
                fetch('/api/species'),
                fetch('/api/seasons'),
            ]);

            if (!seasonRes.ok) {
                router.push('/admin/seasons');
                return;
            }

            const seasonData = await seasonRes.json();
            const harvestData = await harvestRes.json();
            const speciesData = await speciesRes.json();
            const seasonsData = await seasonsRes.json();

            setSeason(seasonData);
            setHarvestPlan(harvestData.harvestPlan || []);
            setSpeciesList(speciesData);
            setAllSeasons(seasonsData.filter((s: Season) => s.id !== seasonId));
            setFormData({
                name: seasonData.name,
                dateFrom: seasonData.dateFrom.split('T')[0],
                dateTo: seasonData.dateTo.split('T')[0],
                isActive: seasonData.isActive,
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/seasons/${seasonId}`, {
                method: 'PUT',
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
                setError(data.error || 'Chyba pri ukladaní');
                return;
            }

            router.push('/admin/seasons');
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleAddOrEditPlanItem(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch(`/api/seasons/${seasonId}/harvest-plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speciesId: planFormData.speciesId,
                    plannedCount: planFormData.plannedCount,
                    note: planFormData.note || undefined,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukladaní plánu');
                return;
            }

            // Reload harvest plan
            const harvestRes = await fetch(`/api/seasons/${seasonId}/harvest-plan`);
            const harvestData = await harvestRes.json();
            setHarvestPlan(harvestData.harvestPlan || []);

            setShowAddForm(false);
            setEditingItem(null);
            setPlanFormData({ speciesId: '', plannedCount: 0, note: '' });
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        }
    }

    function startEditItem(item: HarvestPlanItem) {
        setEditingItem(item);
        setPlanFormData({
            speciesId: item.species.id,
            plannedCount: item.plannedCount,
            note: item.note || '',
        });
        setShowAddForm(true);
    }

    async function handleDeletePlanItem() {
        if (!editingItem) return;
        if (!confirm(`Naozaj chcete odstrániť "${editingItem.species.name}" z plánu lovu?`)) return;

        try {
            const res = await fetch(`/api/seasons/${seasonId}/harvest-plan/${editingItem.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Chyba pri odstraňovaní');
                return;
            }

            // Reload harvest plan
            const harvestRes = await fetch(`/api/seasons/${seasonId}/harvest-plan`);
            const harvestData = await harvestRes.json();
            setHarvestPlan(harvestData.harvestPlan || []);

            cancelAddForm();
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        }
    }


    function cancelAddForm() {
        setShowAddForm(false);
        setEditingItem(null);
        setPlanFormData({ speciesId: '', plannedCount: 0, note: '' });
    }

    function openCopyModal() {
        // Smart defaults: increment year in name and dates
        const currentName = formData.name || '';
        const yearMatch = currentName.match(/(\d{4})\s*\/\s*(\d{4})/);
        let newName = '';
        let newDateFrom = '';
        let newDateTo = '';

        if (yearMatch) {
            const y1 = parseInt(yearMatch[1]) + 1;
            const y2 = parseInt(yearMatch[2]) + 1;
            newName = currentName.replace(yearMatch[0], `${y1}/${y2}`);
        } else {
            newName = currentName + ' (kópia)';
        }

        if (formData.dateFrom) {
            const d = new Date(formData.dateFrom);
            d.setFullYear(d.getFullYear() + 1);
            newDateFrom = d.toISOString().split('T')[0];
        }
        if (formData.dateTo) {
            const d = new Date(formData.dateTo);
            d.setFullYear(d.getFullYear() + 1);
            newDateTo = d.toISOString().split('T')[0];
        }

        setCopyFormData({
            name: newName,
            dateFrom: newDateFrom,
            dateTo: newDateTo,
            isActive: false,
        });
        setCopyMode('new');
        setSelectedTargetSeasonId('');
        setShowCopyModal(true);
    }

    async function handleCopy(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setCopying(true);

        try {
            let requestBody: Record<string, unknown>;

            if (copyMode === 'existing') {
                if (!selectedTargetSeasonId) {
                    setError('Vyberte cieľovú sezónu');
                    setCopying(false);
                    return;
                }
                requestBody = { targetSeasonId: selectedTargetSeasonId };
            } else {
                requestBody = {
                    name: copyFormData.name,
                    dateFrom: new Date(copyFormData.dateFrom).toISOString(),
                    dateTo: new Date(copyFormData.dateTo).toISOString(),
                    isActive: copyFormData.isActive,
                };
            }

            const res = await fetch(`/api/seasons/${seasonId}/copy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri kopírovaní');
                setCopying(false);
                return;
            }

            // Navigate to the target season
            router.push(`/admin/seasons/${data.id}`);
        } catch (error) {
            setError('Chyba pripojenia k serveru');
            setCopying(false);
        }
    }

    // Filter species not already in plan (unless editing that species)
    const availableSpecies = speciesList.filter(
        (s) => !harvestPlan.some((p) => p.species.id === s.id) || editingItem?.species.id === s.id
    );

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!season) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/admin/seasons" className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Upraviť sezónu</h1>
                        <p className="page-subtitle">{season.name}</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                {/* Season Form */}
                <form onSubmit={handleSubmit}>
                    <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-header"><strong>Základné údaje</strong></div>
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
                                <label className="form-switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span className="form-switch-toggle"></span>
                                    <span>Aktívna sezóna</span>
                                </label>
                            </div>
                        </div>
                        <div className="card-footer">
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? <span className="spinner"></span> : 'Uložiť zmeny'}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Harvest Plan Section */}
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Plán lovu</strong>
                        {!showAddForm && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowAddForm(true)}
                            >
                                + Pridať
                            </button>
                        )}
                    </div>

                    {/* Add/Edit Form */}
                    {showAddForm && (
                        <form onSubmit={handleAddOrEditPlanItem}>
                            <div className="card-body" style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Druh zveri</label>
                                    <select
                                        className="form-select"
                                        value={planFormData.speciesId}
                                        onChange={(e) => setPlanFormData({ ...planFormData, speciesId: e.target.value })}
                                        required
                                        disabled={!!editingItem}
                                    >
                                        <option value="">Vyberte druh...</option>
                                        {availableSpecies.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label form-label-required">Plánovaný počet</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        value={planFormData.plannedCount}
                                        onChange={(e) => setPlanFormData({ ...planFormData, plannedCount: parseInt(e.target.value) || 0 })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Poznámka</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={planFormData.note}
                                        onChange={(e) => setPlanFormData({ ...planFormData, note: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                        <button type="submit" className="btn btn-primary btn-sm">
                                            {editingItem ? 'Uložiť' : 'Pridať'}
                                        </button>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={cancelAddForm}>
                                            Zrušiť
                                        </button>
                                    </div>
                                    {editingItem && (
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={handleDeletePlanItem}
                                        >
                                            🗑️ Odstrániť
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    )}

                    {/* Harvest Plan List */}
                    {harvestPlan.length === 0 ? (
                        <div className="card-body">
                            <p style={{ color: 'var(--color-gray-500)', textAlign: 'center' }}>
                                Zatiaľ žiadne položky plánu lovu
                            </p>
                        </div>
                    ) : (
                        <div>
                            {harvestPlan.map((item) => (
                                <div
                                    key={item.id}
                                    className="list-item"
                                    onClick={() => startEditItem(item)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <span style={{ fontSize: '24px' }}>🎯</span>
                                    <div className="list-item-content">
                                        <div className="list-item-title">{item.species.name}</div>
                                        <div className="list-item-subtitle">
                                            Plán: {item.plannedCount} | Ulovené: {item.takenCount} | Zostáva: {item.remainingCount}
                                        </div>
                                        <div style={{ marginTop: 'var(--spacing-2)' }}>
                                            <div className="progress" style={{ height: '6px' }}>
                                                <div
                                                    className={`progress-bar ${item.exceeded ? 'exceeded' : ''}`}
                                                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        {item.note && (
                                            <div className="list-item-subtitle" style={{ marginTop: 'var(--spacing-1)' }}>
                                                📝 {item.note}
                                            </div>
                                        )}
                                    </div>
                                    <span className="list-item-arrow">✏️</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Copy Harvest Plan Button */}
                {harvestPlan.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-4)', textAlign: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={openCopyModal}
                            style={{ gap: 'var(--spacing-2)' }}
                        >
                            📋 Kopírovať plán do inej sezóny
                        </button>
                    </div>
                )}

                {/* Copy Modal */}
                {showCopyModal && (
                    <div className="modal-overlay" onClick={() => setShowCopyModal(false)}>
                        <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', margin: 'auto' }}>
                            <div className="card-header">
                                <strong>📋 Kopírovať plán lovu</strong>
                            </div>
                            <form onSubmit={handleCopy}>
                                <div className="card-body">
                                    <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem', marginBottom: 'var(--spacing-3)' }}>
                                        Skopíruje sa {harvestPlan.length} položiek plánu lovu.
                                        {copyMode === 'existing'
                                            ? ' Existujúce položky v cieľovej sezóne sa prepíšu.'
                                            : ' Počty odlovených kusov sa vynulujú.'}
                                    </p>

                                    {/* Mode Toggle */}
                                    <div className="form-group">
                                        <label className="form-label">Cieľ kopírovania</label>
                                        <div style={{ display: 'flex', gap: '0', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-gray-200)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setCopyMode('new')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-2) var(--spacing-3)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    background: copyMode === 'new' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                                                    color: copyMode === 'new' ? 'white' : 'var(--color-gray-600)',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                ✨ Nová sezóna
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCopyMode('existing')}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-2) var(--spacing-3)',
                                                    border: 'none',
                                                    borderLeft: '1px solid var(--color-gray-200)',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    background: copyMode === 'existing' ? 'var(--color-primary)' : 'var(--color-gray-50)',
                                                    color: copyMode === 'existing' ? 'white' : 'var(--color-gray-600)',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                📅 Existujúca sezóna
                                            </button>
                                        </div>
                                    </div>

                                    {copyMode === 'existing' ? (
                                        /* Existing Season Selector */
                                        <div className="form-group">
                                            <label className="form-label form-label-required">Cieľová sezóna</label>
                                            {allSeasons.length === 0 ? (
                                                <p style={{ color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
                                                    Žiadne iné sezóny nie sú k dispozícii.
                                                </p>
                                            ) : (
                                                <select
                                                    className="form-select"
                                                    value={selectedTargetSeasonId}
                                                    onChange={(e) => setSelectedTargetSeasonId(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Vyberte sezónu...</option>
                                                    {allSeasons.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name} {s.isActive ? '(aktívna)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    ) : (
                                        /* New Season Form */
                                        <>
                                            <div className="form-group">
                                                <label className="form-label form-label-required">Názov novej sezóny</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={copyFormData.name}
                                                    onChange={(e) => setCopyFormData({ ...copyFormData, name: e.target.value })}
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label form-label-required">Od</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={copyFormData.dateFrom}
                                                    onChange={(e) => setCopyFormData({ ...copyFormData, dateFrom: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label form-label-required">Do</label>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={copyFormData.dateTo}
                                                    onChange={(e) => setCopyFormData({ ...copyFormData, dateTo: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={copyFormData.isActive}
                                                        onChange={(e) => setCopyFormData({ ...copyFormData, isActive: e.target.checked })}
                                                    />
                                                    <span className="form-switch-toggle"></span>
                                                    <span>Nastaviť ako aktívnu sezónu</span>
                                                </label>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="card-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={copying || (copyMode === 'existing' && allSeasons.length === 0)}
                                    >
                                        {copying ? <span className="spinner"></span> : '📋 Kopírovať'}
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCopyModal(false)}>
                                        Zrušiť
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
