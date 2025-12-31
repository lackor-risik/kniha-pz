import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireAuth, handleApiError } from '@/lib/rbac';

function getUploadDir(): string {
    return process.env.UPLOADS_PATH || './data/uploads';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
    try {
        await requireAuth();

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'Súbor nebol poskytnutý' }, { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Nepovolený typ súboru. Povolené: JPG, PNG, GIF, WebP' }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Súbor je príliš veľký. Maximum: 5MB' }, { status: 400 });
        }

        // Ensure upload directory exists
        const uploadDir = getUploadDir();
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filepath = path.join(uploadDir, filename);

        // Write file
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filepath, buffer);

        // Return URL (served via API)
        const url = `/api/uploads/${filename}`;
        return NextResponse.json({ url });
    } catch (error) {
        return handleApiError(error);
    }
}
