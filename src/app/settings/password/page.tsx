'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

function PasswordForm() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForceMode = searchParams.get('force') === 'true';

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Check if user has password set
        const checkPassword = async () => {
            try {
                const res = await fetch('/api/me');
                if (res.ok) {
                    const data = await res.json();
                    setHasPassword(data.hasPassword ?? false);
                }
            } catch {
                setHasPassword(false);
            }
        };

        if (session?.user?.id) {
            checkPassword();
        }
    }, [session?.user?.id]);

    if (status === 'loading' || hasPassword === null) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError('Heslá sa nezhodujú');
            return;
        }

        if (newPassword.length < 6) {
            setError('Heslo musí mať aspoň 6 znakov');
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/me/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: hasPassword ? currentPassword : undefined,
                    newPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Nastala chyba');
            } else {
                setSuccess(true);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setHasPassword(true);

                // If force mode, redirect to home after success
                if (isForceMode) {
                    setTimeout(() => {
                        router.push('/');
                    }, 1500);
                }
            }
        } catch {
            setError('Nastala chyba pri zmene hesla');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    {!isForceMode && (
                        <Link href="/settings" className="btn btn-ghost btn-icon">
                            ←
                        </Link>
                    )}
                    <div>
                        <h1 className="page-title">{hasPassword ? 'Zmena hesla' : 'Nastavenie hesla'}</h1>
                        <p className="page-subtitle">
                            {hasPassword ? 'Aktualizujte prihlasovacie heslo' : 'Nastavte si heslo pre prihlásenie'}
                        </p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {success && (
                    <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-4)' }}>
                        ✅ Heslo bolo úspešne zmenené!
                    </div>
                )}

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                {isForceMode && (
                    <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-4)' }}>
                        ⚠️ Je potrebné zmeniť heslo pred pokračovaním.
                    </div>
                )}

                {!hasPassword && !isForceMode && (
                    <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-4)' }}>
                        Momentálne nemáte nastavené heslo. Nastavte si ho pre prihlásenie e-mailom.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <div className="card-body">
                            {hasPassword && (
                                <div className="form-group">
                                    <label htmlFor="currentPassword" className="form-label form-label-required">
                                        Aktuálne heslo
                                    </label>
                                    <input
                                        id="currentPassword"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="newPassword" className="form-label form-label-required">
                                    Nové heslo
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="form-input"
                                    placeholder="Minimálne 6 znakov"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword" className="form-label form-label-required">
                                    Potvrďte nové heslo
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="form-input"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                    >
                        {isLoading ? <span className="spinner"></span> : 'Uložiť heslo'}
                    </button>
                </form>
            </div>

            {!isForceMode && <BottomNav />}
        </div>
    );
}

export default function PasswordPage() {
    return (
        <Suspense fallback={
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        }>
            <PasswordForm />
        </Suspense>
    );
}
