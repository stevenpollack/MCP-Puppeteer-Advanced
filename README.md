# Puppeteer

A Model Context Protocol server that provides browser automation capabilities using Puppeteer. This server enables LLMs to interact with web pages, take screenshots, extract and download images, and execute JavaScript in a real browser environment.

## Components

### Tools

- **puppeteer_navigate**

  - Navigate to any URL in the browser
  - Inputs:
    - `url` (string, required): URL to navigate to
    - `launchOptions` (object, optional): PuppeteerJS LaunchOptions. Default null. If changed and not null, browser restarts. Example: `{ headless: true, args: ['--user-data-dir="C:/Data"'] }`
    - `allowDangerous` (boolean, optional): Allow dangerous LaunchOptions that reduce security. When false, dangerous args like `--no-sandbox`, `--disable-web-security` will throw errors. Default false.

- **puppeteer_screenshot**

  - Capture screenshots of the entire page or specific elements
  - Inputs:
    - `name` (string, required): Name for the screenshot
    - `selector` (string, optional): CSS selector for element to screenshot
    - `width` (number, optional, default: 800): Screenshot width
    - `height` (number, optional, default: 600): Screenshot height

- **puppeteer_click**

  - Click elements on the page
  - Input: `selector` (string): CSS selector for element to click

- **puppeteer_hover**

  - Hover elements on the page
  - Input: `selector` (string): CSS selector for element to hover

- **puppeteer_fill**

  - Fill out input fields
  - Inputs:
    - `selector` (string): CSS selector for input field
    - `value` (string): Value to fill

- **puppeteer_select**

  - Select an element with SELECT tag
  - Inputs:
    - `selector` (string): CSS selector for element to select
    - `value` (string): Value to select

- **puppeteer_evaluate**

  - Execute JavaScript in the browser console
  - Input: `script` (string): JavaScript code to execute

- **puppeteer_extract_images**

  - Extract all images from the page (both `<img>` tags and CSS background images)
  - Inputs:
    - `selector` (string, optional): CSS selector to limit image extraction to a specific part of the page
    - `includeBackgroundImages` (boolean, optional, default: true): Whether to include CSS background images

- **puppeteer_download_images**

  - Download extracted images to a specified folder
  - Inputs:
    - `imageUrls` (array of strings, required): Array of image URLs to download
    - `outputFolder` (string, optional, default: './downloaded_images'): Folder path where images should be saved
    - `namePrefix` (string, optional): Prefix for downloaded image filenames

- **puppeteer_analyze_element**

  - Analyze a DOM element to extract its HTML structure, Markdown representation, and applied styles
  - Inputs:
    - `selector` (string, required): CSS selector for the element to analyze
    - `includeStyles` (boolean, optional, default: true): Whether to include computed styles
    - `maxDepth` (number, optional, default: 10): Maximum depth for nested elements
    - `includeSiblings` (boolean, optional, default: false): Whether to include siblings of the selected element

- **puppeteer_browser_status**

  - Check browser status, list open tabs, and manage tab switching
  - Inputs:
    - `action` (string, required): Action to perform
      - `status`: Check browser connection status and tab information
      - `list_tabs`: List all open browser tabs with URLs and titles
      - `switch_tab`: Switch to a different browser tab
      - `new_tab`: Open a new browser tab
    - `tabIndex` (number, required for `switch_tab`): Index of the tab to switch to
    - `url` (string, optional for `new_tab`): URL to open in the new tab

- **puppeteer_analyze_page_hierarchy**

  - Analyze the DOM hierarchy of a page and determine parent-child relationships between elements
  - Inputs:
    - `selector` (string, optional, default: 'body'): CSS selector for the root element to analyze
    - `maxDepth` (number, optional, default: 10): Maximum depth of the hierarchy to analyze
    - `includeTextNodes` (boolean, optional, default: true): Whether to include text nodes in the hierarchy
    - `includeClasses` (boolean, optional, default: false): Whether to include CSS classes in the output
    - `includeIds` (boolean, optional, default: false): Whether to include element IDs in the output

