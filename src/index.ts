#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupResourceHandlers } from "./handlers/resourceHandlers.js";
import { setupToolHandlers } from "./handlers/toolHandlers.js";
import { state } from "./utils/browser.js";

// Initialize the server
const server = new Server(
    {
        name: "example-servers/puppeteer",
        version: "0.1.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

// Set up the console log listener when page is created
state.page?.on("console", (msg: any) => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    state.consoleLogs.push(logEntry);
    server.notification({
        method: "notifications/resources/updated",
        params: { uri: "console://logs" },
    });
});

// Setup handlers
setupResourceHandlers(server);
setupToolHandlers(server);

// Start the server
async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

runServer().catch(console.error);

// Handle process termination
process.stdin.on("close", () => {
    console.error("Puppeteer MCP Server closed");
    server.close();
}); 