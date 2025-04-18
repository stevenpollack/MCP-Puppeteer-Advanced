import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface PageHierarchyOptions {
    selector?: string;
    maxDepth?: number;
    includeTextNodes?: boolean;
    includeClasses?: boolean;
    includeIds?: boolean;
}

interface ElementNode {
    tag: string;
    id?: string;
    classes?: string[];
    children: ElementNode[];
    text?: string;
    depth: number;
}

/**
 * Analyzes the DOM hierarchy of the current page
 */
export async function analyzePageHierarchy(
    options: PageHierarchyOptions = {}
): Promise<CallToolResult> {
    const page = state.page;

    if (!page) {
        return {
            content: [{
                type: "text",
                text: "Error: Browser page is not initialized. Please navigate to a page first."
            }],
            isError: true,
        };
    }

    const {
        selector = "body",
        maxDepth = 5,
        includeTextNodes = false,
        includeClasses = false,
        includeIds = false,
    } = options;

    try {
        const hierarchy = await page.evaluate(
            ({ selector, maxDepth, includeTextNodes, includeClasses, includeIds }) => {
                const rootElement = document.querySelector(selector);

                if (!rootElement) {
                    return { error: `No element found matching selector: ${selector}` };
                }

                let totalElements = 0;
                let actualMaxDepth = 0;

                function processNode(node: Element | Text, currentDepth: number): ElementNode | null {
                    if (currentDepth > maxDepth) {
                        return null;
                    }

                    if (node.nodeType === Node.TEXT_NODE) {
                        if (!includeTextNodes) return null;

                        const textContent = node.textContent?.trim();
                        if (!textContent) return null;

                        return {
                            tag: "#text",
                            children: [],
                            text: textContent,
                            depth: currentDepth
                        };
                    }

                    if (node.nodeType !== Node.ELEMENT_NODE) return null;

                    const element = node as Element;
                    totalElements++;
                    actualMaxDepth = Math.max(actualMaxDepth, currentDepth);

                    // Process element node
                    const result: ElementNode = {
                        tag: element.tagName.toLowerCase(),
                        children: [],
                        depth: currentDepth
                    };

                    if (includeIds && element.id) {
                        result.id = element.id;
                    }

                    if (includeClasses && element.classList.length > 0) {
                        result.classes = Array.from(element.classList);
                    }

                    // Process children
                    for (const childNode of Array.from(element.childNodes)) {
                        const childResult = processNode(childNode as Element | Text, currentDepth + 1);
                        if (childResult) {
                            result.children.push(childResult);
                        }
                    }

                    return result;
                }

                const hierarchyResult = processNode(rootElement, 0);

                return {
                    hierarchy: hierarchyResult,
                    stats: {
                        totalElements,
                        maxDepth: actualMaxDepth
                    }
                };
            },
            { selector, maxDepth, includeTextNodes, includeClasses, includeIds }
        );

        if (hierarchy.error) {
            return {
                content: [{
                    type: "text",
                    text: `Error: ${hierarchy.error}`
                }],
                isError: true,
            };
        }

        const formattedHierarchy = formatHierarchy(hierarchy.hierarchy as ElementNode);
        const stats = hierarchy.stats || { totalElements: 0, maxDepth: 0 };

        const result = `# Page Hierarchy Analysis

## Statistics
- Total elements: ${stats.totalElements}
- Maximum depth: ${stats.maxDepth}

## Element Hierarchy
\`\`\`
${formattedHierarchy}
\`\`\``;

        return {
            content: [{
                type: "text",
                text: result
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error analyzing page hierarchy: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true,
        };
    }
}

/**
 * Formats the hierarchy into a readable string with indentation
 */
function formatHierarchy(node: ElementNode, indent = ""): string {
    if (!node) return "";

    let result = `${indent}${node.tag}`;

    if (node.id) {
        result += `#${node.id}`;
    }

    if (node.classes && node.classes.length > 0) {
        result += `.${node.classes.join(".")}`;
    }

    if (node.text) {
        const truncatedText = node.text.length > 30
            ? node.text.substring(0, 27) + "..."
            : node.text;
        result += `: "${truncatedText}"`;
    }

    result += "\n";

    for (const child of node.children) {
        result += formatHierarchy(child, indent + "  ");
    }

    return result;
} 