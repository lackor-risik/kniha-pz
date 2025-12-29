'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Catch {
    id: string;
    huntedAt: string;
    species: { id: string; name: string };
    huntingLocality: { id: string; name: string };
    shooterType: string;
    guestShooterName: string | null;
    visit: {
        id: string;
        member: { id: string; displayName: string };
    };
    _count: { photos: number };
}

interface Season {
    id: string;
    name: string;
    isActive: boolean;
}

interface GroupedCatches {
    speciesId: string;
    speciesName: string;
    catches: Catch[];
}

export default function CatchesListPage() {
    const { data: session, status } = useSession();
    const [catches, setCatches] = useState<Catch[]>([]);
    const [seasons, setSeasons] = useState<Season[]>([]);
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
            loadCatches(selectedSeasonId);
        }
    }, [selectedSeasonId]);

    async function loadSeasons() {
        try {
            const res = await fetch('/api/seasons');
            const data = await res.json();
            setSeasons(data);

            const activeSeason = data.find((s: Season) => s.isActive);
            if (activeSeason) {
                setSelectedSeasonId(activeSeason.id);
            } else if (data.length > 0) {
                setSelectedSeasonId(data[0].id);
            } else {
                setLoading(false);
            }
        } catch (error) {
            console.error('Failed to load seasons:', error);
            setLoading(false);
        }
    }

    async function loadCatches(seasonId: string) {
        try {
            setLoading(true);
            const res = await fetch(`/api/catches?seasonId=${seasonId}`);
            const data = await res.json();
            setCatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load catches:', error);
            setCatches([]);
        } finally {
            setLoading(false);
        }
    }

    // Group catches by species
    const groupedCatches = useMemo<GroupedCatches[]>(() => {
        const groups: Record<string, GroupedCatches> = {};

        for (const c of catches) {
            if (!groups[c.species.id]) {
                groups[c.species.id] = {
                    speciesId: c.species.id,
                    speciesName: c.species.name,
                    catches: [],
                };
            }
            groups[c.species.id].catches.push(c);
        }

        return Object.values(groups).sort((a, b) => a.speciesName.localeCompare(b.speciesName, 'sk'));
    }, [catches]);

    function getShooterName(c: Catch): string {
        if (c.shooterType === 'GUEST' && c.guestShooterName) {
            return c.guestShooterName;
        }
        return c.visit.member.displayName;
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
                <h1 className="page-title">Úlovky</h1>
                <p className="page-subtitle">Prehľad úlovkov za sezónu</p>
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
                ) : catches.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎯</div>
                        <h3 className="empty-state-title">Žiadne úlovky</h3>
                        <p className="empty-state-description">
                            Za vybrané obdobie neboli zaznamenané žiadne úlovky.
                        </p>
                    </div>
                ) : (
                    <>
                        <div style={{
                            marginBottom: 'var(--spacing-3)',
                            color: 'var(--color-gray-600)',
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            Celkom: {catches.length} úlovkov v {groupedCatches.length} druhoch
                        </div>

                        {groupedCatches.map((group) => (
                            <div key={group.speciesId} style={{ marginBottom: 'var(--spacing-4)' }}>
                                <h3 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)'
                                }}>
                                    <span>🦌</span>
                                    {group.speciesName}
                                    <span className="badge badge-gray" style={{ fontWeight: 400 }}>
                                        {group.catches.length}
                                    </span>
                                </h3>
                                <div className="card">
                                    {group.catches.map((c) => (
                                        <Link key={c.id} href={`/catches/${c.id}`} className="list-item">
                                            <div className="list-item-content">
                                                <div className="list-item-title">
                                                    {getShooterName(c)}
                                                </div>
                                                <div className="list-item-subtitle">
                                                    {c.huntingLocality.name} • {new Date(c.huntedAt).toLocaleString('sk')}
                                                    {c._count.photos > 0 && ` • 📷 ${c._count.photos}`}
                                                </div>
                                            </div>
                                            <span className="list-item-arrow">→</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
