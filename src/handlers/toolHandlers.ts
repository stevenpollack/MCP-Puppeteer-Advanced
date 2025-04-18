import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { TOOLS } from "../tools/definitions.js";
import { ensureBrowser } from "../utils/browser.js";
import {
    navigateTool,
    screenshotTool,
    clickTool,
    fillTool,
    selectTool,
    hoverTool,
    evaluateTool,
    extractImages,
    downloadImages,
    analyzeElement,
    browserStatus,
    analyzePageHierarchy,
    viewportSwitcher,
    navigateHistory,
} from "../tools/index.js";
import type { NavigationHistoryOptions } from "../tools/navigation.js";

export function setupToolHandlers(server: Server): void {
    // Handler for listing available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    // Handler for tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = request.params.arguments ?? {};

        // Special handling for browser status - don't require a browser for status check
        if (name === "puppeteer_browser_status") {
            return browserStatus(args);
        }

        // Ensure browser is initialized for all other tool calls
        const page = await ensureBrowser(args);

        // Set default desktop viewport size when browser is initialized
        // Only do this when the browser is first initialized (not on every call)
        if (name === "puppeteer_navigate") {
            // Default to desktop viewport when navigating to a page
            await page.setViewport({
                width: 1280,
                height: 800,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: false
            });
        }

        // Route to the appropriate tool handler
        switch (name) {
            case "puppeteer_navigate":
                return navigateTool(args, server);

            case "puppeteer_screenshot":
                return screenshotTool(args, server);

            case "puppeteer_click":
                return clickTool(args);

            case "puppeteer_fill":
                return fillTool(args);

            case "puppeteer_select":
                return selectTool(args);

            case "puppeteer_hover":
                return hoverTool(args);

            case "puppeteer_evaluate":
                return evaluateTool(args);

            case "puppeteer_extract_images":
                return extractImages(args);

            case "puppeteer_download_images":
                return downloadImages(args);

            case "puppeteer_analyze_element":
                return analyzeElement(args);

            case "puppeteer_analyze_page_hierarchy":
                return analyzePageHierarchy(args);

            case "puppeteer_viewport_switcher":
                return viewportSwitcher(args);

            case "puppeteer_navigation_history": {
                if (typeof args.action !== 'string' || !['back', 'forward'].includes(args.action)) {
                    return {
                        content: [{
                            type: "text",
                            text: "Invalid navigation action. Must be either 'back' or 'forward'.",
                        }],
                        isError: true,
                    };
                }

                const navigationOptions: NavigationHistoryOptions = {
                    action: args.action as 'back' | 'forward'
                };

                if (typeof args.waitUntil === 'string' &&
                    ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'].includes(args.waitUntil)) {
                    navigationOptions.waitUntil = args.waitUntil as 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
                }

                return navigateHistory(navigationOptions);
            }

            default:
                return {
                    content: [{
                        type: "text",
                        text: `Unknown tool: ${name}`,
                    }],
                    isError: true,
                };
        }
    });
} 