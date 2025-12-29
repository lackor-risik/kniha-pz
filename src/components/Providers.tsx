'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { PushNotificationManager } from './PushNotificationManager';
import { ForcePasswordChangeWrapper } from './ForcePasswordChangeWrapper';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <ForcePasswordChangeWrapper>
                {children}
            </ForcePasswordChangeWrapper>
            <PushNotificationManager />
        </SessionProvider>
    );
}
