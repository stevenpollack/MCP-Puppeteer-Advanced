import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

// Type definitions for element analysis results
interface ElementAnalysis {
    selector: string;
    html: string;
    markdown: string;
    styles: {
        element: string;
        computedStyles: Record<string, string>;
    }[];
    structureOverview: string;
}

export async function analyzeElement(args: any): Promise<CallToolResult> {
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

        const selector = args.selector;
        const includeStyles = args.includeStyles !== false;
        const maxDepth = args.maxDepth || 10;
        const includeSiblings = args.includeSiblings || false;

        // Check if the element exists
        const elementExists = await page.evaluate((sel) => {
            return document.querySelector(sel) !== null;
        }, selector);

        if (!elementExists) {
            return {
                content: [{
                    type: "text",
                    text: `Element not found: ${selector}`,
                }],
                isError: true,
            };
        }

        // Analyze the element
        const analysis = await page.evaluate((sel, incStyles, maxDepth, incSiblings) => {
            // Function to get element's HTML
            const getElementHTML = (element: Element, depth: number = 0, maxDepth: number): string => {
                if (depth > maxDepth) {
                    return "..."; // Truncated
                }

                return element.outerHTML;
            };

            // Function to convert HTML to Markdown-like representation
            const htmlToMarkdown = (element: Element, depth: number = 0, maxDepth: number): string => {
                if (depth > maxDepth) {
                    return "..."; // Truncated
                }

                let markdown = "";
                const tagName = element.tagName.toLowerCase();
                const id = element.id ? `#${element.id}` : "";
                const classes = Array.from(element.classList).map(c => `.${c}`).join("");

                // Indent based on depth
                const indent = "  ".repeat(depth);

                // Element opening with attributes
                markdown += `${indent}- **<${tagName}${id}${classes}>**`;

                // Add content for text nodes
                if (element.children.length === 0 && element.textContent?.trim()) {
                    const text = element.textContent.trim().replace(/\n/g, " ").substring(0, 50);
                    markdown += ` "${text}${text.length >= 50 ? "..." : ""}"`;
                }

                markdown += "\n";

                // Process children
                for (let i = 0; i < element.children.length && depth < maxDepth; i++) {
                    markdown += htmlToMarkdown(element.children[i], depth + 1, maxDepth);
                }

                return markdown;
            };

            // Function to get computed styles
            const getComputedStyles = (element: Element): Record<string, string> => {
                const computedStyle = window.getComputedStyle(element);
                const styles: Record<string, string> = {};

                // Get only the most important CSS properties
                const importantProps = [
                    // Layout
                    'display', 'position', 'flex', 'flex-direction', 'justify-content', 'align-items',
                    'grid-template-columns', 'grid-template-rows',

                    // Box model
                    'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
                    'margin', 'padding', 'border',

                    // Typography
                    'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'text-align',

                    // Visual
                    'background-color', 'background-image', 'box-shadow', 'opacity', 'z-index',
                    'border-radius', 'text-decoration', 'text-transform',

                    // Animation
                    'transition', 'animation',

                    // Other important
                    'overflow', 'visibility', 'cursor'
                ];

                for (const prop of importantProps) {
                    const value = computedStyle.getPropertyValue(prop);
                    if (value && value !== "" && value !== "none" && value !== "normal" && value !== "0px") {
                        styles[prop] = value;
                    }
                }

                return styles;
            };

            // Function to get a structure overview
            const getStructureOverview = (element: Element, depth: number = 0, maxDepth: number): string => {
                if (depth > maxDepth) {
                    return "..."; // Truncated
                }

                let overview = "";
                const tagName = element.tagName.toLowerCase();
                const id = element.id ? `#${element.id}` : "";
                const classes = Array.from(element.classList).map(c => `.${c}`).join("");

                // Indent based on depth
                const indent = "  ".repeat(depth);

                // Element with attributes
                overview += `${indent}${tagName}${id}${classes}\n`;

                // Process children
                for (let i = 0; i < element.children.length && depth < maxDepth; i++) {
                    overview += getStructureOverview(element.children[i], depth + 1, maxDepth);
                }

                return overview;
            };

            // Get the element
            let targetElement = document.querySelector(sel);
            if (!targetElement) {
                return null;
            }

            // Define parent container if we need to include siblings
            let container = targetElement;
            if (incSiblings && targetElement.parentElement) {
                container = targetElement.parentElement;
            }

            // For HTML, determine which element to use based on sibling inclusion
            const htmlElement = incSiblings ? container : targetElement;
            const html = getElementHTML(htmlElement, 0, maxDepth);

            // For Markdown, follow the same approach
            const markdown = htmlToMarkdown(htmlElement, 0, maxDepth);

            // For structure, also use the same element
            const structureOverview = getStructureOverview(htmlElement, 0, maxDepth);

            // For styles, collect all descendants
            const styles: { element: string, computedStyles: Record<string, string> }[] = [];

            if (incStyles) {
                // Function to collect styles recursively
                const collectStyles = (element: Element, depth: number = 0, maxD: number) => {
                    if (depth > maxD) return;

                    const tagName = element.tagName.toLowerCase();
                    const id = element.id ? `#${element.id}` : "";
                    const classes = Array.from(element.classList).map(c => `.${c}`).join("");
                    const elementDesc = `${tagName}${id}${classes}`;

                    styles.push({
                        element: elementDesc,
                        computedStyles: getComputedStyles(element)
                    });

                    // Process children recursively
                    for (let i = 0; i < element.children.length; i++) {
                        collectStyles(element.children[i], depth + 1, maxD);
                    }
                };

                collectStyles(htmlElement, 0, maxDepth);
            }

            return {
                selector: sel,
                html,
                markdown,
                styles,
                structureOverview
            };
        }, selector, includeStyles, maxDepth, includeSiblings);

        if (!analysis) {
            return {
                content: [{
                    type: "text",
                    text: `Failed to analyze element: ${selector}`,
                }],
                isError: true,
            };
        }

        // Format the output
        let output = `# Element Analysis: ${analysis.selector}\n\n`;

        // Structure Overview
        output += `## Structure Overview\n\`\`\`\n${analysis.structureOverview}\`\`\`\n\n`;

        // Markdown Representation
        output += `## Markdown Representation\n\`\`\`markdown\n${analysis.markdown}\`\`\`\n\n`;

        // HTML Structure
        output += `## HTML Structure\n\`\`\`html\n${analysis.html}\`\`\`\n\n`;

        // Computed Styles
        if (includeStyles && analysis.styles.length > 0) {
            output += `## Computed Styles\n\n`;

            // Sort style entries by element name for readability
            analysis.styles.sort((a, b) => a.element.localeCompare(b.element));

            for (const style of analysis.styles) {
                const styleKeys = Object.keys(style.computedStyles);

                if (styleKeys.length === 0) continue; // Skip elements with no styles

                output += `### ${style.element}\n\`\`\`css\n`;

                // Sort style properties alphabetically
                styleKeys.sort().forEach(key => {
                    output += `${key}: ${style.computedStyles[key]};\n`;
                });

                output += `\`\`\`\n\n`;
            }
        }

        return {
            content: [{
                type: "text",
                text: output,
            } as TextContent],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error analyzing element: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 