import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

function getUploadDir(): string {
    return process.env.UPLOADS_PATH || './data/uploads';
}

const MIME_TYPES: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
};

type Params = { params: Promise<{ filename: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
    try {
        const { filename } = await params;

        // Security: only allow alphanumeric, dash, underscore, and dot
        if (!/^[\w\-\.]+$/.test(filename)) {
            return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
        }

        const filepath = path.join(getUploadDir(), filename);

        // Check if file exists
        if (!existsSync(filepath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // Get file extension and mime type
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        // Read and return file
        const buffer = await readFile(filepath);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
