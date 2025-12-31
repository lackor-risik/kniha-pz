'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface PhotoLightboxProps {
    src: string | null;
    alt?: string;
    onClose: () => void;
}

export function PhotoLightbox({ src, alt = 'Fotka', onClose }: PhotoLightboxProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [canShare, setCanShare] = useState(false);
    const lastTouchRef = useRef<{ distance: number; x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Check if Web Share API is available
        setCanShare(typeof navigator !== 'undefined' && !!navigator.share);
    }, []);

    useEffect(() => {
        if (src) {
            // Reset state when opening
            setScale(1);
            setPosition({ x: 0, y: 0 });

            // Prevent body scroll when lightbox is open
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [src]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const getDistance = (touch1: { clientX: number; clientY: number }, touch2: { clientX: number; clientY: number }) => {
        return Math.hypot(
            touch1.clientX - touch2.clientX,
            touch1.clientY - touch2.clientY
        );
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            lastTouchRef.current = {
                distance: getDistance(e.touches[0], e.touches[1]),
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
        } else if (e.touches.length === 1 && scale > 1) {
            setIsDragging(true);
            lastTouchRef.current = {
                distance: 0,
                x: e.touches[0].clientX,
                y: e.touches[0].clientY
            };
        }
    }, [scale]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && lastTouchRef.current) {
            e.preventDefault();
            const newDistance = getDistance(e.touches[0], e.touches[1]);
            const scaleChange = newDistance / lastTouchRef.current.distance;
            setScale(prev => Math.min(Math.max(prev * scaleChange, 1), 5));
            lastTouchRef.current.distance = newDistance;
        } else if (e.touches.length === 1 && isDragging && lastTouchRef.current) {
            const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
            const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
            setPosition(prev => ({
                x: prev.x + deltaX,
                y: prev.y + deltaY
            }));
            lastTouchRef.current.x = e.touches[0].clientX;
            lastTouchRef.current.y = e.touches[0].clientY;
        }
    }, [isDragging]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        lastTouchRef.current = null;
        // Reset position if scale is back to 1
        if (scale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
    }, [scale]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (scale > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        } else {
            setScale(2.5);
        }
    }, [scale]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!src) return;

        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ulovok_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!src || !navigator.share) return;

        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const file = new File([blob], 'ulovok.jpg', { type: blob.type });

            await navigator.share({
                files: [file],
                title: alt,
            });
        } catch (error) {
            // User cancelled or share failed
            if ((error as Error).name !== 'AbortError') {
                console.error('Share failed:', error);
            }
        }
    };

    if (!src) return null;

    return (
        <div
            ref={containerRef}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                touchAction: 'none'
            }}
        >
            {/* Top bar with close button */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: 'var(--spacing-3)',
                gap: 'var(--spacing-2)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: 'white',
                        fontSize: '24px',
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-full)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Image container */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: 'var(--spacing-2)'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <img
                    src={src}
                    alt={alt}
                    onClick={(e) => e.stopPropagation()}
                    onDoubleClick={handleDoubleClick}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        cursor: scale > 1 ? 'move' : 'zoom-in'
                    }}
                    draggable={false}
                />
            </div>

            {/* Bottom action bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                padding: 'var(--spacing-4)',
                gap: 'var(--spacing-4)',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.5))'
            }}>
                <button
                    onClick={handleDownload}
                    style={{
                        background: 'rgba(255,255,255,0.15)',
                        border: 'none',
                        color: 'white',
                        padding: 'var(--spacing-3) var(--spacing-4)',
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        fontSize: 'var(--font-size-sm)'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>💾</span>
                    Uložiť
                </button>
                {canShare && (
                    <button
                        onClick={handleShare}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: 'white',
                            padding: 'var(--spacing-3) var(--spacing-4)',
                            borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>📤</span>
                        Zdieľať
                    </button>
                )}
            </div>

            {/* Zoom indicator */}
            {scale > 1 && (
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: 'var(--spacing-1) var(--spacing-3)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    {Math.round(scale * 100)}%
                </div>
            )}
        </div>
    );
}
