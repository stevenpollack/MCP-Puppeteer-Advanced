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
    downloadImages
} from "../tools/index.js";

export function setupToolHandlers(server: Server): void {
    // Handler for listing available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: TOOLS,
    }));

    // Handler for tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const args = request.params.arguments ?? {};

        // Ensure browser is initialized for all tool calls
        await ensureBrowser(args);

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