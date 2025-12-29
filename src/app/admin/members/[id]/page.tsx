'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface Member {
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
    passwordHash: string | null;
    forcePasswordChange: boolean;
    _count?: {
        visits: number;
        announcements: number;
        cabinBookings: number;
    };
}

export default function EditMemberPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const memberId = params.id as string;

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        role: 'MEMBER',
        isActive: true,
    });

    // Password management
    const [newPassword, setNewPassword] = useState('');
    const [forcePasswordChange, setForcePasswordChange] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            router.push('/');
        }
    }, [status, session, router]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN' && memberId) {
            loadMember();
        }
    }, [session, memberId]);

    async function loadMember() {
        try {
            const res = await fetch(`/api/members/${memberId}`);
            if (!res.ok) {
                router.push('/admin/members');
                return;
            }
            const data = await res.json();
            setMember(data);
            setFormData({
                email: data.email,
                displayName: data.displayName,
                role: data.role,
                isActive: data.isActive,
            });
        } catch (error) {
            console.error('Failed to load member:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSubmitting(true);

        try {
            const res = await fetch(`/api/members/${memberId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri ukladaní');
                return;
            }

            router.push('/admin/members');
        } catch {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSetPassword(e: React.FormEvent) {
        e.preventDefault();
        setPasswordError('');
        setSuccessMessage('');

        if (newPassword.length < 6) {
            setPasswordError('Heslo musí mať aspoň 6 znakov');
            return;
        }

        setPasswordSubmitting(true);

        try {
            const res = await fetch(`/api/members/${memberId}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword, forcePasswordChange }),
            });

            const data = await res.json();

            if (!res.ok) {
                setPasswordError(data.error || 'Chyba pri nastavovaní hesla');
                return;
            }

            setNewPassword('');
            setForcePasswordChange(false);
            setSuccessMessage(forcePasswordChange
                ? 'Heslo bolo nastavené. Používateľ bude vyzvaný na zmenu pri prihlásení.'
                : 'Heslo bolo úspešne nastavené');
            // Update local state
            if (member) {
                setMember({ ...member, passwordHash: 'set', forcePasswordChange });
            }
        } catch {
            setPasswordError('Chyba pripojenia k serveru');
        } finally {
            setPasswordSubmitting(false);
        }
    }

    async function handleRemovePassword() {
        if (!confirm('Naozaj chcete odstrániť heslo tohto člena? Nebude sa môcť prihlásiť heslom.')) {
            return;
        }

        setPasswordError('');
        setSuccessMessage('');
        setPasswordSubmitting(true);

        try {
            const res = await fetch(`/api/members/${memberId}/password`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                setPasswordError(data.error || 'Chyba pri odstraňovaní hesla');
                return;
            }

            setSuccessMessage('Heslo bolo odstránené');
            // Update local state
            if (member) {
                setMember({ ...member, passwordHash: null });
            }
        } catch {
            setPasswordError('Chyba pripojenia k serveru');
        } finally {
            setPasswordSubmitting(false);
        }
    }

    async function handleDeleteMember() {
        const relatedCount = (member?._count?.visits || 0) + (member?._count?.announcements || 0) + (member?._count?.cabinBookings || 0);

        let confirmMessage = `Naozaj chcete odstrániť člena "${member?.displayName}"?`;

        if (relatedCount > 0) {
            confirmMessage = `Člen "${member?.displayName}" má súvisiace záznamy:\n` +
                `- Návštevy: ${member?._count?.visits || 0}\n` +
                `- Oznamy: ${member?._count?.announcements || 0}\n` +
                `- Rezervácie chaty: ${member?._count?.cabinBookings || 0}\n\n` +
                `Tento člen nemôže byť odstránený. Môžete ho iba deaktivovať.`;
            alert(confirmMessage);
            return;
        }

        if (!confirm(confirmMessage + '\n\nTáto akcia je nezvratná!')) {
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/members/${memberId}`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.relatedRecords) {
                    setError(`Člen má súvisiace záznamy: ${data.relatedRecords.visits} návštev, ${data.relatedRecords.announcements} oznamov, ${data.relatedRecords.cabinBookings} rezervácií`);
                } else {
                    setError(data.error || 'Chyba pri odstraňovaní');
                }
                return;
            }

            router.push('/admin/members');
        } catch {
            setError('Chyba pripojenia k serveru');
        } finally {
            setSubmitting(false);
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!member) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/admin/members" className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Upraviť člena</h1>
                        <p className="page-subtitle">{member.email}</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <div className="card-body">
                            <div className="form-group">
                                <label className="form-label form-label-required">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label form-label-required">Meno</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rola</label>
                                <select
                                    className="form-select"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="MEMBER">Člen</option>
                                    <option value="ADMIN">Administrátor</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <span className="form-switch-toggle"></span>
                                    <span>Aktívny účet</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-full btn-lg"
                        style={{ marginTop: 'var(--spacing-4)' }}
                        disabled={submitting}
                    >
                        {submitting ? <span className="spinner"></span> : 'Uložiť zmeny'}
                    </button>
                </form>

                {/* Password Management Section */}
                <div className="card" style={{ marginTop: 'var(--spacing-6)' }}>
                    <div className="card-body">
                        <h3 style={{
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                            marginBottom: 'var(--spacing-4)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)'
                        }}>
                            🔐 Správa hesla
                        </h3>

                        {passwordError && (
                            <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                                {passwordError}
                            </div>
                        )}

                        <div style={{
                            padding: 'var(--spacing-3)',
                            background: member.passwordHash ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-4)',
                            fontSize: 'var(--font-size-sm)'
                        }}>
                            {member.passwordHash
                                ? '✅ Heslo je nastavené - člen sa môže prihlásiť e-mailom a heslom'
                                : '⚠️ Heslo nie je nastavené - člen sa môže prihlásiť len cez Google'
                            }
                        </div>

                        <form onSubmit={handleSetPassword}>
                            <div className="form-group">
                                <label className="form-label">
                                    {member.passwordHash ? 'Nové heslo' : 'Nastaviť heslo'}
                                </label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimálne 6 znakov"
                                    minLength={6}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-switch">
                                    <input
                                        type="checkbox"
                                        checked={forcePasswordChange}
                                        onChange={(e) => setForcePasswordChange(e.target.checked)}
                                    />
                                    <span className="form-switch-toggle"></span>
                                    <span>Vyžadovať zmenu hesla pri ďalšom prihlásení</span>
                                </label>
                            </div>

                            {member.forcePasswordChange && (
                                <div style={{
                                    padding: 'var(--spacing-2)',
                                    background: 'var(--color-warning-bg)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: 'var(--spacing-3)',
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-warning)'
                                }}>
                                    ⚠️ Člen bude musieť zmeniť heslo pri ďalšom prihlásení
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={passwordSubmitting || newPassword.length < 6}
                                    style={{ flex: 1 }}
                                >
                                    {passwordSubmitting ? (
                                        <span className="spinner"></span>
                                    ) : member.passwordHash ? (
                                        'Zmeniť heslo'
                                    ) : (
                                        'Nastaviť heslo'
                                    )}
                                </button>

                                {member.passwordHash && (
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={handleRemovePassword}
                                        disabled={passwordSubmitting}
                                        style={{
                                            background: 'var(--color-error-bg)',
                                            color: 'var(--color-error)'
                                        }}
                                    >
                                        Odstrániť
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="card" style={{ marginTop: 'var(--spacing-6)', borderColor: 'var(--color-error)' }}>
                    <div className="card-body">
                        <h3 style={{
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600,
                            marginBottom: 'var(--spacing-3)',
                            color: 'var(--color-error)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)'
                        }}>
                            ⚠️ Nebezpečná zóna
                        </h3>

                        {member._count && (member._count.visits > 0 || member._count.announcements > 0 || member._count.cabinBookings > 0) ? (
                            <div style={{
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-warning-bg)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                marginBottom: 'var(--spacing-3)'
                            }}>
                                <p style={{ marginBottom: 'var(--spacing-2)' }}>
                                    Člen má súvisiace záznamy a nemôže byť odstránený:
                                </p>
                                <ul style={{ marginLeft: 'var(--spacing-4)', fontSize: 'var(--font-size-xs)' }}>
                                    {member._count.visits > 0 && <li>Návštevy: {member._count.visits}</li>}
                                    {member._count.announcements > 0 && <li>Oznamy: {member._count.announcements}</li>}
                                    {member._count.cabinBookings > 0 && <li>Rezervácie chaty: {member._count.cabinBookings}</li>}
                                </ul>
                                <p style={{ marginTop: 'var(--spacing-2)', fontStyle: 'italic' }}>
                                    Môžete člena iba deaktivovať pomocou prepínača vyššie.
                                </p>
                            </div>
                        ) : (
                            <div style={{
                                padding: 'var(--spacing-3)',
                                background: 'var(--color-gray-50)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                marginBottom: 'var(--spacing-3)'
                            }}>
                                Člen nemá žiadne súvisiace záznamy a môže byť úplne odstránený.
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleDeleteMember}
                            disabled={submitting || (member._count && (member._count.visits > 0 || member._count.announcements > 0 || member._count.cabinBookings > 0))}
                            className="btn"
                            style={{
                                background: 'var(--color-error)',
                                color: 'white',
                                width: '100%',
                                opacity: (member._count && (member._count.visits > 0 || member._count.announcements > 0 || member._count.cabinBookings > 0)) ? 0.5 : 1,
                                cursor: (member._count && (member._count.visits > 0 || member._count.announcements > 0 || member._count.cabinBookings > 0)) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {submitting ? <span className="spinner"></span> : '🗑️ Odstrániť člena natrvalo'}
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
