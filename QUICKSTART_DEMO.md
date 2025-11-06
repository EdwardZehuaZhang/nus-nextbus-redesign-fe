# Quick Start Guide - Mobile Demo for Investors

## ✅ Implementation Complete!

The mobile demo wrapper has been successfully implemented. Here's what you can do now:

## 🚀 How to Use

### 1. **Start Your Development Server**
```bash
pnpm start
# or
pnpm web
```

### 2. **Test the Demo Locally**

**On Desktop:**
- Visit: `http://localhost:8081/demo`
- You should see your app inside a phone frame

**On Mobile Device:**
- Visit: `http://localhost:8081/demo`
- It will automatically redirect to the full app

### 3. **Deploy to Vercel**
Your demo routes will automatically be deployed with your app. No additional configuration needed!

### 4. **Share with Investors**

Once deployed to Vercel, share one of these URLs:

```
Option 1 (Recommended):
https://your-app.vercel.app/demo

Option 2 (Shorter):
https://your-app.vercel.app/investor
(This automatically redirects to /demo)

Option 3 (Direct app link):
https://your-app.vercel.app/?embed=1
(No frame, just the app)
```

## 📱 What Investors Will See

### On Desktop
- ✅ Your app displayed in a realistic iPhone frame (390x844px)
- ✅ iPhone notch at the top for realism
- ✅ Dark background with professional shadow
- ✅ Clean, professional presentation

### On Mobile
- ✅ Full-screen native app experience
- ✅ No frame (automatically detected and redirected)
- ✅ Full functionality

## 🎨 What Was Added

### New Files Created:
1. **`src/app/demo.tsx`** - Main demo page with phone frame
2. **`src/app/investor.tsx`** - Redirect page for clean investor URL
3. **`DEMO.md`** - Comprehensive documentation
4. **`QUICKSTART_DEMO.md`** - This file!

### Modified Files:
1. **`src/app/_layout.tsx`** - Added demo and investor routes
2. **`src/lib/utils.ts`** - Added `isEmbed()` and `isMobileDevice()` utilities

## 🧪 Testing Checklist

- [ ] Visit `/demo` on desktop browser
- [ ] Verify phone frame appears correctly
- [ ] Check that notch is visible at top
- [ ] Verify app loads inside frame
- [ ] Test on mobile device (should redirect to full app)
- [ ] Try `/investor` URL (should redirect to `/demo`)
- [ ] Verify `/?embed=1` works without frame

## 🔧 Customization

### Change Phone Size
Edit `src/app/demo.tsx`, line ~60:

```typescript
phoneFrame: {
  width: 390,  // Change this (iPhone 14)
  height: 844, // Change this
  // ... rest
}
```

Common sizes:
- iPhone 14: 390x844
- iPhone 14 Pro Max: 430x932
- Pixel 7: 412x915

### Change Frame Style
Edit the `styles` object in `src/app/demo.tsx`:
- `borderRadius`: Change corner roundness
- `boxShadow`: Adjust shadow effect
- `background.backgroundColor`: Change background color

## 💡 Pro Tips

### 1. **Email Template for Investors**
```
Subject: NUS NextBus Redesign - Mobile Demo

Hi [Name],

I'd love to show you our redesigned NUS NextBus app. 

View the demo here: https://your-app.vercel.app/demo

For the best experience:
- Desktop: You'll see the mobile UI in a phone frame
- Mobile: Opens as a full-screen app

Looking forward to your feedback!
```

### 2. **QR Code for Presentations**
Generate a QR code linking to `/demo` for easy mobile access during presentations:
- Use https://qr-code-generator.com
- Link to your Vercel demo URL

### 3. **Analytics Tracking**
Add tracking to see who views your demo:

```typescript
// In src/app/demo.tsx, add to useEffect:
useEffect(() => {
  // Your analytics code
  analytics.track('Demo Viewed', {
    device: isMobileDevice() ? 'mobile' : 'desktop',
  });
}, []);
```

## ⚠️ Important Notes

1. **No DevTools Required**: Investors don't need to open DevTools or change any settings
2. **Works on Any Device**: Automatically adapts to desktop or mobile
3. **No Changes to Main App**: Your production app is completely unchanged
4. **Safe to Share**: The demo URL is safe to share publicly

## 🐛 Troubleshooting

### Problem: Frame appears inside itself
**Solution:** Verify the iframe src includes `?embed=1`

### Problem: Mobile doesn't redirect
**Solution:** Check if user agent detection works on that device

### Problem: App doesn't load in frame
**Solution:** Check browser console for errors; verify app works at `/?embed=1`

## 📚 More Information

For detailed documentation, customization options, and advanced features, see:
- `DEMO.md` - Full documentation
- `src/app/demo.tsx` - Source code
- `src/lib/utils.ts` - Utility functions

## 🎉 You're Ready!

Your demo is ready to share with investors. Just deploy to Vercel and share the `/demo` URL!

**Need help?** Check `DEMO.md` or the source code comments.
