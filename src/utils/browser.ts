import puppeteer from "puppeteer";
import { GlobalState } from "../types/index.js";
import { deepMerge } from "./helpers.js";

// Global state initialization
export const state: GlobalState = {
    browser: null,
    page: null,
    consoleLogs: [],
    screenshots: new Map<string, string>(),
    extractedImages: [],
    previousLaunchOptions: null
};

export async function ensureBrowser({ launchOptions, allowDangerous }: any) {
    const DANGEROUS_ARGS = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--single-process',
        '--disable-web-security',
        '--ignore-certificate-errors',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials',
        '--allow-running-insecure-content'
    ];

    // Parse environment config safely
    let envConfig = {};
    try {
        envConfig = JSON.parse(process.env.PUPPETEER_LAUNCH_OPTIONS || '{}');
    } catch (error: any) {
        console.warn('Failed to parse PUPPETEER_LAUNCH_OPTIONS:', error?.message || error);
    }

    // Deep merge environment config with user-provided options
    const mergedConfig = deepMerge(envConfig, launchOptions || {});

    // Security validation for merged config
    if (mergedConfig?.args) {
        const dangerousArgs = mergedConfig.args?.filter?.((arg: string) =>
            DANGEROUS_ARGS.some((dangerousArg: string) => arg.startsWith(dangerousArg))
        );

        if (dangerousArgs?.length > 0 && !(allowDangerous || (process.env.ALLOW_DANGEROUS === 'true'))) {
            throw new Error(
                `Dangerous browser arguments detected: ${dangerousArgs.join(', ')}. Found from environment variable and tool call argument. ` +
                'Set allowDangerous: true in the tool call arguments to override.'
            );
        }
    }

    try {
        if ((state.browser && !state.browser.connected) ||
            (launchOptions && (JSON.stringify(launchOptions) != JSON.stringify(state.previousLaunchOptions)))) {
            await state.browser?.close();
            state.browser = null;
        }
    } catch (error) {
        state.browser = null;
    }

    state.previousLaunchOptions = launchOptions;

    if (!state.browser) {
        const npx_args = { headless: false };
        const docker_args = { headless: true, args: ["--no-sandbox", "--single-process", "--no-zygote"] };

        state.browser = await puppeteer.launch(deepMerge(
            process.env.DOCKER_CONTAINER ? docker_args : npx_args,
            mergedConfig
        ));

        const pages = await state.browser.pages();
        state.page = pages[0];
    }

    return state.page!;
} 