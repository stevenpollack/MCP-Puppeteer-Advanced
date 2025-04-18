import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface ColorPaletteOptions {
    selector?: string;
    includeTextColors?: boolean;
    includeBackgroundColors?: boolean;
    includeBorderColors?: boolean;
    maxColors?: number;
}

interface ColorInfo {
    color: string;
    frequency: number;
    type: string;
    elements: string[];
}

export async function extractColorPalette(args: ColorPaletteOptions): Promise<CallToolResult> {
    try {
        const page = state.page;
        if (!page) {
            return {
                content: [{
                    type: "text",
                    text: "Browser page not initialized",
                }],
                isError: true,
            };
        }

        const includeTextColors = args.includeTextColors ?? true;
        const includeBackgroundColors = args.includeBackgroundColors ?? true;
        const includeBorderColors = args.includeBorderColors ?? true;
        const maxColors = args.maxColors ?? 20;
        const selector = args.selector || 'body';

        const colors = await page.evaluate(
            ({ selector, includeTextColors, includeBackgroundColors, includeBorderColors }) => {
                const colorMap = new Map<string, ColorInfo>();

                function addColor(color: string, type: string, element: string) {
                    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return;

                    const key = color.toLowerCase();
                    if (colorMap.has(key)) {
                        const info = colorMap.get(key)!;
                        info.frequency++;
                        if (!info.elements.includes(element)) {
                            info.elements.push(element);
                        }
                    } else {
                        colorMap.set(key, {
                            color: color,
                            frequency: 1,
                            type: type,
                            elements: [element]
                        });
                    }
                }

                const elements = document.querySelectorAll(selector + ' *');
                elements.forEach((element) => {
                    const styles = window.getComputedStyle(element);
                    const elementDesc = element.tagName.toLowerCase() +
                        (element.id ? '#' + element.id : '') +
                        (element.className ? '.' + element.className.split(' ').join('.') : '');

                    if (includeTextColors) {
                        addColor(styles.color, 'text', elementDesc);
                    }
                    if (includeBackgroundColors) {
                        addColor(styles.backgroundColor, 'background', elementDesc);
                    }
                    if (includeBorderColors) {
                        addColor(styles.borderColor, 'border', elementDesc);
                    }
                });

                return Array.from(colorMap.values());
            },
            { selector, includeTextColors, includeBackgroundColors, includeBorderColors }
        );

        // Sort colors by frequency and limit to maxColors
        const sortedColors = colors
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, maxColors);

        // Group colors by type
        const groupedColors = sortedColors.reduce((acc, color) => {
            if (!acc[color.type]) {
                acc[color.type] = [];
            }
            acc[color.type].push({
                color: color.color,
                frequency: color.frequency,
                elements: color.elements
            });
            return acc;
        }, {} as Record<string, any[]>);

        return {
            content: [{
                type: "text",
                text: `Color Palette Analysis:\n${JSON.stringify(groupedColors, null, 2)}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to extract color palette: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 