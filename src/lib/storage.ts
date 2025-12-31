import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface StorageFile {
    key: string;
    thumbnailKey?: string;
    mimeType: string;
    sizeBytes: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

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

const THUMBNAIL_WIDTH = 300;
const THUMBNAIL_QUALITY = 80;

/**
 * Get thumbnail key from original key
 */
export function getThumbnailKey(key: string): string {
    return `thumb_${key}`;
}

/**
 * Save file to storage with optional thumbnail generation
 */
export async function saveFile(buffer: Buffer, mimeType: string, generateThumbnail = false): Promise<StorageFile> {
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

    // Write original file
    await fs.writeFile(filePath, buffer);

    let thumbnailKey: string | undefined;

    // Generate thumbnail if requested
    if (generateThumbnail) {
        try {
            thumbnailKey = getThumbnailKey(key);
            const thumbnailPath = path.join(uploadsPath, thumbnailKey);

            await sharp(buffer)
                .resize(THUMBNAIL_WIDTH, null, {
                    withoutEnlargement: true,
                    fit: 'inside'
                })
                .jpeg({ quality: THUMBNAIL_QUALITY })
                .toFile(thumbnailPath);
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
            thumbnailKey = undefined;
        }
    }

    return {
        key,
        thumbnailKey,
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
