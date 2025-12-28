'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        await signIn('google', { callbackUrl: '/' });
    };

    return (
        <div className="page" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 'var(--spacing-6)',
            background: 'linear-gradient(135deg, var(--color-primary-dark) 0%, var(--color-primary) 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                marginBottom: 'var(--spacing-8)',
                color: 'var(--color-white)'
            }}>
                <div style={{
                    width: 80,
                    height: 80,
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 'var(--radius-2xl)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--spacing-4)',
                    fontSize: '40px'
                }}>
                    🦌
                </div>
                <h1 style={{
                    fontSize: 'var(--font-size-3xl)',
                    fontWeight: 700,
                    marginBottom: 'var(--spacing-2)'
                }}>
                    Kniha PZ
                </h1>
                <p style={{
                    fontSize: 'var(--font-size-base)',
                    opacity: 0.9
                }}>
                    Evidencia poľovného revíru
                </p>
            </div>

            <div className="card" style={{
                width: '100%',
                maxWidth: 400,
                padding: 'var(--spacing-6)'
            }}>
                <h2 style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    marginBottom: 'var(--spacing-2)',
                    textAlign: 'center'
                }}>
                    Prihlásenie
                </h2>
                <p style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-gray-500)',
                    textAlign: 'center',
                    marginBottom: 'var(--spacing-6)'
                }}>
                    Prihláste sa pomocou svojho Google účtu
                </p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="btn btn-full"
                    style={{
                        background: 'var(--color-white)',
                        color: 'var(--color-gray-700)',
                        border: '1px solid var(--color-gray-300)',
                        padding: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--spacing-3)'
                    }}
                >
                    {isLoading ? (
                        <div className="spinner" />
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Prihlásiť sa cez Google
                        </>
                    )}
                </button>

                <p style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-gray-500)',
                    textAlign: 'center',
                    marginTop: 'var(--spacing-4)'
                }}>
                    Prístup majú len registrovaní členovia revíru.
                </p>
            </div>

            <p style={{
                fontSize: 'var(--font-size-xs)',
                color: 'rgba(255,255,255,0.7)',
                marginTop: 'var(--spacing-8)',
                textAlign: 'center'
            }}>
                © 2024 Kniha PZ
            </p>
        </div>
    );
}
