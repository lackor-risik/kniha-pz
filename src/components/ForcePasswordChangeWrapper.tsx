'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

const ALLOWED_PATHS = ['/login', '/settings/password', '/unauthorized', '/api'];

export function ForcePasswordChangeWrapper({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(false);
    const [forceChange, setForceChange] = useState(false);
    const [checkedOnce, setCheckedOnce] = useState(false);

    const checkForcePasswordChange = useCallback(async () => {
        if (status === 'loading') return;

        // Skip check for unauthenticated users or allowed paths
        if (status !== 'authenticated' || ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
            setIsChecking(false);
            return;
        }

        setIsChecking(true);

        try {
            const res = await fetch('/api/me');
            if (res.ok) {
                const data = await res.json();
                if (data.forcePasswordChange) {
                    setForceChange(true);
                    router.push('/settings/password?force=true');
                } else {
                    setForceChange(false);
                }
            }
        } catch (error) {
            console.error('Failed to check force password change:', error);
        }

        setIsChecking(false);
        setCheckedOnce(true);
    }, [status, pathname, router]);

    useEffect(() => {
        // Only check once per session/pathname change
        if (status === 'authenticated' && !ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
            checkForcePasswordChange();
        } else {
            setIsChecking(false);
            setCheckedOnce(true);
        }
    }, [status, pathname, checkForcePasswordChange]);

    // Show loading only briefly while checking on first load
    if (status === 'authenticated' && isChecking && !checkedOnce && !ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--color-gray-50)'
            }}>
                <div className="spinner spinner-lg" />
            </div>
        );
    }

    return <>{children}</>;
}
