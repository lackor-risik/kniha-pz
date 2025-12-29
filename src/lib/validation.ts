import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
    id: z.string().uuid(),
});

// ============================================================================
// MEMBER SCHEMAS
// ============================================================================

export const memberCreateSchema = z.object({
    email: z.string().email('Neplatný email'),
    displayName: z.string().min(1, 'Meno je povinné').max(100),
    role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
    isActive: z.boolean().default(true),
    password: z.string().min(6, 'Heslo musí mať aspoň 6 znakov').optional().or(z.literal('')),
    forcePasswordChange: z.boolean().optional().default(true),
});

export const memberUpdateSchema = memberCreateSchema.partial();

// ============================================================================
// LOCALITY SCHEMAS
// ============================================================================

export const localityCreateSchema = z.object({
    name: z.string().min(1, 'Názov je povinný').max(100),
    description: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
});

export const localityUpdateSchema = localityCreateSchema.partial();

// ============================================================================
// SPECIES SCHEMAS
// ============================================================================

export const speciesCreateSchema = z.object({
    name: z.string().min(1, 'Názov je povinný').max(100),
    requiresAge: z.boolean().default(false),
    requiresSex: z.boolean().default(false),
    requiresTag: z.boolean().default(false),
    requiresWeight: z.boolean().default(false),
    isActive: z.boolean().default(true),
});

export const speciesUpdateSchema = speciesCreateSchema.partial();

// ============================================================================
// VISIT SCHEMAS
// ============================================================================

export const visitCreateSchema = z.object({
    localityId: z.string().uuid('Neplatné ID lokality'),
    startDate: z.string().datetime({ message: 'Neplatný dátum začiatku' }),
    hasGuest: z.boolean(),
    guestName: z.string().max(100).optional(),
    guestNote: z.string().max(500).optional(),
    note: z.string().max(1000).optional(),
});

export const visitUpdateSchema = z.object({
    hasGuest: z.boolean().optional(),
    guestName: z.string().max(100).optional(),
    guestNote: z.string().max(500).optional(),
    note: z.string().max(1000).optional(),
});

export const visitEndSchema = z.object({
    endDate: z.string().datetime({ message: 'Neplatný dátum ukončenia' }),
});

// ============================================================================
// CATCH SCHEMAS
// ============================================================================

export const catchCreateSchema = z.object({
    speciesId: z.string().uuid('Neplatné ID druhu'),
    sex: z.enum(['MALE', 'FEMALE', 'UNKNOWN']).default('UNKNOWN'),
    age: z.string().max(50).optional(),
    weight: z.number().min(0, 'Váha nemôže byť záporná').optional(),
    tagNumber: z.string().max(50).optional(),
    shooterType: z.enum(['MEMBER', 'GUEST']).default('MEMBER'),
    guestShooterName: z.string().max(100).optional(),
    huntingLocalityId: z.string().uuid('Neplatné ID lokality lovu').optional(),
    huntedAt: z.string().datetime({ message: 'Neplatný čas lovu' }),
    note: z.string().max(1000).optional(),
});

export const catchUpdateSchema = catchCreateSchema.partial();

// ============================================================================
// HUNTING SEASON SCHEMAS
// ============================================================================

export const seasonCreateSchema = z.object({
    name: z.string().min(1, 'Názov je povinný').max(50),
    dateFrom: z.string().datetime({ message: 'Neplatný dátum začiatku' }),
    dateTo: z.string().datetime({ message: 'Neplatný dátum konca' }),
    isActive: z.boolean().default(false),
});

export const seasonUpdateSchema = seasonCreateSchema.partial();

export const harvestPlanItemSchema = z.object({
    speciesId: z.string().uuid('Neplatné ID druhu'),
    plannedCount: z.number().int().min(0, 'Plánovaný počet nemôže byť záporný'),
    note: z.string().max(500).optional(),
});

// ============================================================================
// ANNOUNCEMENT SCHEMAS
// ============================================================================

export const announcementCreateSchema = z.object({
    title: z.string().min(1, 'Nadpis je povinný').max(200),
    body: z.string().min(1, 'Text oznamu je povinný').max(10000),
    pinned: z.boolean().default(false),
});

export const announcementUpdateSchema = announcementCreateSchema.partial();

// ============================================================================
// PUSH SUBSCRIPTION SCHEMAS
// ============================================================================

export const pushSubscribeSchema = z.object({
    endpoint: z.string().url('Neplatný endpoint'),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
    userAgent: z.string().optional(),
});

// ============================================================================
// CABIN BOOKING SCHEMAS
// ============================================================================

export const cabinBookingCreateSchema = z.object({
    cabinId: z.string().uuid('Neplatné ID chaty'),
    startAt: z.string().datetime({ message: 'Neplatný dátum začiatku' }),
    endAt: z.string().datetime({ message: 'Neplatný dátum konca' }),
    title: z.string().max(100).optional(),
    note: z.string().max(1000).optional(),
});

export const cabinBookingUpdateSchema = cabinBookingCreateSchema.partial();

// ============================================================================
// VALIDATION HELPER
// ============================================================================

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: true;
    data: T;
} | {
    success: false;
    error: string;
} {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
}
