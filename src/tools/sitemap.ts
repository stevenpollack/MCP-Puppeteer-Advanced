import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface SitemapOptions {
    maxDepth?: number;
    maxPages?: number;
    includeExternal?: boolean;
    excludePatterns?: string[];
    outputFormat?: 'text' | 'tree';
}

interface PageNode {
    url: string;
    title: string;
    children: PageNode[];
    depth: number;
}

export async function generateSitemap(args: SitemapOptions): Promise<CallToolResult> {
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

        const maxDepth = args.maxDepth ?? 2;
        const maxPages = args.maxPages ?? 100;
        const includeExternal = args.includeExternal ?? false;
        const excludePatterns = args.excludePatterns ?? [];
        const outputFormat = args.outputFormat ?? 'tree';

        const baseUrl = new URL(page.url());
        const visited = new Set<string>();
        const sitemap: PageNode = {
            url: baseUrl.href,
            title: await page.title(),
            children: [],
            depth: 0
        };

        async function crawl(node: PageNode): Promise<void> {
            if (node.depth >= maxDepth || visited.size >= maxPages) {
                return;
            }

            visited.add(node.url);

            try {
                if (!page) return;

                await page.goto(node.url, { waitUntil: 'networkidle0' });

                const links = await page.evaluate((baseUrl, includeExternal) => {
                    return Array.from(document.querySelectorAll('a'))
                        .map(a => {
                            try {
                                const href = new URL((a as HTMLAnchorElement).href, baseUrl);
                                return {
                                    url: href.href,
                                    title: a.textContent?.trim() || href.pathname,
                                    isExternal: href.origin !== new URL(baseUrl).origin
                                };
                            } catch {
                                return null;
                            }
                        })
                        .filter((link): link is { url: string; title: string; isExternal: boolean } =>
                            link !== null &&
                            (!link.isExternal || includeExternal) &&
                            !link.url.startsWith('mailto:') &&
                            !link.url.startsWith('tel:') &&
                            !link.url.includes('#')
                        );
                }, baseUrl.href, includeExternal) || [];

                for (const link of links) {
                    // Check exclude patterns
                    if (excludePatterns.some(pattern =>
                        new RegExp(pattern).test(link.url)
                    )) {
                        continue;
                    }

                    if (!visited.has(link.url)) {
                        const childNode: PageNode = {
                            url: link.url,
                            title: link.title,
                            children: [],
                            depth: node.depth + 1
                        };
                        node.children.push(childNode);
                        await crawl(childNode);
                    }
                }
            } catch (error) {
                console.error(`Error crawling ${node.url}: ${error}`);
            }
        }

        await crawl(sitemap);

        // Format output
        function formatTree(node: PageNode, prefix = ''): string {
            let result = `${prefix}${node.title} (${node.url})\n`;
            for (let i = 0; i < node.children.length; i++) {
                const isLast = i === node.children.length - 1;
                const childPrefix = prefix + (isLast ? '└── ' : '├── ');
                const childContentPrefix = prefix + (isLast ? '    ' : '│   ');
                result += formatTree(node.children[i], childPrefix);
            }
            return result;
        }

        function formatText(node: PageNode): string {
            let result = '';
            function traverse(n: PageNode, depth: number) {
                result += `${'  '.repeat(depth)}${n.title} (${n.url})\n`;
                n.children.forEach(child => traverse(child, depth + 1));
            }
            traverse(node, 0);
            return result;
        }

        const output = outputFormat === 'tree' ? formatTree(sitemap) : formatText(sitemap);

        return {
            content: [{
                type: "text",
                text: `Sitemap (${visited.size} pages crawled):\n\n${output}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to generate sitemap: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 