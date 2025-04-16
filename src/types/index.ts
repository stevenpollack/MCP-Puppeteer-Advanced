import { Browser, Page } from "puppeteer";

// Global state types
export interface ExtractedImage {
    url: string;
    sourceType: string;
    alt?: string;
}

export interface DownloadResult {
    url: string;
    path: string;
    success: boolean;
    error?: string;
}

export interface GlobalState {
    browser: Browser | null;
    page: Page | null;
    consoleLogs: string[];
    screenshots: Map<string, string>;
    extractedImages: ExtractedImage[];
    previousLaunchOptions: any;
}

// Declare global window interface extension
declare global {
    interface Window {
        mcpHelper: {
            logs: string[];
            originalConsole: Partial<typeof console>;
        }
    }
} 