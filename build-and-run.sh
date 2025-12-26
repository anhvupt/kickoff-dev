#!/bin/bash

# Build the app for macOS
echo "Building the app..."
npm run dist:mac

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "Build successful! Opening the app..."
    echo ""
    
    # Open the built app
    open "dist/mac/Image Minimizer.app"
    
    echo "App is now running independently!"
    echo "You can close this terminal/editor - the app will keep running."
else
    echo "Build failed. Please check the errors above."
    exit 1
fi

