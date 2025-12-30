'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const HomeIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <path d="M9 22V12h6v10" />
    </svg>
);

const MapIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const TargetIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const BellIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const PlanIcon = () => (
    <svg className="bottom-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="14" width="4" height="7" rx="1" />
        <rect x="10" y="10" width="4" height="11" rx="1" />
        <rect x="17" y="6" width="4" height="15" rx="1" />
        <line x1="3" y1="3" x2="3" y2="6" />
        <polyline points="6 5 3 3 0 5" transform="translate(3, 0)" />
    </svg>
);

const navItems: NavItem[] = [
    { href: '/', label: 'Domov', icon: <HomeIcon /> },
    { href: '/visits', label: 'Návštevy', icon: <MapIcon /> },
    { href: '/catches', label: 'Úlovky', icon: <TargetIcon /> },
    { href: '/harvest-plan', label: 'Plán', icon: <PlanIcon /> },
    { href: '/announcements', label: 'Oznamy', icon: <BellIcon /> },
];

export function BottomNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (session?.user) {
            fetch('/api/announcements?limit=1')
                .then(res => res.json())
                .then(data => {
                    setUnreadCount(data.unreadCount || 0);
                })
                .catch(() => { });
        }
    }, [session, pathname]);

    if (!session?.user) return null;

    return (
        <nav className="bottom-nav">
            <ul className="bottom-nav-list">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <li key={item.href} className="bottom-nav-item">
                            <Link
                                href={item.href}
                                className={`bottom-nav-link ${isActive ? 'active' : ''}`}
                                style={{ position: 'relative' }}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                                {item.href === '/announcements' && unreadCount > 0 && (
                                    <span className="bottom-nav-badge">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
