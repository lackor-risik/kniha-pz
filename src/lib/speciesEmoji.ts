'use client';

/**
 * Maps species names to appropriate emoji icons.
 * Uses fuzzy matching to find the best emoji for a given species name.
 */

const speciesEmojiMap: Record<string, string> = {
    // Jelenovité
    'jeleň': '🦌',
    'jelen': '🦌',
    'jelenica': '🦌',
    'jelienča': '🦌',
    'jelienca': '🦌',
    'laň': '🦌',
    'daniel': '🦌',
    'daniela': '🦌',
    'srnec': '🦌',
    'srna': '🦌',
    'srnča': '🦌',
    'los': '🦌',

    // Diviačia zver
    'diviak': '🐗',
    'diviačica': '🐗',
    'diviača': '🐗',
    'diviaca': '🐗',
    'divá sviňa': '🐗',
    'prasiatko': '🐗',

    // Ovce a kozy
    'muflón': '🐏',
    'muflon': '🐏',
    'muflónka': '🐏',
    'kamzík': '🐐',
    'kamzik': '🐐',

    // Šelmy
    'líška': '🦊',
    'liška': '🦊',
    'vlk': '🐺',
    'medveď': '🐻',
    'medved': '🐻',
    'jazvec': '🦡',
    'rys': '🐱',
    'kuna': '🐿️',
    'tchor': '🐿️',
    'vydra': '🦦',
    'bobor': '🦫',

    // Zajace a králiky
    'zajac': '🐇',
    'králik': '🐇',
    'kralik': '🐇',

    // Vtáky
    'bažant': '🐓',
    'bazant': '🐓',
    'kačica': '🦆',
    'kacica': '🦆',
    'hus': '🪿',
    'kormorán': '🐦',
    'kormoran': '🐦',
    'holub': '🕊️',
    'tetrov': '🐓',
    'jariabok': '🐓',
    'sluky': '🐦',
    'sluka': '🐦',
    'hrdlička': '🕊️',
    'hrdlicka': '🕊️',
    'straka': '🐦',
    'vrána': '🐦',
    'vrana': '🐦',
    'havran': '🐦',

    // Ostatné
    'nutria': '🦫',
    'psík medviedikovitý': '🦝',
    'psik medviedkovity': '🦝',
    'psík medvieďkovitý': '🦝',
    'psik medvedkovity': '🦝',
    'mýval': '🦝',
    'myval': '🦝',
    'ondatra': '🐀',
};

/**
 * Returns an emoji for the given species name.
 * Tries to match the name (case-insensitive) against known species.
 * Falls back to a default emoji if no match is found.
 * 
 * @param speciesName - The name of the species
 * @returns The matching emoji or a default one
 */
export function getSpeciesEmoji(speciesName: string): string {
    const normalizedName = speciesName.toLowerCase().trim();

    // Try exact match first
    if (speciesEmojiMap[normalizedName]) {
        return speciesEmojiMap[normalizedName];
    }

    // Try partial match (species name contains a key)
    for (const [key, emoji] of Object.entries(speciesEmojiMap)) {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
            return emoji;
        }
    }

    // Default fallback
    return '🎯';
}