- **puppeteer_viewport_switcher**

  - Switch the browser viewport to simulate different devices (mobile, tablet, desktop)
  - Inputs:
    - `preset` (string, optional): Viewport preset to use. Can be general ('mobile', 'tablet', 'desktop') or specific ('mobileSM', 'mobileMD', 'mobileLG', 'tabletSM', 'tabletMD', 'tabletLG', 'desktopSM', 'desktopMD', 'desktopLG', 'desktopXL')
    - `width` (number, optional): Custom viewport width in pixels (ignored if preset is specified)
    - `height` (number, optional): Custom viewport height in pixels (ignored if preset is specified)
    - `deviceScaleFactor` (number, optional): Device scale factor (pixel ratio) - typically 1 for desktop and 2 for retina/mobile
    - `isMobile` (boolean, optional): Whether the meta viewport tag should be used for mobile simulation
    - `hasTouch` (boolean, optional): Whether the device has touch capabilities
    - `isLandscape` (boolean, optional): Whether the device is in landscape orientation

- **puppeteer_navigation_history**
  - Navigate back or forward in browser history
  - Inputs:
    - `action` (string, required): Navigation action to perform - either 'back' to go back in history or 'forward' to go forward
    - `steps` (number, optional, default: 1): Number of steps to navigate

### Resources

The server provides access to two types of resources:

1. **Console Logs** (`console://logs`)

   - Browser console output in text format
   - Includes all console messages from the browser

2. **Screenshots** (`screenshot://<name>`)
   - PNG images of captured screenshots
   - Accessible via the screenshot name specified during capture

## Key Features

- Browser automation
- Console log monitoring
- Screenshot capabilities
- JavaScript execution
- Basic web interaction (navigation, clicking, form filling)
- Image extraction from both `<img>` tags and CSS backgrounds
- Image downloading with automatic filename generation
- DOM element analysis (HTML, Markdown, and styles)
- Multi-tab browser management
- Customizable Puppeteer launch options

## Configuration to use Puppeteer Server

Here's the Claude Desktop configuration to use the Puppeter server:

### Docker

**NOTE** The docker implementation will use headless chromium, where as the NPX version will open a browser window.

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "--init",
        "-e",
        "DOCKER_CONTAINER=true",
        "mcp/puppeteer"
      ]
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### Launch Options

You can customize Puppeteer's browser behavior in two ways:

1. **Environment Variable**: Set `PUPPETEER_LAUNCH_OPTIONS` with a JSON-encoded string in the MCP configuration's `env` parameter:

   ```json
   {
     "mcpServers": {
       "mcp-puppeteer": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
         "env": {
           "PUPPETEER_LAUNCH_OPTIONS": "{ \"headless\": false, \"executablePath\": \"C:/Program Files/Google/Chrome/Application/chrome.exe\", \"args\": [] }",
           "ALLOW_DANGEROUS": "true"
         }
       }
     }
   }
   ```

2. **Tool Call Arguments**: Pass `launchOptions` and `allowDangerous` parameters to the `puppeteer_navigate` tool:

   ```json
   {
     "url": "https://example.com",
     "launchOptions": {
       "headless": false,
       "defaultViewport": { "width": 1280, "height": 720 }
     }
   }
   ```

## Project Structure

The project is organized into a modular structure:

```
src/
├── handlers/          # Request handlers
│   ├── resourceHandlers.ts
│   └── toolHandlers.ts
├── tools/             # Tool implementations
│   ├── definitions.ts
│   ├── downloadImages.ts
│   ├── extractImages.ts
│   ├── analyzeElement.ts
│   ├── browserStatus.ts
│   ├── colorPalette.ts
│   ├── navigation.ts
│   ├── pageHierarchy.ts
│   ├── sitemap.ts
│   ├── viewport.ts
│   └── index.ts
├── types/             # TypeScript interfaces
│   └── index.ts
├── utils/             # Utility functions
│   ├── browser.ts
│   └── helpers.ts
└── index.ts           # Main entry point
```

## Usage Examples

### Extracting and Downloading Images

