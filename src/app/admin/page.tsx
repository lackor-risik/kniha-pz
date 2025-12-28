'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface AdminStats {
    members: number;
    localities: number;
    species: number;
    seasons: number;
}

export default function AdminPage() {
    const { data: session, status } = useSession();
    const [stats, setStats] = useState<AdminStats | null>(null);

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            redirect('/');
        }
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status, session]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            loadStats();
        }
    }, [session]);

    async function loadStats() {
        try {
            const [members, localities, species, seasons] = await Promise.all([
                fetch('/api/members').then((r) => r.json()),
                fetch('/api/localities').then((r) => r.json()),
                fetch('/api/species').then((r) => r.json()),
                fetch('/api/seasons').then((r) => r.json()),
            ]);

            setStats({
                members: members.length || 0,
                localities: localities.length || 0,
                species: species.length || 0,
                seasons: seasons.length || 0,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    if (status === 'loading' || !session?.user) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (session.user.role !== 'ADMIN') return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/" className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div>
                        <h1 className="page-title">Administrácia</h1>
                        <p className="page-subtitle">Správa revíru</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-3)',
                    marginBottom: 'var(--spacing-4)',
                }}>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.members || 0}</div>
                        <div className="stat-label">Členovia</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.localities || 0}</div>
                        <div className="stat-label">Lokality</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.species || 0}</div>
                        <div className="stat-label">Druhy zveri</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.seasons || 0}</div>
                        <div className="stat-label">Sezóny</div>
                    </div>
                </div>

                {/* Admin Menu */}
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
                    Správa
                </h2>

                <div className="card">
                    <Link href="/admin/members" className="list-item">
                        <span style={{ fontSize: '24px' }}>👥</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Členovia</div>
                            <div className="list-item-subtitle">Správa členov revíru</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/admin/localities" className="list-item">
                        <span style={{ fontSize: '24px' }}>📍</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Lokality</div>
                            <div className="list-item-subtitle">Správa lokalít revíru</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/admin/species" className="list-item">
                        <span style={{ fontSize: '24px' }}>🦌</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Druhy zveri</div>
                            <div className="list-item-subtitle">Správa druhov a ich parametrov</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                    <Link href="/admin/seasons" className="list-item">
                        <span style={{ fontSize: '24px' }}>📅</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Sezóny a plán lovu</div>
                            <div className="list-item-subtitle">Správa sezón a kvót</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
