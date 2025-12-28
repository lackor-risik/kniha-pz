'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface HarvestPlanItem {
    id: string;
    species: { id: string; name: string };
    plannedCount: number;
    takenCount: number;
    remainingCount: number;
    percentage: number;
    exceeded: boolean;
}

interface SeasonData {
    season: {
        id: string;
        name: string;
        dateFrom: string;
        dateTo: string;
        isActive: boolean;
    };
    harvestPlan: HarvestPlanItem[];
}

export default function HarvestPlanPage() {
    const { data: session, status } = useSession();
    const [data, setData] = useState<SeasonData | null>(null);
    const [seasons, setSeasons] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadSeasons();
        }
    }, [session]);

    useEffect(() => {
        if (selectedSeasonId) {
            loadHarvestPlan(selectedSeasonId);
        }
    }, [selectedSeasonId]);

    async function loadSeasons() {
        try {
            const res = await fetch('/api/seasons');
            const seasonsList = await res.json();
            setSeasons(seasonsList);

            // Select active season by default
            const activeSeason = seasonsList.find((s: { isActive: boolean }) => s.isActive);
            if (activeSeason) {
                setSelectedSeasonId(activeSeason.id);
            } else if (seasonsList.length > 0) {
                setSelectedSeasonId(seasonsList[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load seasons:', error);
            setLoading(false);
        }
    }

    async function loadHarvestPlan(seasonId: string) {
        try {
            setLoading(true);
            const res = await fetch(`/api/seasons/${seasonId}/harvest-plan`);
            const planData = await res.json();
            setData(planData);
        } catch (error) {
            console.error('Failed to load harvest plan:', error);
        } finally {
            setLoading(false);
        }
    }

    if (status === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!session?.user) return null;

    return (
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">Plán lovu</h1>
                <p className="page-subtitle">Prehľad sezónnych kvót a čerpania</p>
            </header>

            <div className="page-content">
                {/* Season Selector */}
                {seasons.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <select
                            className="form-select"
                            value={selectedSeasonId}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                        >
                            {seasons.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name} {s.isActive ? '(aktívna)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-8)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : !data || data.harvestPlan.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎯</div>
                        <h3 className="empty-state-title">Žiadny plán lovu</h3>
                        <p className="empty-state-description">
                            Pre túto sezónu zatiaľ nie je definovaný plán lovu.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Season Info */}
                        <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                            <div className="card-body" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>{data.season.name}</p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                        {new Date(data.season.dateFrom).toLocaleDateString('sk')} - {new Date(data.season.dateTo).toLocaleDateString('sk')}
                                    </p>
                                </div>
                                {data.season.isActive && (
                                    <span className="badge badge-success">Aktívna</span>
                                )}
                            </div>
                        </div>

                        {/* Harvest Plan Table */}
                        <div className="card">
                            <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Druh</th>
                                            <th style={{ textAlign: 'right' }}>Plán</th>
                                            <th style={{ textAlign: 'right' }}>Odlovené</th>
                                            <th style={{ textAlign: 'right' }}>Zostáva</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.harvestPlan.map((item) => (
                                            <tr key={item.id} style={item.exceeded ? { background: 'var(--color-error-light)' } : {}}>
                                                <td style={{ fontWeight: 500 }}>{item.species.name}</td>
                                                <td style={{ textAlign: 'right' }}>{item.plannedCount}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                    {item.takenCount}
                                                </td>
                                                <td style={{
                                                    textAlign: 'right',
                                                    color: item.exceeded ? 'var(--color-error)' : 'var(--color-gray-600)',
                                                    fontWeight: item.exceeded ? 600 : 400,
                                                }}>
                                                    {item.remainingCount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary */}
                        <div style={{
                            marginTop: 'var(--spacing-4)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 'var(--spacing-3)'
                        }}>
                            <div className="stat-card" style={{ textAlign: 'center' }}>
                                <div className="stat-value">
                                    {data.harvestPlan.reduce((sum, i) => sum + i.plannedCount, 0)}
                                </div>
                                <div className="stat-label">Plán celkom</div>
                            </div>
                            <div className="stat-card" style={{ textAlign: 'center' }}>
                                <div className="stat-value">
                                    {data.harvestPlan.reduce((sum, i) => sum + i.takenCount, 0)}
                                </div>
                                <div className="stat-label">Odlovené</div>
                            </div>
                            <div className="stat-card" style={{ textAlign: 'center' }}>
                                <div className="stat-value" style={{
                                    color: data.harvestPlan.some(i => i.exceeded) ? 'var(--color-error)' : 'var(--color-success)'
                                }}>
                                    {data.harvestPlan.reduce((sum, i) => sum + Math.max(0, i.remainingCount), 0)}
                                </div>
                                <div className="stat-label">Zostáva</div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
