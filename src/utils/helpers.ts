import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Deep merge utility function
export function deepMerge(target: any, source: any): any {
    const output = Object.assign({}, target);
    if (typeof target !== 'object' || typeof source !== 'object') return source;

    for (const key of Object.keys(source)) {
        const targetVal = target[key];
        const sourceVal = source[key];
        if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
            // Deduplicate args/ignoreDefaultArgs, prefer source values
            output[key] = [...new Set([
                ...(key === 'args' || key === 'ignoreDefaultArgs' ?
                    targetVal.filter((arg: string) => !sourceVal.some((launchArg: string) =>
                        arg.startsWith('--') && launchArg.startsWith(arg.split('=')[0])
                    )) :
                    targetVal),
                ...sourceVal
            ])];
        } else if (sourceVal instanceof Object && key in target) {
            output[key] = deepMerge(targetVal, sourceVal);
        } else {
            output[key] = sourceVal;
        }
    }
    return output;
}

// Helper function to download an image from a URL
export async function downloadImage(imageUrl: string, outputPath: string): Promise<{ success: boolean, error?: string }> {
    return new Promise((resolve) => {
        try {
            const parsedUrl = new URL(imageUrl);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const request = protocol.get(imageUrl, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302) {
                    const redirectUrl = response.headers.location;
                    if (redirectUrl) {
                        downloadImage(redirectUrl, outputPath)
                            .then(resolve)
                            .catch(() => resolve({ success: false, error: 'Redirect failed' }));
                        return;
                    }
                }

                // Check for successful response
                if (response.statusCode !== 200) {
                    resolve({ success: false, error: `HTTP status ${response.statusCode}` });
                    return;
                }

                // Create a file write stream
                const fileStream = fs.createWriteStream(outputPath);

                // Pipe the response to the file
                response.pipe(fileStream);

                // Handle completion
                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve({ success: true });
                });

                // Handle errors
                fileStream.on('error', (err) => {
                    fs.unlink(outputPath, () => { });
                    resolve({ success: false, error: err.message });
                });
            });

            // Handle request errors
            request.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });

            // Set timeout
            request.setTimeout(15000, () => {
                request.destroy();
                resolve({ success: false, error: 'Request timeout' });
            });
        } catch (error) {
            resolve({ success: false, error: (error as Error).message });
        }
    });
} 