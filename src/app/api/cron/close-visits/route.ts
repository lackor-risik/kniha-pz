import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/rbac';

// This endpoint is called by a cron job to close all unclosed visits
// It should be called at 0:05 AM daily
// Protect with CRON_SECRET environment variable

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find all unclosed visits (endDate is null)
        const unclosedVisits = await prisma.visit.findMany({
            where: { endDate: null },
            select: { id: true, startDate: true, memberId: true },
        });

        if (unclosedVisits.length === 0) {
            return NextResponse.json({
                message: 'No unclosed visits found',
                closedCount: 0,
            });
        }

        // Close all unclosed visits with endDate = midnight of today (0:00)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await prisma.visit.updateMany({
            where: { endDate: null },
            data: { endDate: today },
        });

        console.log(`[CRON] Auto-closed ${result.count} visits at ${new Date().toISOString()}`);

        return NextResponse.json({
            message: `Successfully closed ${result.count} unclosed visits`,
            closedCount: result.count,
            endDate: today.toISOString(),
        });
    } catch (error) {
        console.error('[CRON] Error closing visits:', error);
        return handleApiError(error);
    }
}

// Also allow GET for Vercel Cron
export async function GET(request: NextRequest) {
    return POST(request);
}
