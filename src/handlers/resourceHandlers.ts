import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { state } from "../utils/browser.js";

export function setupResourceHandlers(server: Server): void {
    // Handler for listing available resources
    server.setRequestHandler(ListResourcesRequestSchema, async () => ({
        resources: [
            {
                uri: "console://logs",
                mimeType: "text/plain",
                name: "Browser console logs",
            },
            ...Array.from(state.screenshots.keys()).map(name => ({
                uri: `screenshot://${name}`,
                mimeType: "image/png",
                name: `Screenshot: ${name}`,
            })),
        ],
    }));

    // Handler for reading resources
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
        const uri = request.params.uri.toString();

        if (uri === "console://logs") {
            return {
                contents: [{
                    uri,
                    mimeType: "text/plain",
                    text: state.consoleLogs.join("\n"),
                }],
            };
        }

        if (uri.startsWith("screenshot://")) {
            const name = uri.split("://")[1];
            const screenshot = state.screenshots.get(name);
            if (screenshot) {
                return {
                    contents: [{
                        uri,
                        mimeType: "image/png",
                        blob: screenshot,
                    }],
                };
            }
        }

        throw new Error(`Resource not found: ${uri}`);
    });
} 