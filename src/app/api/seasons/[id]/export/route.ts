import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError, notFound } from '@/lib/rbac';

type Params = { params: Promise<{ id: string }> };

const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D5016' }, // matches --color-primary
};
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' } };
const DATE_FORMAT = 'dd.mm.yyyy';
const DATETIME_FORMAT = 'dd.mm.yyyy hh:mm';

function styleHeaderRow(row: ExcelJS.Row) {
    row.eachCell((cell) => {
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    row.height = 20;
}

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 10, maxWidth = 40) {
    sheet.columns.forEach((column) => {
        let maxLength = minWidth;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
            const length = cell.value ? String(cell.value).length : 0;
            if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, maxWidth);
    });
}

function sexLabel(sex: string): string {
    switch (sex) {
        case 'MALE': return 'Samec';
        case 'FEMALE': return 'Samica';
        default: return '-';
    }
}

function shooterLabel(shooterType: string, memberName: string, guestName: string | null): string {
    if (shooterType === 'GUEST') {
        return guestName ? `${guestName} (hosť)` : 'Hosť';
    }
    return memberName;
}

// GET /api/seasons/[id]/export - Export season visits & catches to Excel (Admin only)
export async function GET(_request: NextRequest, { params }: Params) {
    try {
        await requireAdmin();
        const { id } = await params;

        const season = await prisma.huntingSeason.findUnique({ where: { id } });
        if (!season) {
            return notFound('Sezóna nebola nájdená');
        }

        const dateRange = { gte: season.dateFrom, lte: season.dateTo };

        const [visits, catches] = await Promise.all([
            prisma.visit.findMany({
                where: { startDate: dateRange },
                include: {
                    member: { select: { displayName: true } },
                    locality: { select: { name: true } },
                    _count: { select: { catches: true } },
                },
                orderBy: { startDate: 'asc' },
            }),
            prisma.catch.findMany({
                where: { huntedAt: dateRange },
                include: {
                    species: { select: { name: true } },
                    huntingLocality: { select: { name: true } },
                    visit: { select: { member: { select: { displayName: true } } } },
                },
                orderBy: { huntedAt: 'asc' },
            }),
        ]);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Kniha PZ';
        workbook.created = season.createdAt;

        // ------------------------------------------------------------------
        // Sheet 1: Súhrn
        // ------------------------------------------------------------------
        const summarySheet = workbook.addWorksheet('Súhrn');
        summarySheet.columns = [
            { key: 'label', width: 28 },
            { key: 'value', width: 30 },
        ];
        summarySheet.addRows([
            { label: 'Sezóna', value: season.name },
            { label: 'Obdobie od', value: season.dateFrom },
            { label: 'Obdobie do', value: season.dateTo },
            { label: 'Aktívna sezóna', value: season.isActive ? 'Áno' : 'Nie' },
            { label: '', value: '' },
            { label: 'Počet návštev', value: visits.length },
            { label: 'Počet úlovkov', value: catches.length },
        ]);
        summarySheet.getCell('B2').numFmt = DATE_FORMAT;
        summarySheet.getCell('B3').numFmt = DATE_FORMAT;
        summarySheet.getColumn('label').font = { bold: true };

        // Catches by species breakdown
        const bySpecies = new Map<string, number>();
        for (const c of catches) {
            bySpecies.set(c.species.name, (bySpecies.get(c.species.name) || 0) + 1);
        }
        if (bySpecies.size > 0) {
            summarySheet.addRow({});
            const headerRow = summarySheet.addRow({ label: 'Druh zveri', value: 'Počet úlovkov' });
            styleHeaderRow(headerRow);
            [...bySpecies.entries()]
                .sort((a, b) => b[1] - a[1])
                .forEach(([species, count]) => summarySheet.addRow({ label: species, value: count }));
        }

        // ------------------------------------------------------------------
        // Sheet 2: Návštevy
        // ------------------------------------------------------------------
        const visitsSheet = workbook.addWorksheet('Návštevy');
        visitsSheet.columns = [
            { header: 'Príchod', key: 'startDate', width: 18 },
            { header: 'Odchod', key: 'endDate', width: 18 },
            { header: 'Člen', key: 'member', width: 25 },
            { header: 'Lokalita', key: 'locality', width: 20 },
            { header: 'Hosť', key: 'hasGuest', width: 10 },
            { header: 'Meno hosťa', key: 'guestName', width: 20 },
            { header: 'Počet úlovkov', key: 'catchCount', width: 14 },
            { header: 'Poznámka', key: 'note', width: 30 },
        ];
        styleHeaderRow(visitsSheet.getRow(1));

        for (const v of visits) {
            visitsSheet.addRow({
                startDate: v.startDate,
                endDate: v.endDate ?? null,
                member: v.member.displayName,
                locality: v.locality.name,
                hasGuest: v.hasGuest ? 'Áno' : 'Nie',
                guestName: v.guestName ?? '',
                catchCount: v._count.catches,
                note: v.note ?? '',
            });
        }
        visitsSheet.getColumn('startDate').numFmt = DATETIME_FORMAT;
        visitsSheet.getColumn('endDate').numFmt = DATETIME_FORMAT;
        visitsSheet.autoFilter = { from: 'A1', to: 'H1' };
        visitsSheet.views = [{ state: 'frozen', ySplit: 1 }];

        // ------------------------------------------------------------------
        // Sheet 3: Úlovky
        // ------------------------------------------------------------------
        const catchesSheet = workbook.addWorksheet('Úlovky');
        catchesSheet.columns = [
            { header: 'Dátum lovu', key: 'huntedAt', width: 18 },
            { header: 'Druh zveri', key: 'species', width: 20 },
            { header: 'Lokalita', key: 'locality', width: 20 },
            { header: 'Strelec', key: 'shooter', width: 25 },
            { header: 'Pohlavie', key: 'sex', width: 12 },
            { header: 'Vek', key: 'age', width: 12 },
            { header: 'Hmotnosť (kg)', key: 'weight', width: 14 },
            { header: 'Číslo známky', key: 'tagNumber', width: 14 },
            { header: 'Poznámka', key: 'note', width: 30 },
        ];
        styleHeaderRow(catchesSheet.getRow(1));

        for (const c of catches) {
            catchesSheet.addRow({
                huntedAt: c.huntedAt,
                species: c.species.name,
                locality: c.huntingLocality.name,
                shooter: shooterLabel(c.shooterType, c.visit.member.displayName, c.guestShooterName),
                sex: sexLabel(c.sex),
                age: c.age ?? '',
                weight: c.weight ? Number(c.weight) : '',
                tagNumber: c.tagNumber ?? '',
                note: c.note ?? '',
            });
        }
        catchesSheet.getColumn('huntedAt').numFmt = DATETIME_FORMAT;
        catchesSheet.getColumn('weight').numFmt = '0.00';
        catchesSheet.autoFilter = { from: 'A1', to: 'I1' };
        catchesSheet.views = [{ state: 'frozen', ySplit: 1 }];

        autoFitColumns(summarySheet);

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `${season.name.replace(/[^a-zA-Z0-9._-]+/g, '_')}_export.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
