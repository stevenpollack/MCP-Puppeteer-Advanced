import { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

interface TabInfo {
    index: number;
    url: string;
    title: string;
    active: boolean;
}

export async function browserStatus(args: any): Promise<CallToolResult> {
    try {
        const action = args.action;

        // Check if browser is running
        if (!state.browser || !state.browser.connected) {
            return {
                content: [{
                    type: "text",
                    text: "Browser is not running. Please navigate to a URL first.",
                }],
                isError: true,
            };
        }

        switch (action) {
            // Get browser status
            case "status": {
                const isConnected = state.browser.connected;
                const pages = await state.browser.pages();
                const activeTabIndex = pages.findIndex(p => p === state.page);

                return {
                    content: [{
                        type: "text",
                        text: `Browser status:
- Connected: ${isConnected}
- Number of open tabs: ${pages.length}
- Active tab index: ${activeTabIndex !== -1 ? activeTabIndex : 'None'}
- Current URL: ${state.page ? await state.page.url() : 'None'}`,
                    }],
                    isError: false,
                };
            }

            // List all open tabs
            case "list_tabs": {
                const pages = await state.browser.pages();
                const tabInfos: TabInfo[] = [];

                // Get information about each tab
                for (let i = 0; i < pages.length; i++) {
                    const page = pages[i];
                    let title = '';
                    let url = '';

                    try {
                        title = await page.title();
                        url = await page.url();
                    } catch (e) {
                        // Tab might be unresponsive
                        title = 'Unresponsive tab';
                        url = 'about:blank';
                    }

                    tabInfos.push({
                        index: i,
                        url: url,
                        title: title,
                        active: page === state.page
                    });
                }

                // Create a formatted list
                let tabsList = "Open browser tabs:\n\n";
                tabInfos.forEach(tab => {
                    tabsList += `${tab.index}. ${tab.title} ${tab.active ? '(ACTIVE)' : ''}\n`;
                    tabsList += `   URL: ${tab.url}\n\n`;
                });

                return {
                    content: [{
                        type: "text",
                        text: tabsList,
                    }],
                    isError: false,
                };
            }

            // Switch to a different tab
            case "switch_tab": {
                if (typeof args.tabIndex !== 'number') {
                    return {
                        content: [{
                            type: "text",
                            text: "Missing required parameter 'tabIndex' for switch_tab action",
                        }],
                        isError: true,
                    };
                }

                const pages = await state.browser.pages();
                const tabIndex = args.tabIndex;

                if (tabIndex < 0 || tabIndex >= pages.length) {
                    return {
                        content: [{
                            type: "text",
                            text: `Invalid tab index: ${tabIndex}. Available range: 0-${pages.length - 1}`,
                        }],
                        isError: true,
                    };
                }

                // Switch to the requested tab
                const targetPage = pages[tabIndex];
                state.page = targetPage;

                // Focus and activate the tab
                await targetPage.bringToFront();

                let title = '';
                let url = '';

                try {
                    title = await targetPage.title();
                    url = await targetPage.url();
                } catch (e) {
                    title = 'Unresponsive tab';
                    url = 'about:blank';
                }

                return {
                    content: [{
                        type: "text",
                        text: `Switched to tab ${tabIndex}: "${title}"\nURL: ${url}`,
                    }],
                    isError: false,
                };
            }

            // Open a new tab
            case "new_tab": {
                // Default URL if none provided
                const url = args.url || 'about:blank';

                // Create a new page (tab)
                const newPage = await state.browser.newPage();

                // Navigate to the requested URL if it's not about:blank
                if (url !== 'about:blank') {
                    await newPage.goto(url);
                }

                // Set it as the active page
                state.page = newPage;

                // Focus the new tab
                await newPage.bringToFront();

                const pages = await state.browser.pages();
                const newTabIndex = pages.findIndex(p => p === newPage);

                let title = '';
                try {
                    title = await newPage.title();
                } catch (e) {
                    title = 'Unresponsive tab';
                }

                return {
                    content: [{
                        type: "text",
                        text: `Opened new tab at index ${newTabIndex}: "${title}"\nURL: ${url}`,
                    }],
                    isError: false,
                };
            }

            default:
                return {
                    content: [{
                        type: "text",
                        text: `Invalid action: ${action}. Supported actions are: status, list_tabs, switch_tab, new_tab`,
                    }],
                    isError: true,
                };
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error accessing browser: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 