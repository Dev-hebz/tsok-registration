# TSOK Registration - Static Version

## Hebz, TRY THIS - PURE STATIC!

Kini STATIC ra jud - no server.js, no backend complexity.

## What's This:

- Pure HTML/CSS/JavaScript
- Firebase directly from frontend
- Cloudinary directly from frontend
- NO server.js needed!
- NO vercel.json needed!
- Vercel auto-detects everything!

## Setup Firebase Config:

Edit `js/app.js` and `js/admin.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_ID",
    appId: "YOUR_APP_ID"
};
```

## Deploy:

```bash
# Just push to GitHub
git init
git add .
git commit -m "TSOK Registration"
git remote add origin YOUR_REPO
git push -u origin main

# Then in Vercel:
# Import from GitHub
# NO build command needed!
# NO environment variables needed!
# Just click Deploy!
```

## Why This Works:

- Vercel sees index.html = Static site
- No serverless functions = No crashes
- Direct Firebase connection = Fast
- Pure frontend = Simple!

**Try this Hebz - simplest possible!** 🌈
