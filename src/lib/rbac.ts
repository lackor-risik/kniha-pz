import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export type AuthenticatedUser = {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MEMBER';
};

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function unauthorized(message = 'Nie ste prihlásený'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Nemáte oprávnenie na túto operáciu'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'Záznam nebol nájdený'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 });
}

export function conflict(message: string): NextResponse {
    return NextResponse.json({ error: message }, { status: 409 });
}

export function badRequest(message: string): NextResponse {
    return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(message = 'Interná chyba servera'): NextResponse {
    return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Get authenticated user from session
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthenticatedUser | null> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return null;
    }

    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
    };
}

/**
 * Require authenticated user
 * Throws ApiError if not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
    const user = await getAuthUser();

    if (!user) {
        throw new ApiError(401, 'Nie ste prihlásený');
    }

    return user;
}

/**
 * Require admin role
 * Throws ApiError if not admin
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (user.role !== 'ADMIN') {
        throw new ApiError(403, 'Vyžaduje sa rola administrátora');
    }

    return user;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
    return user.role === 'ADMIN';
}

/**
 * Check if user owns a resource or is admin
 */
export function canAccessResource(user: AuthenticatedUser, ownerId: string): boolean {
    return user.role === 'ADMIN' || user.id === ownerId;
}

/**
 * Require ownership or admin
 * Throws ApiError if not owner and not admin
 */
export async function requireOwnership(ownerId: string): Promise<AuthenticatedUser> {
    const user = await requireAuth();

    if (!canAccessResource(user, ownerId)) {
        throw new ApiError(403, 'Nemáte oprávnenie upravovať cudzí záznam');
    }

    return user;
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): NextResponse {
    console.error('API Error:', error);

    if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error) {
        return serverError(error.message);
    }

    return serverError();
}
