'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    if (status === 'loading') {
        return (
            <div className="page">
                <div className="page-header">
                    <h1 className="page-title">Nastavenia</h1>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-8)' }}>
                    <div className="spinner" />
                </div>
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
            <div className="page-header">
                <button
                    onClick={() => router.push('/')}
                    className="btn btn-secondary"
                    style={{ marginRight: 'var(--spacing-3)' }}
                >
                    ← Domov
                </button>
                <h1 className="page-title">Nastavenia</h1>
            </div>

            <div className="card" style={{ maxWidth: 500 }}>
                <div style={{ marginBottom: 'var(--spacing-4)' }}>
                    <h3 style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-gray-500)',
                        marginBottom: 'var(--spacing-2)'
                    }}>
                        Prihlásený ako
                    </h3>
                    <p style={{
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 500
                    }}>
                        {session.user?.name}
                    </p>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-gray-600)'
                    }}>
                        {session.user?.email}
                    </p>
                </div>

                <div style={{
                    borderTop: '1px solid var(--color-gray-200)',
                    paddingTop: 'var(--spacing-4)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-3)'
                }}>
                    <Link
                        href="/settings/password"
                        className="btn btn-secondary"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textDecoration: 'none'
                        }}
                    >
                        <span>🔐 Zmeniť heslo</span>
                        <span>→</span>
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="btn"
                        style={{
                            background: 'var(--color-error-bg)',
                            color: 'var(--color-error)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-2)'
                        }}
                    >
                        🚪 Odhlásiť sa
                    </button>
                </div>
            </div>
        </div>
    );
}
