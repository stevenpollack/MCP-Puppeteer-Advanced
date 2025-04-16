import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface PageNode {
    url: string;
    title: string;
    children: PageNode[];
    level: number;
    external: boolean;
    parent?: PageNode;
}

export async function generateSitemap(args: any): Promise<CallToolResult> {
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

        const maxDepth = args.maxDepth || 2;
        const maxPages = args.maxPages || 100;
        const includeExternal = args.includeExternal || false;
        const excludePatterns = args.excludePatterns || [];
        const outputFormat = args.outputFormat || 'tree';

        // Get the base URL for determining relative vs external links
        const baseUrl = await page.evaluate(() => {
            return window.location.origin;
        });

        // Create regex patterns for exclusion
        const excludeRegexes = excludePatterns.map((pattern: string) => new RegExp(pattern));

        // Storage for visited URLs to avoid duplicates
        const visitedUrls = new Set<string>();

        // Root node of our sitemap
        const rootNode: PageNode = {
            url: await page.url(),
            title: await page.title(),
            children: [],
            level: 0,
            external: false
        };

        visitedUrls.add(rootNode.url);

        // Function to normalize URLs
        const normalizeUrl = (url: string): string => {
            // Remove hash
            url = url.split('#')[0];

            // Remove trailing slash if present
            if (url.endsWith('/')) {
                url = url.slice(0, -1);
            }

            return url;
        };

        // Check if URL should be excluded
        const shouldExclude = (url: string): boolean => {
            // Skip mailto, tel, javascript, etc.
            if (url.startsWith('mailto:') ||
                url.startsWith('tel:') ||
                url.startsWith('javascript:') ||
                url.startsWith('data:') ||
                url === '#') {
                return true;
            }

            // Check against exclude patterns
            for (const regex of excludeRegexes) {
                if (regex.test(url)) {
                    return true;
                }
            }

            return false;
        };

        // Recursive function to crawl pages
        const crawlPage = async (node: PageNode, depth: number): Promise<void> => {
            if (depth >= maxDepth || visitedUrls.size >= maxPages) {
                return;
            }

            // Navigate to the page
            try {
                await page.goto(node.url, { waitUntil: 'domcontentloaded' });
                node.title = await page.title();

                // Extract all links from the page
                const links = await page.evaluate((baseUrl, includeExternal) => {
                    const allLinks = Array.from(document.querySelectorAll('a[href]'));
                    return allLinks.map(link => {
                        const href = link.getAttribute('href') || '';
                        let fullUrl;

                        // Handle relative URLs
                        if (href.startsWith('/')) {
                            fullUrl = baseUrl + href;
                        } else if (!href.includes('://')) {
                            // Relative URL without leading slash
                            fullUrl = new URL(href, window.location.href).href;
                        } else {
                            fullUrl = href;
                        }

                        const isExternal = !fullUrl.startsWith(baseUrl);

                        // Skip external links if not included
                        if (isExternal && !includeExternal) {
                            return null;
                        }

                        return {
                            url: fullUrl,
                            text: link.textContent?.trim() || '',
                            isExternal
                        };
                    }).filter(Boolean);
                }, baseUrl, includeExternal);

                // Process each link
                for (const link of links) {
                    if (!link) continue;

                    const normalizedUrl = normalizeUrl(link.url);

                    if (shouldExclude(normalizedUrl) || visitedUrls.has(normalizedUrl)) {
                        continue;
                    }

                    visitedUrls.add(normalizedUrl);

                    const childNode: PageNode = {
                        url: normalizedUrl,
                        title: link.text || normalizedUrl,
                        children: [],
                        level: depth + 1,
                        external: link.isExternal,
                        parent: node
                    };

                    node.children.push(childNode);

                    // Only continue crawling non-external links
                    if (!childNode.external) {
                        await crawlPage(childNode, depth + 1);
                    }

                    // Stop if we've reached the max pages
                    if (visitedUrls.size >= maxPages) {
                        break;
                    }
                }

            } catch (error) {
                console.error(`Error crawling ${node.url}: ${error}`);
                // Continue with other links even if one fails
            }
        };

        // Start crawling from the root
        await crawlPage(rootNode, 0);

        // Generate text output in the requested format
        let output: string;

        if (outputFormat === 'tree') {
            output = `# Site Map: ${rootNode.title}\n\n`;

            // Function to render node as tree
            const renderTree = (node: PageNode, prefix = ''): string => {
                let result = `${prefix}${prefix ? '└─ ' : ''}[${node.title}](${node.url})${node.external ? ' (External)' : ''}\n`;

                const childPrefix = prefix + (prefix ? '   ' : '');

                for (let i = 0; i < node.children.length; i++) {
                    result += renderTree(node.children[i], childPrefix);
                }

                return result;
            };

            output += renderTree(rootNode);

        } else {
            // Simple text list with proper hierarchy
            output = `# Site Map: ${rootNode.title}\n\n`;

            // Flattened list of all nodes for easier processing
            const flatList: PageNode[] = [];

            // Function to flatten the tree
            const flattenTree = (node: PageNode): void => {
                flatList.push(node);
                for (const child of node.children) {
                    flattenTree(child);
                }
            };

            flattenTree(rootNode);

            // Sort by URL for a more organized list
            flatList.sort((a, b) => a.url.localeCompare(b.url));

            // Generate a list with proper indentation
            for (const node of flatList) {
                const indent = '  '.repeat(node.level);
                output += `${indent}- [${node.title}](${node.url})${node.external ? ' (External)' : ''}\n`;
            }
        }

        // Add statistics
        output += `\n## Statistics\n`;
        output += `- Total pages: ${visitedUrls.size}\n`;
        output += `- Internal pages: ${[...visitedUrls].filter(url => url.startsWith(baseUrl)).length}\n`;
        output += `- External links: ${[...visitedUrls].filter(url => !url.startsWith(baseUrl)).length}\n`;
        output += `- Max depth reached: ${maxDepth}\n`;

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
                text: `Error generating sitemap: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 