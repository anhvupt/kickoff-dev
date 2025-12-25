# Kickoff App

A clean, cross-platform Electron app with image minimization and screenshot capture features, featuring a beautiful universe-themed UI.

## Features

### Image Minimizer
- 🖼️ **Select Multiple Images** - Choose multiple images from your device
- 📐 **Adjustable Size Ratio** - Resize images by percentage (10% - 100%)
- 🎨 **Quality Control** - Adjust JPEG quality (50-100)
- 💾 **Bulk Save** - Save all processed images to a folder
- 🔄 **Replace Originals** - Replace original images with backups

### Screenshot Capture
- 📸 **Single Capture** - Capture screenshots of any website
- 📋 **Batch Capture** - Capture multiple URLs at once
- ⚙️ **Customizable Settings**:
  - Viewport width and height
  - Wait strategies (load, domcontentloaded, networkidle0, networkidle2)
  - Extra wait time
  - Full page capture
  - Light mode (blocks images, CSS, and fonts for faster capture)
- 📋 **Copy to Clipboard** - Copy screenshots directly to clipboard
- 💾 **Download** - Save screenshots as PNG files
- 🌐 **Browser Management** - Auto-detects local Chrome or uses Chromium for serverless environments

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build and run:
```bash
npm start
```

## Development

```bash
# Build TypeScript
npm run build

# Run the app
npm start

# Watch mode for development
npm run watch
```

## Building for Distribution

### macOS
```bash
npm run dist:mac
```

This will create a `.dmg` file in the `dist` folder.

### Windows
```bash
npm run dist:win
```

This will create an installer in the `dist` folder.

## Usage

### Image Minimizer
1. Click "Select Images" to choose one or more images
2. Adjust the size ratio slider (percentage of original size)
3. Adjust the quality slider (JPEG compression quality)
4. Click "Process Images" to compress your images
5. Choose either:
   - **Save to Folder**: Save processed images to a new location
   - **Replace Originals**: Replace original images (backups are created automatically)

### Screenshot Capture

#### Single Capture
1. Enter a URL in the URL field
2. Adjust viewport dimensions (width/height)
3. Select wait strategy and optional settings
4. Click "Capture" to take a screenshot
5. Use "Copy to Clipboard" or "Download PNG" to save the result

#### Batch Capture
1. Enter multiple URLs (one per line) in the textarea
2. Configure capture settings
3. Click "Capture All" to process all URLs
4. Results appear in a grid with individual copy/download buttons

## Screenshot Options

- **Width/Height**: Viewport dimensions in pixels (default: 1200x630)
- **Wait Strategy**:
  - `load`: Wait for load event
  - `domcontentloaded`: Wait for DOMContentLoaded
  - `networkidle0`: Wait until no network connections for 500ms
  - `networkidle2`: Wait until ≤2 network connections for 500ms
- **Extra Wait**: Additional milliseconds to wait after page load
- **Full Page**: Capture entire scrollable page vs viewport only
- **Light Mode**: Block images, stylesheets, and fonts for faster capture

## Requirements

- Node.js 18+ 
- npm or yarn

## Technologies

- Electron
- TypeScript
- Sharp (image processing)
- Puppeteer Core (browser automation)
- @sparticuz/chromium (serverless Chromium)
- HTML/CSS/JavaScript

## Browser Requirements

For local development, the app requires Google Chrome to be installed:
- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Linux**: `/usr/bin/google-chrome`

You can also set a custom path via the `CHROME_EXECUTABLE_PATH` environment variable.

For serverless environments (Vercel/AWS Lambda), the app automatically uses the bundled Chromium package.

