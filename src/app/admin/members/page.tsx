'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Member {
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
    googleSub: string | null;
}

export default function AdminMembersPage() {
    const { data: session, status } = useSession();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        displayName: '',
        role: 'MEMBER',
    });

    useEffect(() => {
        if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
            redirect('/');
        }
    }, [status, session]);

    useEffect(() => {
        if (session?.user?.role === 'ADMIN') {
            loadMembers();
        }
    }, [session]);

    async function loadMembers() {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            setMembers(data);
        } catch (error) {
            console.error('Failed to load members:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri vytváraní člena');
                return;
            }

            setFormData({ email: '', displayName: '', role: 'MEMBER' });
            setShowForm(false);
            loadMembers();
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        }
    }

    async function toggleActive(member: Member) {
        try {
            const res = await fetch(`/api/members/${member.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !member.isActive }),
            });

            if (res.ok) {
                loadMembers();
            }
        } catch (error) {
            console.error('Failed to toggle member:', error);
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <Link href="/admin" className="btn btn-ghost btn-icon">←</Link>
                    <div>
                        <h1 className="page-title">Členovia</h1>
                        <p className="page-subtitle">{members.length} členov</p>
                    </div>
                </div>
            </header>

            <div className="page-content">
                {showForm && (
                    <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div className="card-header">
                            <strong>Nový člen</strong>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="card-body">
                                {error && (
                                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-3)' }}>
                                        {error}
                                    </div>
                                )}
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
                            </div>
                            <div className="card-footer" style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                <button type="submit" className="btn btn-primary">Vytvoriť</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                                    Zrušiť
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="card">
                    {members.map((member) => (
                        <Link key={member.id} href={`/admin/members/${member.id}`} className="list-item">
                            <div className="avatar">
                                {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">{member.displayName}</div>
                                <div className="list-item-subtitle">{member.email}</div>
                                <div className="list-item-meta">
                                    <span className={`badge ${member.role === 'ADMIN' ? 'badge-warning' : 'badge-gray'}`}>
                                        {member.role === 'ADMIN' ? 'Admin' : 'Člen'}
                                    </span>
                                    {!member.isActive && <span className="badge badge-error">Neaktívny</span>}
                                    {!member.googleSub && <span className="badge badge-info">Neprihlásil sa</span>}
                                </div>
                            </div>
                            <span className="list-item-arrow">→</span>
                        </Link>
                    ))}
                </div>
            </div>

            <button className="fab" onClick={() => setShowForm(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </button>

            <BottomNav />
        </div>
    );
}
