# Image Minimizer

A clean, cross-platform Electron app for minimizing and compressing images with a beautiful universe-themed UI.

## Features

- 🖼️ **Select Multiple Images** - Choose multiple images from your device
- 📐 **Adjustable Size Ratio** - Resize images by percentage (10% - 100%)
- 🎨 **Quality Control** - Adjust JPEG quality (50-100)
- 💾 **Bulk Save** - Save all processed images to a folder
- 🔄 **Replace Originals** - Replace original images with backups

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

1. Click "Select Images" to choose one or more images
2. Adjust the size ratio slider (percentage of original size)
3. Adjust the quality slider (JPEG compression quality)
4. Click "Process Images" to compress your images
5. Choose either:
   - **Save to Folder**: Save processed images to a new location
   - **Replace Originals**: Replace original images (backups are created automatically)

## Requirements

- Node.js 18+ 
- npm or yarn

## Technologies

- Electron
- TypeScript
- Sharp (image processing)
- HTML/CSS/JavaScript

