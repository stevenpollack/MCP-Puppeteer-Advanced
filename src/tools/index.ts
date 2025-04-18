import { CallToolResult, ImageContent, TextContent } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";
import { extractImages } from "./extractImages.js";
import { downloadImages } from "./downloadImages.js";
import { analyzeElement } from "./analyzeElement.js";
import { browserStatus } from "./browserStatus.js";
import { analyzePageHierarchy } from "./pageHierarchy.js";
import { viewportSwitcher, DEFAULT_VIEWPORT } from "./viewport.js";
import { navigateHistory } from "./navigation.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Export all tool implementations
export { extractImages } from "./extractImages.js";
export { downloadImages } from "./downloadImages.js";
export { analyzeElement } from "./analyzeElement.js";
export { browserStatus } from "./browserStatus.js";
export { analyzePageHierarchy } from "./pageHierarchy.js";
export { viewportSwitcher } from "./viewport.js";
export { navigateHistory } from "./navigation.js";

// Handler for the navigate tool
export async function navigateTool(args: any, server: Server): Promise<CallToolResult> {
    await state.page?.goto(args.url);
    return {
        content: [{
            type: "text",
            text: `Navigated to ${args.url}`,
        }],
        isError: false,
    };
}

// Handler for the screenshot tool
export async function screenshotTool(args: any, server: Server): Promise<CallToolResult> {
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

    // Store current viewport settings
    const currentViewport = page.viewport();

    const width = args.width ?? 800;
    const height = args.height ?? 600;
    await page.setViewport({
        ...currentViewport,
        width,
        height
    });

    const screenshot = await (args.selector ?
        (await page.$(args.selector))?.screenshot({ encoding: "base64" }) :
        page.screenshot({ encoding: "base64", fullPage: false }));

    // Restore previous viewport settings
    await page.setViewport(currentViewport);

    if (!screenshot) {
        return {
            content: [{
                type: "text",
                text: args.selector ? `Element not found: ${args.selector}` : "Screenshot failed",
            }],
            isError: true,
        };
    }

    state.screenshots.set(args.name, screenshot as string);
    server.notification({
        method: "notifications/resources/list_changed",
    });

    return {
        content: [
            {
                type: "text",
                text: `Screenshot '${args.name}' taken at ${width}x${height}`,
            } as TextContent,
            {
                type: "image",
                data: screenshot,
                mimeType: "image/png",
            } as ImageContent,
        ],
        isError: false,
    };
}

// Handler for the click tool
export async function clickTool(args: any): Promise<CallToolResult> {
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

    try {
        // Wait for the element to be present in DOM
        await page.waitForSelector(args.selector, { timeout: 5000 });

        // Try native click first
        try {
            await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    // Scroll element into view
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, args.selector);

            // Wait a moment for smooth scroll to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            await page.click(args.selector);
            return {
                content: [{
                    type: "text",
                    text: `Clicked: ${args.selector}`,
                }],
                isError: false,
            };
        } catch (clickError) {
            // If native click fails, try JavaScript click
            const clicked = await page.evaluate((selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    element.click();
                    return true;
                }
                return false;
            }, args.selector);

            if (clicked) {
                return {
                    content: [{
                        type: "text",
                        text: `Clicked (using JavaScript): ${args.selector}`,
                    }],
                    isError: false,
                };
            }

            throw new Error(`Element found but not clickable: ${(clickError as Error).message}`);
        }
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to click ${args.selector}: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
}

// Handler for the fill tool
export async function fillTool(args: any): Promise<CallToolResult> {
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

        await page.waitForSelector(args.selector);
        await page.type(args.selector, args.value);
        return {
            content: [{
                type: "text",
                text: `Filled ${args.selector} with: ${args.value}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to fill ${args.selector}: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
}

// Handler for the select tool
export async function selectTool(args: any): Promise<CallToolResult> {
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

        await page.waitForSelector(args.selector);
        await page.select(args.selector, args.value);
        return {
            content: [{
                type: "text",
                text: `Selected ${args.selector} with: ${args.value}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to select ${args.selector}: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
}

// Handler for the hover tool
export async function hoverTool(args: any): Promise<CallToolResult> {
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

        await page.waitForSelector(args.selector);
        await page.hover(args.selector);
        return {
            content: [{
                type: "text",
                text: `Hovered ${args.selector}`,
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Failed to hover ${args.selector}: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
}

// Handler for the evaluate tool
export async function evaluateTool(args: any): Promise<CallToolResult> {
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

        await page.evaluate(() => {
            window.mcpHelper = {
                logs: [],
                originalConsole: { ...console },
            };

            ['log', 'info', 'warn', 'error'].forEach(method => {
                (console as any)[method] = (...args: any[]) => {
                    window.mcpHelper.logs.push(`[${method}] ${args.join(' ')}`);
                    (window.mcpHelper.originalConsole as any)[method](...args);
                };
            });
        });

        const result = await page.evaluate(args.script);

        const logs = await page.evaluate(() => {
            Object.assign(console, window.mcpHelper.originalConsole);
            const logs = window.mcpHelper.logs;
            delete (window as any).mcpHelper;
            return logs;
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Execution result:\n${JSON.stringify(result, null, 2)}\n\nConsole output:\n${logs.join('\n')}`,
                },
            ],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Script execution failed: ${(error as Error).message}`,
            }],
            isError: true,
        };
    }
} 