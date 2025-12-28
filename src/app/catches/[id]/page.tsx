'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { BottomNav } from '@/components/BottomNav';

interface CatchDetail {
    id: string;
    species: { id: string; name: string; requiresSex: boolean };
    huntingLocality: { id: string; name: string };
    sex: string;
    age: string | null;
    tagNumber: string | null;
    shooterType: string;
    guestShooterName: string | null;
    huntedAt: string;
    note: string | null;
    visit: {
        id: string;
        memberId: string;
        member: { displayName: string };
        locality: { name: string };
        endDate: string | null;
    };
    photos: Photo[];
}

interface Photo {
    id: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
}

export default function CatchDetailPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const catchId = params.id as string;

    const [catchData, setCatchData] = useState<CatchDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    useEffect(() => {
        if (session?.user && catchId) {
            loadCatch();
        }
    }, [session, catchId]);

    async function loadCatch() {
        try {
            const res = await fetch(`/api/catches/${catchId}`);
            if (!res.ok) {
                router.push('/visits');
                return;
            }
            const data = await res.json();
            setCatchData(data);
        } catch (error) {
            console.error('Failed to load catch:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`/api/catches/${catchId}/photos`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Chyba pri nahrávaní fotky');
                return;
            }

            loadCatch();
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    async function handlePhotoDelete(photoId: string) {
        if (!confirm('Naozaj chcete zmazať túto fotku?')) return;

        try {
            const res = await fetch(`/api/catch-photos/${photoId}/image`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Chyba pri mazaní fotky');
                return;
            }

            loadCatch();
        } catch (error) {
            setError('Chyba pripojenia k serveru');
        }
    }

    const sexLabels: Record<string, string> = {
        MALE: 'Samec',
        FEMALE: 'Samica',
        UNKNOWN: 'Nezistené',
    };

    const canEdit = session?.user && (
        session.user.role === 'ADMIN' || session.user.id === catchData?.visit.memberId
    );

    const canUploadPhotos = canEdit && (!catchData?.visit.endDate || session?.user?.role === 'ADMIN');

    if (status === 'loading' || loading) {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!catchData) return null;

    return (
        <div className="page">
            <header className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)', flex: 1 }}>
                    <Link href={`/visits/${catchData.visit.id}`} className="btn btn-ghost btn-icon">
                        ←
                    </Link>
                    <div style={{ flex: 1 }}>
                        <h1 className="page-title">{catchData.species.name}</h1>
                        <p className="page-subtitle">{catchData.visit.member.displayName}</p>
                    </div>
                    {canEdit && (
                        <Link href={`/catches/${catchId}/edit`} className="btn btn-primary btn-sm">
                            ✏️ Upraviť
                        </Link>
                    )}
                </div>
            </header>

            <div className="page-content">
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-4)' }}>
                        {error}
                    </div>
                )}

                {/* Catch Info */}
                <div className="card" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <div className="card-body">
                        <div style={{ display: 'grid', gap: 'var(--spacing-3)' }}>
                            {catchData.species.requiresSex && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>Pohlavie</span>
                                    <span style={{ fontWeight: 500 }}>{sexLabels[catchData.sex]}</span>
                                </div>
                            )}
                            {catchData.age && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>Vek</span>
                                    <span style={{ fontWeight: 500 }}>{catchData.age}</span>
                                </div>
                            )}
                            {catchData.tagNumber && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-gray-500)' }}>Značka</span>
                                    <span className="badge badge-info">{catchData.tagNumber}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Lokalita lovu</span>
                                <span style={{ fontWeight: 500 }}>{catchData.huntingLocality.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Čas lovu</span>
                                <span style={{ fontWeight: 500 }}>{new Date(catchData.huntedAt).toLocaleString('sk')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-gray-500)' }}>Strelec</span>
                                <span style={{ fontWeight: 500 }}>
                                    {catchData.shooterType === 'MEMBER' ? 'Člen' : `Hosť: ${catchData.guestShooterName}`}
                                </span>
                            </div>
                            {catchData.note && (
                                <div>
                                    <span style={{ color: 'var(--color-gray-500)', display: 'block', marginBottom: 'var(--spacing-1)' }}>
                                        Poznámka
                                    </span>
                                    <p>{catchData.note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Photos Section */}
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
                    Fotky ({catchData.photos.length}/3)
                </h2>

                <div className="photo-grid">
                    {catchData.photos.map((photo) => (
                        <div key={photo.id} className="photo-item">
                            <img src={`/api/catch-photos/${photo.id}/image`} alt="Úlovok" />
                            {canUploadPhotos && (
                                <button
                                    className="photo-remove"
                                    onClick={() => handlePhotoDelete(photo.id)}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}

                    {canUploadPhotos && catchData.photos.length < 3 && (
                        <label className="photo-add">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePhotoUpload}
                                style={{ display: 'none' }}
                                disabled={uploading}
                            />
                            {uploading ? (
                                <div className="spinner"></div>
                            ) : (
                                <>
                                    <span style={{ fontSize: '24px' }}>📷</span>
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Pridať</span>
                                </>
                            )}
                        </label>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
