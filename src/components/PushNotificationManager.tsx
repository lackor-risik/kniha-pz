'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function PushNotificationManager() {
    const { data: session } = useSession();
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Check if push notifications are supported
        if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setPermission(Notification.permission);

            // Show prompt if permission is 'default' (not yet asked)
            if (Notification.permission === 'default' && session?.user) {
                // Delay showing prompt to not overwhelm user on first load
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [session]);

    const [subscribing, setSubscribing] = useState(false);

    async function requestPermission() {
        setSubscribing(true);
        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            setShowPrompt(false);

            if (result === 'granted') {
                await subscribeToPush();
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        } finally {
            setSubscribing(false);
        }
    }

    async function subscribeToPush() {
        try {
            // Get VAPID public key from server
            const vapidRes = await fetch('/api/push/vapid-key');
            const { vapidPublicKey } = await vapidRes.json();

            if (!vapidPublicKey) {
                console.error('VAPID public key not configured');
                return;
            }

            // Wait for service worker to be ready
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            // Send subscription to server
            const subscriptionJson = subscription.toJSON();
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subscriptionJson.endpoint,
                    keys: subscriptionJson.keys,
                    userAgent: navigator.userAgent,
                }),
            });
        } catch (error) {
            console.error('Error subscribing to push:', error);
        }
    }

    // Convert VAPID key to Uint8Array
    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Don't render anything if not supported or already decided
    if (!isSupported || !showPrompt || !session?.user) {
        return null;
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 'calc(60px + var(--spacing-4) + env(safe-area-inset-bottom))',
            left: 'var(--spacing-4)',
            right: 'var(--spacing-4)',
            background: 'var(--color-white)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-4)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            animation: 'slideUp 0.3s ease-out',
        }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '28px' }}>🔔</span>
                <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 600, marginBottom: 'var(--spacing-1)' }}>
                        Povoliť notifikácie?
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)', marginBottom: 'var(--spacing-3)' }}>
                        Budete dostávať upozornenia na nové oznamy a dôležité udalosti.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={requestPermission}
                            disabled={subscribing}
                        >
                            {subscribing ? <span className="spinner"></span> : 'Povoliť'}
                        </button>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowPrompt(false)}
                        >
                            Neskôr
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
