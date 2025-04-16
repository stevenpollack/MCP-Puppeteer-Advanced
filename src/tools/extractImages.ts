import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";
import { ExtractedImage } from "../types/index.js";

export async function extractImages(args: any): Promise<CallToolResult> {
    try {
        // Clear previous extracted images
        state.extractedImages.length = 0;
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

        // Extract images from <img> tags
        const imgImages = await page.evaluate((selector: string) => {
            const imgElements = selector ?
                document.querySelectorAll(`${selector} img`) :
                document.querySelectorAll('img');

            return Array.from(imgElements).map(img => ({
                url: (img as HTMLImageElement).src,
                alt: (img as HTMLImageElement).alt || '',
                sourceType: 'img_tag'
            }));
        }, args.selector || '');

        // Extract CSS background images if requested (default true)
        const includeBackgroundImages = args.includeBackgroundImages !== false;
        let cssImages: { url: string, sourceType: string }[] = [];

        if (includeBackgroundImages) {
            cssImages = await page.evaluate((selector: string) => {
                const elements = selector ?
                    document.querySelectorAll(selector) :
                    document.querySelectorAll('*');

                const results: { url: string, sourceType: string }[] = [];

                elements.forEach(element => {
                    const computedStyle = window.getComputedStyle(element);
                    const backgroundImage = computedStyle.backgroundImage;

                    if (backgroundImage && backgroundImage !== 'none') {
                        // Extract URL from the background-image CSS property
                        const urlMatches = backgroundImage.match(/url\(['"]?([^'"()]+)['"]?\)/g);

                        if (urlMatches) {
                            urlMatches.forEach(urlMatch => {
                                const url = urlMatch.replace(/url\(['"]?([^'"()]+)['"]?\)/, '$1');
                                results.push({
                                    url: url,
                                    sourceType: 'css_background'
                                });
                            });
                        }
                    }
                });

                return results;
            }, args.selector || '');
        }

        // Combine both types of images
        const allImages = [...imgImages, ...cssImages];

        // Convert relative URLs to absolute and deduplicate
        const pageUrl = page.url();
        const uniqueImageUrls = new Set<string>();

        allImages.forEach(image => {
            let absoluteUrl = image.url;
            // Handle relative URLs
            if (!absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('data:')) {
                try {
                    absoluteUrl = new URL(image.url, pageUrl).href;
                } catch (e) {
                    console.warn(`Failed to parse URL: ${image.url}`);
                    return;
                }
            }

            // Skip data URLs for downloading (keep them for display)
            if (!uniqueImageUrls.has(absoluteUrl)) {
                uniqueImageUrls.add(absoluteUrl);
                state.extractedImages.push({
                    ...image,
                    url: absoluteUrl
                });
            }
        });

        return {
            content: [{
                type: "text",
                text: `Extracted ${state.extractedImages.length} images:\n${state.extractedImages.map((img: ExtractedImage, i: number) =>
                    `${i + 1}. [${img.sourceType}] ${img.url.substring(0, 100)}${img.url.length > 100 ? '...' : ''}`
                ).join('\n')}`,
            } as TextContent],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to extract images: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 