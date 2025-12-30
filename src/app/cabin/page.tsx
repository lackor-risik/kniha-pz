'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/BottomNav';

interface Booking {
    id: string;
    cabin: { id: string; name: string };
    member: { id: string; displayName: string };
    startAt: string;
    endAt: string;
    title: string | null;
    status: string;
}

export default function CabinPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [allUpcomingBookings, setAllUpcomingBookings] = useState<Booking[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [showNewBookingModal, setShowNewBookingModal] = useState(false);
    const [newBookingStartDate, setNewBookingStartDate] = useState('');

    useEffect(() => {
        if (status === 'unauthenticated') {
            redirect('/login');
        }
    }, [status]);

    useEffect(() => {
        if (session?.user) {
            loadBookings();
            loadAllUpcomingBookings();
        }
    }, [session, currentMonth]);

    async function loadBookings() {
        try {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const from = new Date(year, month, 1).toISOString();
            const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

            const res = await fetch(`/api/cabin-bookings?from=${from}&to=${to}`);
            const data = await res.json();
            setBookings(data || []);
        } catch (error) {
            console.error('Failed to load bookings:', error);
        } finally {
            setLoading(false);
        }
    }

    async function loadAllUpcomingBookings() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const from = today.toISOString();
            // Load bookings for the next 2 years
            const to = new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString();

            const res = await fetch(`/api/cabin-bookings?from=${from}&to=${to}`);
            const data = await res.json();
            setAllUpcomingBookings(data || []);
        } catch (error) {
            console.error('Failed to load upcoming bookings:', error);
        }
    }

    function getDaysInMonth(date: Date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Add previous month's days
        const startDayOfWeek = firstDay.getDay() || 7;
        for (let i = startDayOfWeek - 1; i > 0; i--) {
            const d = new Date(year, month, 1 - i);
            days.push({ date: d, isCurrentMonth: false });
        }

        // Add current month's days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }

        // Add next month's days
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }

        return days;
    }

    function getBookingForDate(date: Date): Booking | null {
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        return bookings.find((b) => {
            const bookingStart = new Date(b.startAt);
            const bookingEnd = new Date(b.endAt);
            return bookingStart <= dateEnd && bookingEnd >= dateStart;
        }) || null;
    }

    function hasBooking(date: Date) {
        return getBookingForDate(date) !== null;
    }

    function isToday(date: Date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    function handleDayClick(date: Date) {
        const booking = getBookingForDate(date);
        if (booking) {
            // Navigate to booking detail
            router.push(`/cabin/booking/${booking.id}`);
        } else {
            // Open new booking dialog with pre-filled date
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            setNewBookingStartDate(`${year}-${month}-${day}`);
            setShowNewBookingModal(true);
        }
    }

    function handleNewBookingSubmit() {
        if (newBookingStartDate) {
            router.push(`/cabin/new?startDate=${newBookingStartDate}`);
        }
        setShowNewBookingModal(false);
    }

    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleDateString('sk', { month: 'long', year: 'numeric' });

    // All upcoming bookings (from today, sorted)
    const sortedUpcomingBookings = allUpcomingBookings
        .filter((b) => new Date(b.endAt) >= new Date())
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    if (status === 'loading') {
        return (
            <div className="loading-overlay">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    if (!session?.user) return null;

    return (
        <div className="page">
            <header className="page-header">
                <h1 className="page-title">Rezervácie chaty</h1>
                <p className="page-subtitle">Kalendár rezervácií</p>
            </header>

            <div className="page-content">
                {/* Calendar */}
                <div className="calendar" style={{ marginBottom: 'var(--spacing-4)' }}>
                    <div className="calendar-header">
                        <button
                            className="calendar-nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        >
                            ←
                        </button>
                        <span className="calendar-title" style={{ textTransform: 'capitalize' }}>{monthName}</span>
                        <button
                            className="calendar-nav-btn"
                            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        >
                            →
                        </button>
                    </div>

                    <div className="calendar-grid">
                        {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((day) => (
                            <div key={day} className="calendar-weekday">{day}</div>
                        ))}

                        {days.map((day, idx) => (
                            <div
                                key={idx}
                                className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday(day.date) ? 'today' : ''} ${hasBooking(day.date) ? 'has-booking' : ''}`}
                                onClick={() => handleDayClick(day.date)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span>{day.date.getDate()}</span>
                                {hasBooking(day.date) && <div className="calendar-booking-dot"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Upcoming Bookings */}
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-3)' }}>
                    Nadchádzajúce rezervácie ({sortedUpcomingBookings.length})
                </h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-4)' }}>
                        <div className="spinner" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : sortedUpcomingBookings.length === 0 ? (
                    <div className="card">
                        <div className="card-body" style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--color-gray-500)' }}>Žiadne nadchádzajúce rezervácie</p>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        {sortedUpcomingBookings.map((booking) => (
                            <Link key={booking.id} href={`/cabin/booking/${booking.id}`} className="list-item">
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    background: 'var(--color-info-light)',
                                    borderRadius: 'var(--radius-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}>
                                    🏠
                                </div>
                                <div className="list-item-content">
                                    <div className="list-item-title">
                                        {booking.title || booking.cabin.name}
                                    </div>
                                    <div className="list-item-subtitle">
                                        {new Date(booking.startAt).toLocaleDateString('sk')} - {new Date(booking.endAt).toLocaleDateString('sk')}
                                    </div>
                                    <div className="list-item-subtitle">
                                        {booking.member.displayName}
                                    </div>
                                </div>
                                <span className="list-item-arrow">→</span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* FAB for new booking */}
            <Link href="/cabin/new" className="fab">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
            </Link>

            {/* New Booking Modal */}
            {showNewBookingModal && (
                <div className="modal-overlay" onClick={() => setShowNewBookingModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Nová rezervácia</h3>
                            <button className="modal-close" onClick={() => setShowNewBookingModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: 'var(--spacing-3)' }}>
                                Chcete vytvoriť novú rezerváciu od <strong>{newBookingStartDate.split('-').reverse().join('.')}</strong>?
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowNewBookingModal(false)}
                            >
                                Zrušiť
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleNewBookingSubmit}
                            >
                                Pokračovať
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