```javascript
// Navigate to a page
await callTool("puppeteer_navigate", { url: "https://example.com" });

// Extract all images from the page
await callTool("puppeteer_extract_images", {});

// Extract images from a specific section only
await callTool("puppeteer_extract_images", {
  selector: "#content-area",
  includeBackgroundImages: true,
});

// Download the extracted images
await callTool("puppeteer_download_images", {
  outputFolder: "./my-images",
  namePrefix: "example",
});

// Or download specific images directly
await callTool("puppeteer_download_images", {
  imageUrls: [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png",
  ],
  outputFolder: "./specific-images",
});
```

### Analyzing DOM Elements

```javascript
// Navigate to a page
await callTool("puppeteer_navigate", { url: "https://example.com" });

// Analyze a specific element
await callTool("puppeteer_analyze_element", {
  selector: ".hero-section",
});

// Analyze with more options
await callTool("puppeteer_analyze_element", {
  selector: "#main-content",
  includeStyles: true,
  maxDepth: 5,
  includeSiblings: false,
});

// Analyze an element and its siblings
await callTool("puppeteer_analyze_element", {
  selector: "nav.main-navigation > ul > li.active",
  includeSiblings: true,
});
```

### Managing Browser Tabs

```javascript
// Check browser status
await callTool("puppeteer_browser_status", {
  action: "status",
});

// Open multiple tabs with different content
await callTool("puppeteer_navigate", { url: "https://example.com" });
await callTool("puppeteer_browser_status", {
  action: "new_tab",
  url: "https://example.org",
});
await callTool("puppeteer_browser_status", {
  action: "new_tab",
  url: "https://example.net",
});

// List all open tabs
await callTool("puppeteer_browser_status", {
  action: "list_tabs",
});

// Switch back to the first tab
await callTool("puppeteer_browser_status", {
  action: "switch_tab",
  tabIndex: 0,
});

// Take actions in the first tab
await callTool("puppeteer_screenshot", {
  name: "first-tab-screenshot",
});

// Switch to the second tab
await callTool("puppeteer_browser_status", {
  action: "switch_tab",
  tabIndex: 1,
});

// Take actions in the second tab
await callTool("puppeteer_extract_images", {});
```

### Analyzing Page Hierarchy

```javascript
// Navigate to a page
await callTool("puppeteer_navigate", { url: "https://example.com" });

// Get the full page hierarchy
await callTool("puppeteer_analyze_page_hierarchy", {});

// Analyze a specific section with custom options
await callTool("puppeteer_analyze_page_hierarchy", {
  selector: "#main-content",
  maxDepth: 5,
  includeTextNodes: true,
  includeClasses: true,
  includeIds: true,
});
```

### Using Viewport Switcher for Responsive Testing

```javascript
// Navigate to a page
await callTool("puppeteer_navigate", { url: "https://example.com" });

// Switch to mobile view
await callTool("puppeteer_viewport_switcher", { preset: "mobile" });

// Take a screenshot in mobile view
await callTool("puppeteer_screenshot", { name: "mobile-view" });

// Switch to tablet view
await callTool("puppeteer_viewport_switcher", { preset: "tablet" });

// Take a screenshot in tablet view
await callTool("puppeteer_screenshot", { name: "tablet-view" });

// Switch to desktop view
await callTool("puppeteer_viewport_switcher", { preset: "desktop" });

// Take a screenshot in desktop view
await callTool("puppeteer_screenshot", { name: "desktop-view" });

// Use a custom viewport size
await callTool("puppeteer_viewport_switcher", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 2,
  isMobile: false,
});
```

### Using History Navigation

```javascript
// Navigate to a sequence of pages
await callTool("puppeteer_navigate", { url: "https://example.com" });
await callTool("puppeteer_navigate", { url: "https://example.com/page1" });
await callTool("puppeteer_navigate", { url: "https://example.com/page2" });

// Go back one page in history
await callTool("puppeteer_navigation_history", { action: "back" });
// Current page is now example.com/page1

// Go back to the first page
await callTool("puppeteer_navigation_history", { action: "back" });
// Current page is now example.com

// Go forward two steps
await callTool("puppeteer_navigation_history", {
  action: "forward",
  steps: 2,
});
// Current page is now example.com/page2
```

## Build

Docker build:

```bash
docker build -t mcp/puppeteer -f Dockerfile .
```

## Development

### Requirements

- Node.js 16+
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. For development with auto-reloading: `npm run dev`

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
