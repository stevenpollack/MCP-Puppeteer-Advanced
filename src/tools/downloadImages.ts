import * as fs from 'fs';
import * as path from 'path';
import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { downloadImage } from "../utils/helpers.js";
import { state } from "../utils/browser.js";
import { DownloadResult, ExtractedImage } from "../types/index.js";

export async function downloadImages(args: any): Promise<CallToolResult> {
    try {
        const imageUrls = args.imageUrls || state.extractedImages.map((img: ExtractedImage) => img.url);
        const outputFolder = args.outputFolder || './downloaded_images';
        const namePrefix = args.namePrefix || '';

        // Create the output directory if it doesn't exist
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }

        const results: DownloadResult[] = [];

        // Download each image
        for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i];

            // Skip data URLs
            if (imageUrl.startsWith('data:')) {
                results.push({
                    url: imageUrl.substring(0, 30) + '...',
                    path: '',
                    success: false,
                    error: 'Skipped data URL'
                });
                continue;
            }

            try {
                // Generate a filename based on URL or index if URL parsing fails
                let filename = '';
                try {
                    const parsedUrl = new URL(imageUrl);
                    const urlPath = parsedUrl.pathname;
                    const urlFilename = path.basename(urlPath);
                    filename = urlFilename.replace(/[^a-zA-Z0-9\._-]/g, '_');

                    // Add extension if missing
                    if (!path.extname(filename)) {
                        filename += '.jpg'; // Default extension if unknown
                    }
                } catch (e) {
                    filename = `image_${i + 1}.jpg`;
                }

                // Add prefix if provided
                if (namePrefix) {
                    filename = `${namePrefix}_${filename}`;
                }

                const outputPath = path.join(outputFolder, filename);

                // Download the image
                const downloadResult = await downloadImage(imageUrl, outputPath);

                results.push({
                    url: imageUrl,
                    path: outputPath,
                    success: downloadResult.success,
                    error: downloadResult.error
                });
            } catch (error) {
                results.push({
                    url: imageUrl,
                    path: '',
                    success: false,
                    error: (error as Error).message
                });
            }
        }

        const successCount = results.filter(r => r.success).length;

        return {
            content: [{
                type: "text",
                text: `Downloaded ${successCount}/${imageUrls.length} images to ${outputFolder}:\n${results.map((r: DownloadResult, i: number) =>
                    `${i + 1}. ${r.url.substring(0, 50)}${r.url.length > 50 ? '...' : ''} -> ${r.success ? r.path : 'FAILED: ' + r.error}`
                ).join('\n')}`,
            } as TextContent],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to download images: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 