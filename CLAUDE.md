# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/Edge browser extension that implements mouse gesture functionality for Mac users. The extension provides classic right-click mouse gestures with additional calculator and translation tools.

## Extension Architecture

The extension follows a standard Chrome Extension Manifest V3 architecture with multiple components:

### Core Components

1. **Background Service Worker** (`background.js`)
   - Handles gesture recognition logic and action execution
   - Manages gesture mappings and configurations
   - Contains the `GestureActionManager` class for gesture-to-action mapping
   - Processes mouse coordinates and calculates movement directions
   - Imports and uses mathjs library for calculator functionality

2. **Content Scripts**
   - `content.js`: Main content script for gesture tracking and UI rendering
   - `iframe-content.js`: Handles gesture events within iframes using postMessage API

3. **Options Page** (`options.html` + `options.js`)
   - User interface for configuring gesture settings
   - Customizable track color, brush width, and tooltip display
   - Gesture action mapping configuration

4. **Popup Content** (`popup-content.html`)
   - Provides calculator and translation UI components
   - Dynamically injected when triggered by gestures

### Key Features

- **Multi-directional gestures**: Up, Down, Left, Right, and combination gestures
- **Visual feedback**: Canvas-based gesture trail rendering with customizable colors
- **Calculator integration**: Uses mathjs library for mathematical calculations
- **Translation service**: Integrated translation with automatic language detection
- **Cross-frame support**: Works within iframes through postMessage communication
- **Persistent settings**: Uses chrome.storage.sync for configuration storage

### Gesture System

The extension uses a coordinate-based direction calculation system:
- Tracks mouse movement points during right-click drag
- Calculates bearing angles between consecutive points
- Maps angles to cardinal directions (Up=0, Right=1, Down=2, Left=3)
- Supports complex gesture combinations (e.g., Down→Right for tab close)

### Development Commands

Since this is a browser extension project, development involves:

1. **Loading the extension**:
   - Open Edge browser
   - Navigate to `edge://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project directory

2. **Testing changes**:
   - Make code changes
   - Click the "Reload" button in the extensions page
   - Test gestures on web pages

3. **Debugging**:
   - Use browser DevTools for content script debugging
   - Use Extensions DevTools for background script debugging
   - Check console logs in both contexts

### File Dependencies

- `libs/math.min.js`: Mathematical expression evaluation
- `libs/translate.min.js`: Translation service functionality
- Both libraries are loaded dynamically and cached per tab

### Configuration Storage

The extension uses `chrome.storage.sync` for:
- Custom gesture mappings (`customGestures`)
- Visual settings (`trackColor`, `brushWidth`, `isShowTips`)
- Settings are synchronized across devices when user is signed into Chrome/Edge

### Cross-Origin Considerations

The extension handles both same-origin and cross-origin iframes:
- Same-origin: Direct event listener attachment
- Cross-origin: PostMessage-based communication through `iframe-content.js`

## Important Implementation Notes

- The extension prevents default context menu on single right-click but allows it on double right-click
- Canvas rendering uses device pixel ratio for high-DPI display support
- Gesture trail is limited to 100 points for performance
- Direction changes are only recorded when movement threshold (10px) is exceeded
- Translation automatically detects Chinese vs English and translates accordingly