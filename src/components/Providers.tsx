'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { PushNotificationManager } from './PushNotificationManager';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            {children}
            <PushNotificationManager />
        </SessionProvider>
    );
}
