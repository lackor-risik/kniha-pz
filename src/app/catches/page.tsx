'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { getSpeciesEmoji } from '@/lib/speciesEmoji';

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

interface Member {
    id: string;
    displayName: string;
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
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const isAdmin = session?.user?.role === 'ADMIN';

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadSeasons();
            if (isAdmin) {
                loadMembers();
            }
        }
    }, [session, isAdmin]);

    useEffect(() => {
        if (selectedSeasonId) {
            loadCatches(selectedSeasonId, selectedMemberId);
        }
    }, [selectedSeasonId, selectedMemberId]);

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

    async function loadMembers() {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            setMembers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    async function loadCatches(seasonId: string, memberId?: string) {
        try {
            setLoading(true);
            let url = `/api/catches?seasonId=${seasonId}`;
            if (memberId) {
                url += `&memberId=${memberId}`;
            }
            const res = await fetch(url);
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

                {/* Member Filter - Admin only */}
                {isAdmin && members.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <select
                            className="form-select"
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                        >
                            <option value="">Všetci členovia</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.displayName}
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
                            Celkom: {catches.length} {(() => {
                                const count = catches.length;
                                if (count === 0) return 'úlovkov';
                                if (count === 1) return 'úlovok';
                                if (count >= 2 && count <= 4) return 'úlovky';
                                return 'úlovkov';
                            })()} v {groupedCatches.length} {(() => {
                                const count = groupedCatches.length;
                                if (count === 0) return 'druhoch';
                                if (count === 1) return 'druhu';
                                return 'druhoch';
                            })()}
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
                                    <span>{getSpeciesEmoji(group.speciesName)}</span>
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
                                                    {c.huntingLocality.name} • {new Date(c.huntedAt).toLocaleString('sk', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
