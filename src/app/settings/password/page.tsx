'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

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
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-8)' }}>
                <div className="spinner" />
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
            <div className="page-header">
                <button
                    onClick={() => router.back()}
                    className="btn btn-secondary"
                    style={{ marginRight: 'var(--spacing-3)' }}
                >
                    ← Späť
                </button>
                <h1 className="page-title">Zmena hesla</h1>
            </div>

            <div className="card" style={{ maxWidth: 500 }}>
                {success && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-success-bg)',
                        color: 'var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        Heslo bolo úspešne zmenené!
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-error-bg)',
                        color: 'var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        {error}
                    </div>
                )}

                {isForceMode && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-warning-bg)',
                        color: 'var(--color-warning)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        ⚠️ Je potrebné zmeniť heslo pred pokračovaním.
                    </div>
                )}

                {!hasPassword && !isForceMode && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-info-bg)',
                        color: 'var(--color-info)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        Momentálne nemáte nastavené heslo. Nastavte si ho pre prihlásenie e-mailom.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {hasPassword && (
                        <div className="form-group">
                            <label htmlFor="currentPassword" className="form-label">
                                Aktuálne heslo
                            </label>
                            <input
                                id="currentPassword"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="newPassword" className="form-label">
                            Nové heslo
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="input"
                            style={{ width: '100%' }}
                            placeholder="Minimálne 6 znakov"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">
                            Potvrďte nové heslo
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary btn-full"
                        style={{ marginTop: 'var(--spacing-2)' }}
                    >
                        {isLoading ? <div className="spinner" /> : 'Uložiť heslo'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function PasswordPage() {
    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Zmena hesla</h1>
            </div>
            <Suspense fallback={
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-8)' }}>
                    <div className="spinner" />
                </div>
            }>
                <PasswordForm />
            </Suspense>
        </div>
    );
}
