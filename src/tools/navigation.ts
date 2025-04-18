import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

export interface NavigationHistoryOptions {
    action: 'back' | 'forward';
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}

/**
 * Navigate back or forward in browser history
 */
export async function navigateHistory(args: NavigationHistoryOptions): Promise<CallToolResult> {
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

        const waitUntil = args.waitUntil || 'networkidle0';

        if (args.action === 'back') {
            await page.goBack({ waitUntil });
        } else if (args.action === 'forward') {
            await page.goForward({ waitUntil });
        }

        const currentUrl = page.url();

        return {
            content: [{
                type: "text",
                text: `Successfully navigated ${args.action}. Current URL: ${currentUrl}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Navigation ${args.action} failed: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 