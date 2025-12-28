import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageFile {
    key: string;
    mimeType: string;
    sizeBytes: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getUploadsPath(): string {
    return process.env.UPLOADS_PATH || './data/uploads';
}

/**
 * Validate file before upload
 */
export function validateFile(mimeType: string, sizeBytes: number): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: `Nepovolený typ súboru. Povolené: ${ALLOWED_MIME_TYPES.join(', ')}` };
    }

    if (sizeBytes > MAX_FILE_SIZE) {
        return { valid: false, error: `Súbor je príliš veľký. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }

    return { valid: true };
}

/**
 * Save file to storage
 */
export async function saveFile(buffer: Buffer, mimeType: string): Promise<StorageFile> {
    const validation = validateFile(mimeType, buffer.length);
    if (!validation.valid) {
        throw new Error(validation.error);
    }

    const extension = mimeType.split('/')[1];
    const key = `${uuidv4()}.${extension}`;
    const uploadsPath = getUploadsPath();
    const filePath = path.join(uploadsPath, key);

    // Ensure directory exists
    await fs.mkdir(uploadsPath, { recursive: true });

    // Write file
    await fs.writeFile(filePath, buffer);

    return {
        key,
        mimeType,
        sizeBytes: buffer.length,
    };
}

/**
 * Get file from storage
 */
export async function getFile(key: string): Promise<Buffer | null> {
    const uploadsPath = getUploadsPath();
    const filePath = path.join(uploadsPath, key);

    try {
        return await fs.readFile(filePath);
    } catch {
        return null;
    }
}

/**
 * Delete file from storage
 */
export async function deleteFile(key: string): Promise<boolean> {
    const uploadsPath = getUploadsPath();
    const filePath = path.join(uploadsPath, key);

    try {
        await fs.unlink(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if file exists
 */
export async function fileExists(key: string): Promise<boolean> {
    const uploadsPath = getUploadsPath();
    const filePath = path.join(uploadsPath, key);

    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
