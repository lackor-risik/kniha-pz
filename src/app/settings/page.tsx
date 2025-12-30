'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';
import { Avatar } from '@/components/Avatar';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (session?.user?.id) {
            fetch('/api/me')
                .then(res => res.json())
                .then(data => {
                    if (data.avatarUrl) {
                        setAvatarUrl(data.avatarUrl);
                    }
                })
                .catch(() => { });
        }
    }, [session?.user?.id]);

    if (status === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (status !== 'authenticated') {
        router.push('/login');
        return null;
    }

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/login' });
    };

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <button onClick={() => router.push('/')} className="btn btn-ghost btn-icon">
                        ←
                    </button>
                    <div>
                        <h1 className="page-title">Nastavenia</h1>
                        <p className="page-subtitle">Profil a možnosti</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {/* User Info Card */}
                <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <div className="card-body">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
                            <Avatar src={avatarUrl} name={session.user?.name || ''} size={64} />
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-1)' }}>
                                    {session.user?.name}
                                </h3>
                                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                    {session.user?.email}
                                </p>
                                <span className="badge badge-info" style={{ marginTop: 'var(--spacing-2)' }}>
                                    {session.user?.role === 'ADMIN' ? 'Administrátor' : 'Člen'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Settings Menu */}
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
                    Možnosti
                </h2>

                <div className="card">
                    <Link href="/settings/password" className="list-item">
                        <span style={{ fontSize: '24px' }}>🔐</span>
                        <div className="list-item-content">
                            <div className="list-item-title">Zmeniť heslo</div>
                            <div className="list-item-subtitle">Aktualizujte svoje prihlasovacie heslo</div>
                        </div>
                        <span className="list-item-arrow">→</span>
                    </Link>

                    <button onClick={handleLogout} className="list-item" style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <span style={{ fontSize: '24px' }}>🚪</span>
                        <div className="list-item-content">
                            <div className="list-item-title" style={{ color: 'var(--color-error)' }}>Odhlásiť sa</div>
                            <div className="list-item-subtitle">Ukončiť aktuálnu reláciu</div>
                        </div>
                        <span className="list-item-arrow" style={{ color: 'var(--color-error)' }}>→</span>
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
