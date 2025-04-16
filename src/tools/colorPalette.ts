import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface ColorInfo {
    color: string;
    frequency: number;
    elements: string[];
    usageType: string[];
}

interface ColorCategory {
    name: string;
    colors: string[];
    description: string;
}

export async function extractColorPalette(args: any): Promise<CallToolResult> {
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

        const selector = args.selector || 'body';
        const maxColors = args.maxColors || 20;
        const includeBackgroundColors = args.includeBackgroundColors !== false;
        const includeTextColors = args.includeTextColors !== false;
        const includeBorderColors = args.includeBorderColors !== false;

        // Extract colors from the page
        const colorData = await page.evaluate(
            (sel, includeBg, includeText, includeBorder, max) => {
                // Helper function to convert RGB to HEX
                const rgbToHex = (r: number, g: number, b: number): string => {
                    return '#' + [r, g, b].map(x => {
                        const hex = x.toString(16);
                        return hex.length === 1 ? '0' + hex : hex;
                    }).join('');
                };

                // Helper function to parse a CSS color value to HEX
                const parseColor = (color: string): string | null => {
                    if (!color || color === 'transparent' || color === 'none' || color.includes('rgba(0, 0, 0, 0)')) {
                        return null;
                    }

                    // Handle hex values
                    if (color.startsWith('#')) {
                        // Normalize 3-digit hex to 6-digit
                        if (color.length === 4) {
                            return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
                        }
                        return color;
                    }

                    // Handle rgb/rgba values
                    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
                    if (rgbMatch) {
                        return rgbToHex(
                            parseInt(rgbMatch[1], 10),
                            parseInt(rgbMatch[2], 10),
                            parseInt(rgbMatch[3], 10)
                        );
                    }

                    // For named colors or other formats, create a temporary element to get computed value
                    try {
                        const tempEl = document.createElement('div');
                        tempEl.style.color = color;
                        document.body.appendChild(tempEl);
                        const computedColor = getComputedStyle(tempEl).color;
                        document.body.removeChild(tempEl);

                        const rgbComputed = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
                        if (rgbComputed) {
                            return rgbToHex(
                                parseInt(rgbComputed[1], 10),
                                parseInt(rgbComputed[2], 10),
                                parseInt(rgbComputed[3], 10)
                            );
                        }
                    } catch (e) {
                        // Ignore errors in color parsing
                    }

                    return null;
                };

                // Get all elements to analyze
                const rootElement = document.querySelector(sel);
                if (!rootElement) {
                    return { error: `Element not found: ${sel}` };
                }

                const elements = Array.from(rootElement.querySelectorAll('*')) as Element[];
                if (rootElement !== document.body) {
                    elements.unshift(rootElement as Element);
                }

                // Keep track of colors and their usage
                const colorFrequency: Record<string, ColorInfo> = {};

                // Process each element
                elements.forEach(element => {
                    const styles = window.getComputedStyle(element);
                    const tagName = element.tagName.toLowerCase();
                    const classes = Array.from(element.classList).join('.');
                    const id = element.id ? `#${element.id}` : '';
                    const elementDesc = `${tagName}${id}${classes ? '.' + classes : ''}`;

                    // Background colors
                    if (includeBg) {
                        const bgColor = parseColor(styles.backgroundColor);
                        if (bgColor) {
                            if (!colorFrequency[bgColor]) {
                                colorFrequency[bgColor] = {
                                    color: bgColor,
                                    frequency: 0,
                                    elements: [],
                                    usageType: []
                                };
                            }
                            colorFrequency[bgColor].frequency += 1;
                            if (!colorFrequency[bgColor].elements.includes(elementDesc)) {
                                colorFrequency[bgColor].elements.push(elementDesc);
                            }
                            if (!colorFrequency[bgColor].usageType.includes('background')) {
                                colorFrequency[bgColor].usageType.push('background');
                            }
                        }
                    }

                    // Text colors
                    if (includeText) {
                        const textColor = parseColor(styles.color);
                        if (textColor) {
                            if (!colorFrequency[textColor]) {
                                colorFrequency[textColor] = {
                                    color: textColor,
                                    frequency: 0,
                                    elements: [],
                                    usageType: []
                                };
                            }
                            colorFrequency[textColor].frequency += 1;
                            if (!colorFrequency[textColor].elements.includes(elementDesc)) {
                                colorFrequency[textColor].elements.push(elementDesc);
                            }
                            if (!colorFrequency[textColor].usageType.includes('text')) {
                                colorFrequency[textColor].usageType.push('text');
                            }
                        }
                    }

                    // Border colors
                    if (includeBorder) {
                        ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(borderProp => {
                            const borderColor = parseColor(styles[borderProp as any]);
                            if (borderColor) {
                                if (!colorFrequency[borderColor]) {
                                    colorFrequency[borderColor] = {
                                        color: borderColor,
                                        frequency: 0,
                                        elements: [],
                                        usageType: []
                                    };
                                }
                                colorFrequency[borderColor].frequency += 0.25; // Count each border as 0.25 to avoid overweighting
                                if (!colorFrequency[borderColor].elements.includes(elementDesc)) {
                                    colorFrequency[borderColor].elements.push(elementDesc);
                                }
                                if (!colorFrequency[borderColor].usageType.includes('border')) {
                                    colorFrequency[borderColor].usageType.push('border');
                                }
                            }
                        });
                    }
                });

                // Convert to array and sort by frequency
                const sortedColors = Object.values(colorFrequency)
                    .sort((a, b) => b.frequency - a.frequency)
                    .slice(0, max);

                // Categorize colors
                const categorizeColors = (colors: ColorInfo[]): {
                    primary: string[],
                    secondary: string[],
                    accent: string[],
                    neutral: string[]
                } => {
                    // Get the most frequent colors as primary candidates
                    const primaryCandidates = colors.slice(0, Math.min(3, colors.length));

                    // Separate neutrals (whites, blacks, grays)
                    const isNeutral = (color: string): boolean => {
                        const r = parseInt(color.slice(1, 3), 16);
                        const g = parseInt(color.slice(3, 5), 16);
                        const b = parseInt(color.slice(5, 7), 16);

                        // Check if it's close to white, black, or gray
                        const max = Math.max(r, g, b);
                        const min = Math.min(r, g, b);

                        // If the difference between max and min is small, it's grayscale
                        return (max - min) < 30;
                    };

                    const neutrals: string[] = [];
                    const colorful: ColorInfo[] = [];

                    colors.forEach(color => {
                        if (isNeutral(color.color)) {
                            neutrals.push(color.color);
                        } else {
                            colorful.push(color);
                        }
                    });

                    // Primary colors are the most frequent non-neutral colors (up to 2)
                    const primary = colorful.slice(0, Math.min(2, colorful.length)).map(c => c.color);

                    // Secondary are the next set of colors
                    const secondary = colorful.slice(
                        Math.min(2, colorful.length),
                        Math.min(5, colorful.length)
                    ).map(c => c.color);

                    // Accent colors are less frequently used colorful colors
                    const accent = colorful.slice(
                        Math.min(5, colorful.length)
                    ).map(c => c.color);

                    return {
                        primary,
                        secondary,
                        accent,
                        neutral: neutrals.slice(0, 5) // Limit to 5 neutrals
                    };
                };

                const colorCategories = categorizeColors(sortedColors);

                return {
                    allColors: sortedColors,
                    categories: colorCategories
                };
            },
            selector,
            includeBackgroundColors,
            includeTextColors,
            includeBorderColors,
            maxColors
        );

        if ('error' in colorData) {
            return {
                content: [{
                    type: "text",
                    text: `Error extracting colors: ${colorData.error}`,
                }],
                isError: true,
            };
        }

        // Format the output
        let output = `# Color Palette Analysis\n\n`;

        // Add categorized colors
        const categories: ColorCategory[] = [
            { name: 'Primary Colors', colors: colorData.categories.primary, description: 'The main brand colors, used most prominently throughout the site' },
            { name: 'Secondary Colors', colors: colorData.categories.secondary, description: 'Supporting colors that complement the primary palette' },
            { name: 'Accent Colors', colors: colorData.categories.accent, description: 'Colors used for emphasis, calls to action, or highlights' },
            { name: 'Neutral Colors', colors: colorData.categories.neutral, description: 'Whites, blacks, and grays used for text, backgrounds, and borders' }
        ];

        categories.forEach(category => {
            if (category.colors.length > 0) {
                output += `## ${category.name}\n${category.description}\n\n`;

                output += category.colors.map(color => `- \`${color}\``).join('\n');
                output += '\n\n';
            }
        });

        // Detail of all colors
        output += `## All Detected Colors\n\n`;

        colorData.allColors.forEach(colorInfo => {
            output += `### ${colorInfo.color}\n`;
            output += `- Frequency: ${Math.round(colorInfo.frequency)}\n`;
            output += `- Usage: ${colorInfo.usageType.join(', ')}\n`;

            // Show example elements (limit to 5 to avoid overload)
            if (colorInfo.elements.length > 0) {
                output += `- Example elements: ${colorInfo.elements.slice(0, 5).join(', ')}${colorInfo.elements.length > 5 ? ` and ${colorInfo.elements.length - 5} more` : ''}\n`;
            }

            output += '\n';
        });

        return {
            content: [{
                type: "text",
                text: output,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error extracting color palette: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 