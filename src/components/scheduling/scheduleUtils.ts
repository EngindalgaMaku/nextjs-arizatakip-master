import { ScheduledEntry } from "@/types/scheduling";

// Constants for rendering the grid
export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'] as const;
export const HOURS = Array.from({ length: 10 }, (_, i) => i + 1); // 1 to 10

// --- Color Helpers ---

function stringToHslColor(str: string, s: number, l: number): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

function getContrastColor(hslColor: string): string {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (match) {
        const l = parseInt(match[3], 10);
        return l > 55 ? '#000000' : '#FFFFFF'; // Bright background -> black text
    }
    return '#000000'; // Default black
}

// Cache for lesson colors
const lessonColorCache = new Map<string, { background: string; text: string }>();

/**
 * Generates consistent background and contrasting text colors for a lesson ID.
 * Uses HSL color space for better control over saturation and lightness.
 * @param lessonId The unique ID of the lesson.
 * @returns An object with { background: string; text: string } HSL/Hex colors.
 */
export function getLessonColor(lessonId: string): { background: string; text: string } {
    if (lessonColorCache.has(lessonId)) {
        return lessonColorCache.get(lessonId)!;
    }
    // Using moderate saturation (70%) and high lightness (80%) for pastel-like colors
    const backgroundColor = stringToHslColor(lessonId, 70, 80);
    const textColor = getContrastColor(backgroundColor);
    const colors = { background: backgroundColor, text: textColor };
    lessonColorCache.set(lessonId, colors);
    return colors;
}

// --- End Color Helpers --- 

// --- NEW FUNCTION: dayIndexToName ---

/**
 * Converts a numeric day index (0-based) to its string representation.
 * @param index The day index (0 for Pazartesi, 1 for Salı, etc.).
 * @returns The name of the day or 'Bilinmeyen Gün' if index is out of bounds.
 */
export function dayIndexToName(index: number): string {
    return DAYS[index] || 'Bilinmeyen Gün';
}; 