/**
 * Browser Console Monitor
 * 
 * This script helps you monitor browser console logs and errors
 * from your Expo web app during development.
 * 
 * Usage:
 * 1. Start your Expo dev server: npm run dev
 * 2. Open http://localhost:8081 in your browser
 * 3. Ask GitHub Copilot: "Check browser console errors"
 * 
 * Available Copilot commands:
 * - "Check browser console errors"
 * - "Show browser console logs"
 * - "Check network errors"
 * - "Show network logs"
 * - "Take a screenshot"
 * - "Run accessibility audit"
 * - "Run performance audit"
 * - "Run SEO audit"
 */

// This file serves as documentation for the Browser Tools MCP integration
// The actual functionality is provided by the MCP server

console.log('Browser Console Monitor loaded');
console.log('Ask GitHub Copilot to check console errors at any time!');

// Example error tracking you can add to your app:
export const setupErrorTracking = () => {
  // Track unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
};

// Example usage in your app entry point:
// import { setupErrorTracking } from './.vscode/browser-console-monitor';
// setupErrorTracking();
