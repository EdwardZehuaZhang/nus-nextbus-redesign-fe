# Console Monitoring Scripts

This directory contains scripts to help monitor and analyze console logs from the Expo development server.

## Usage with GitHub Copilot

You can ask GitHub Copilot to check your browser console at any time:

**Commands you can use:**
- "Check for browser console errors"
- "Show me the browser console logs"
- "Are there any network errors?"
- "Run an accessibility audit"
- "Run a performance audit"

## Manual Usage

### 1. Start the Development Server
```powershell
npm run dev
```

### 2. Open Web App
Navigate to http://localhost:8081 in your browser

### 3. Use VS Code Debugging

#### Option A: Chrome DevTools Integration
1. Press `F5` or go to Run and Debug panel
2. Select "Debug Web (Chrome)" or "Debug Web (Edge)"
3. VS Code will launch the browser and connect to it
4. Console logs will appear in VS Code's Debug Console
5. Set breakpoints directly in VS Code

#### Option B: Browser Tools MCP (via Copilot)
Just ask me in the chat:
- "Check console errors"
- "Show network logs"
- "Run performance audit"

## Features

### What You Get:
✅ **Console logs in VS Code Debug Console** - All `console.log`, `console.error`, etc. appear in VS Code  
✅ **Breakpoint debugging** - Set breakpoints in your TypeScript/JavaScript files  
✅ **Source maps** - Debug your original source code, not bundled code  
✅ **Network monitoring** - via Browser Tools MCP  
✅ **Performance audits** - via Browser Tools MCP  
✅ **Error tracking** - Errors show up in VS Code Problems panel  

## Troubleshooting

### Debug Console Not Showing Logs?
1. Make sure you started debugging (F5)
2. Check that the browser launched successfully
3. Verify `http://localhost:8081` is accessible

### Can't Set Breakpoints?
1. Ensure source maps are enabled in your build
2. Check that the file paths match your workspace
3. Try restarting the debug session

### Browser Tools MCP Not Working?
1. Ensure you have the browser open at `http://localhost:8081`
2. The page must be loaded before checking logs
3. Ask me to "take a screenshot" to verify the page is loaded
