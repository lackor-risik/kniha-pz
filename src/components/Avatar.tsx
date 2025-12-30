'use client';

import { useState } from 'react';

interface AvatarProps {
    src: string | null | undefined;
    name: string;
    size?: number;
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
    const [error, setError] = useState(false);

    const initial = name?.charAt(0).toUpperCase() || '?';

    if (!src || error) {
        return (
            <div style={{
                width: size,
                height: size,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: size > 50 ? '28px' : 'var(--font-size-base)',
                flexShrink: 0
            }}>
                {initial}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            onError={() => setError(true)}
            style={{
                width: size,
                height: size,
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                flexShrink: 0
            }}
        />
    );
}
