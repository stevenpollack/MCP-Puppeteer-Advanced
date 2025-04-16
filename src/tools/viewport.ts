import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { state } from "../utils/browser.js";

// Define common viewport presets
export const VIEWPORT_PRESETS = {
    // Mobile viewports
    mobileSM: { width: 320, height: 568, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    mobileMD: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },
    mobileLG: { width: 425, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true, isLandscape: false },

    // Tablet viewports
    tabletSM: { width: 600, height: 960, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: false },
    tabletMD: { width: 768, height: 1024, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: false },
    tabletLG: { width: 900, height: 1280, deviceScaleFactor: 1, isMobile: true, hasTouch: true, isLandscape: false },

    // Desktop viewports
    desktopSM: { width: 1024, height: 768, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: false },
    desktopMD: { width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: false },
    desktopLG: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: false },
    desktopXL: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false, isLandscape: false }
};

// Default viewport is desktop medium
export const DEFAULT_VIEWPORT = VIEWPORT_PRESETS.desktopMD;

interface ViewportOptions {
    preset?: string;
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
}

/**
 * Switch the browser viewport to simulate different devices
 */
export async function viewportSwitcher(
    options: ViewportOptions = {}
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
        let viewport;

        // Handle preset option
        if (options.preset) {
            const presetKey = options.preset.toLowerCase();

            // Match preset based on category
            if (presetKey === "mobile") {
                viewport = VIEWPORT_PRESETS.mobileMD;
            } else if (presetKey === "tablet") {
                viewport = VIEWPORT_PRESETS.tabletMD;
            } else if (presetKey === "desktop") {
                viewport = VIEWPORT_PRESETS.desktopMD;
            } else {
                // Check for specific preset match
                const matchedPreset = Object.entries(VIEWPORT_PRESETS).find(
                    ([key]) => key.toLowerCase() === presetKey
                );

                if (matchedPreset) {
                    viewport = matchedPreset[1];
                } else {
                    return {
                        content: [{
                            type: "text",
                            text: `Error: Unknown viewport preset "${options.preset}". Available presets: ${Object.keys(VIEWPORT_PRESETS).join(", ")}, or use "mobile", "tablet", "desktop" for default sizes.`
                        }],
                        isError: true,
                    };
                }
            }
        } else {
            // Use custom dimensions if provided, or fall back to desktop
            viewport = {
                width: options.width || DEFAULT_VIEWPORT.width,
                height: options.height || DEFAULT_VIEWPORT.height,
                deviceScaleFactor: options.deviceScaleFactor !== undefined ? options.deviceScaleFactor : DEFAULT_VIEWPORT.deviceScaleFactor,
                isMobile: options.isMobile !== undefined ? options.isMobile : DEFAULT_VIEWPORT.isMobile,
                hasTouch: options.hasTouch !== undefined ? options.hasTouch : false,
                isLandscape: options.isLandscape !== undefined ? options.isLandscape : false
            };
        }

        // Set the viewport
        await page.setViewport(viewport);

        // Prepare viewport details for the response
        const deviceType = viewport.isMobile
            ? (viewport.width >= 600 ? "Tablet" : "Mobile")
            : "Desktop";

        const orientation = viewport.isLandscape ? "landscape" : "portrait";

        return {
            content: [{
                type: "text",
                text: `Viewport switched to ${deviceType} mode (${viewport.width}x${viewport.height}, scale factor: ${viewport.deviceScaleFactor}, orientation: ${orientation})`
            }],
            isError: false,
        };
    } catch (error) {
        return {
            content: [{
                type: "text",
                text: `Error switching viewport: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true,
        };
    }
} 