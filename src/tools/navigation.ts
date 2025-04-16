import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface NavigationOptions {
    action: 'back' | 'forward';
    steps?: number;
}

/**
 * Navigate back or forward in browser history
 */
export async function navigateHistory(
    args: any
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

    try {
        // Validate and extract the options
        const action = args.action;
        const steps = args.steps || 1;

        if (action !== 'back' && action !== 'forward') {
            return {
                content: [{
                    type: "text",
                    text: `Error: Invalid action '${action}'. Must be either 'back' or 'forward'.`
                }],
                isError: true,
            };
        }

        if (typeof steps !== 'number' || steps < 1) {
            return {
                content: [{
                    type: "text",
                    text: "Error: Number of steps must be at least 1."
                }],
                isError: true,
            };
        }

        let currentUrl = await page.url();
        let actionTaken = false;

        // Perform the navigation action
        if (action === 'back') {
            // Go back in history
            for (let i = 0; i < steps; i++) {
                const result = await page.goBack();
                // If navigation was successful, mark action as taken
                if (result) {
                    actionTaken = true;
                } else {
                    // If we couldn't go back anymore, break the loop
                    break;
                }
            }
        } else if (action === 'forward') {
            // Go forward in history
            for (let i = 0; i < steps; i++) {
                const result = await page.goForward();
                // If navigation was successful, mark action as taken
                if (result) {
                    actionTaken = true;
                } else {
                    // If we couldn't go forward anymore, break the loop
                    break;
                }
            }
        }

        // Get the new URL after navigation
        const newUrl = await page.url();

        if (!actionTaken) {
            return {
                content: [{
                    type: "text",
                    text: `Could not navigate ${action} in browser history. You may be at the ${action === 'back' ? 'beginning' : 'end'} of the history.`
                }],
                isError: false,
            };
        }

        return {
            content: [{
                type: "text",
                text: `Navigated ${action} ${steps > 1 ? steps + ' steps' : ''} in browser history\nPrevious URL: ${currentUrl}\nCurrent URL: ${newUrl}`
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error navigating in browser history: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true,
        };
    }
} 