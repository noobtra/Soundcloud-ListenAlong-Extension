# SoundCloud Listen Along - Chrome Extension

A Chrome extension that monitors SoundCloud playback and communicates with a desktop application via WebSocket. Originally designed to enable Discord listen-along functionality (though Discord's closed-source RPC limitations prevent full implementation).

## ⚠️ Project Status

This project has been **discontinued** due to Discord's activity sync and listen-along features being strictly closed source, making it impossible to interact with Discord's RPC to emulate the desired functionality.

## Features

- **Real-time Track Monitoring**: Automatically detects when tracks start playing on SoundCloud
- **Track Information Extraction**: Captures artist, title, artwork URL, track URL, and precise timing data
- **Remote Playback Control**: Allows external applications to trigger track playback via URLs
- **WebSocket Communication**: Establishes connection with desktop applications on `localhost:9005`
- **Deep Integration**: Hooks into SoundCloud's internal webpack modules for reliable functionality

## Related Components

This extension works in conjunction with a desktop application:

**🖥️ Desktop Application**: [SoundCloud Listen Along - Desktop App](https://github.com/noobtra/Soundcloud-ListenAlong-Client)

The desktop app handles Discord Rich Presence integration and provides the WebSocket server that this extension connects to. **Both components are required** for the system to function.

## Architecture

The extension consists of several components working together:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   background.js │◄──►│  scl_bridge.js   │◄──►│ contentScript.js│
│ (Service Worker)│    │ (Content Script) │    │ (Injected Code) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                              ┌─────────────────┐
│ WebSocket Client│                              │ SoundCloud DOM  │
│  (Port 9005)    │                              │ & Internal APIs │
└─────────────────┘                              └─────────────────┘
```

## File Structure

### Core Files

- **`background.js`** - Service worker managing WebSocket connections and message routing
- **`websocket-client.js`** - WebSocket client class for desktop app communication
- **`scl_bridge.js`** - Content script bridging extension and main world contexts
- **`contentScript.js`** - Main injection script that hooks into SoundCloud's internals

### Configuration Files

- **`manifest.json`** - Extension manifest (not provided, but required)

## How It Works

### 1. SoundCloud Integration

The extension injects `contentScript.js` into SoundCloud pages, which:

- **Webpack Hooking**: Intercepts webpack module loading to find SoundCloud's internal functions
- **Function Overriding**: Hooks `playCurrent` to detect track changes
- **Model Extraction**: Captures track model constructors for remote playback
- **Data Extraction**: Pulls track metadata including precise timing information

### 2. Track Monitoring

When a track starts playing, the extension captures:

```javascript
{
  artist: "Artist Name",
  title: "Track Title", 
  start_time: 1640995200000,  // Unix timestamp when track started
  end_time: 1640995380000,    // Unix timestamp when track will end
  artwork_url: "https://...",
  track_url: "https://soundcloud.com/..."
}
```

### 3. Communication Flow

1. **Track Detection**: `contentScript.js` detects playback changes
2. **Message Bridging**: `scl_bridge.js` forwards messages between contexts
3. **WebSocket Relay**: `background.js` sends data to desktop app via WebSocket
4. **Remote Control**: Desktop app can send track URLs back to trigger playback

## Installation

1. **Clone/Download** this repository
2. **Create manifest.json** with appropriate permissions:
   ```json
   {
     "manifest_version": 3,
     "name": "SoundCloud Listen Along",
     "version": "1.0",
     "background": {
       "service_worker": "background.js"
     },
     "content_scripts": [{
       "matches": ["*://*.soundcloud.com/*"],
       "js": ["scl_bridge.js"],
       "run_at": "document_start"
     }],
     "web_accessible_resources": [{
       "resources": ["contentScript.js"],
       "matches": ["*://*.soundcloud.com/*"]
     }],
     "permissions": ["activeTab", "tabs"]
   }
   ```
3. **Load Extension** in Chrome Developer Mode
4. **Start Desktop App** (listening on port 9005)
5. **Open SoundCloud** and play tracks

## API Reference

### WebSocket Messages

#### Outgoing (Extension → Desktop)
```javascript
{
  type: "WS_SEND_TRACK",
  data: {
    artist: string,
    title: string,
    start_time: number,    // Unix timestamp (ms)
    end_time: number,      // Unix timestamp (ms) 
    artwork_url: string,
    track_url: string
  }
}
```

#### Incoming (Desktop → Extension)
```javascript
{
  type: "WS_PLAY_TRACK",
  data: {
    trackUrl: string  // SoundCloud track URL
  }
}
```

### Exposed Window Functions

The extension exposes several functions for debugging/testing:

- `window.callGetQueue()` - Get current playback queue
- `window.callAddExplicitQueueItem(item)` - Add item to queue
- `window.callGetCurrentQueueItem()` - Get current queue item
- `window.callPlayAudible(model)` - Start track playback
- `window.callPrepareModel(data)` - Create track model from data

## Technical Details

### SoundCloud Hooking Strategy

The extension uses sophisticated techniques to integrate with SoundCloud:

1. **Webpack Interception**: Hooks `webpackJsonp.push` to scan loaded modules
2. **Function Discovery**: Searches modules for specific function signatures
3. **Runtime Binding**: Captures and binds internal functions for later use
4. **Model Constructor**: Extracts track model constructor for creating playable instances

### Timing Precision

Track timing calculations account for:
- Current playback position when track starts
- Total track duration
- Precise Unix timestamps for synchronization

### Error Handling

- Graceful handling of SoundCloud internal changes
- WebSocket reconnection logic with 2.5-second intervals
- Silent error handling for playback operations

## Limitations

- **Discord Integration Blocked**: Cannot integrate with Discord's closed-source RPC
- **SoundCloud Dependencies**: Relies on SoundCloud's internal structure (may break with updates)
- **Single-User**: No multi-user synchronization capabilities
- **Chrome Only**: Extension format specific to Chromium browsers

## Development Notes

### Debugging

Enable Chrome Developer Tools console to see:
- WebSocket connection status
- Track detection events
- Module hooking progress
- Error messages

### SoundCloud Updates

If SoundCloud updates break functionality:
1. Check console for webpack hooking errors
2. Inspect module structure changes
3. Update function signatures in `searchModuleForFunctions`

## License

MIT License

Copyright (c) 2025 noobtra

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Contributing

This project is discontinued, but the code serves as a reference for:
- Chrome extension development
- WebSocket communication patterns
- Advanced DOM injection techniques
- Webpack module interception
- SoundCloud API reverse engineering

---

**Note**: This extension demonstrates advanced browser automation techniques and should be used responsibly in accordance with SoundCloud's Terms of Service.