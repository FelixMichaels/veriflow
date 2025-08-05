# VeriFlow Deployment Guide 🚀

## Quick Deploy to Production (30 minutes)

### Prerequisites
- GitHub account
- Netlify account (free)
- Railway account (free)

---

## Step 1: Deploy Backend to Railway

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial VeriFlow deployment"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose `/server` as the root directory
   - Railway will auto-detect Node.js and deploy

3. **Set Environment Variables in Railway**:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://YOUR_NETLIFY_SITE.netlify.app
   ```

4. **Get your Railway API URL**: 
   - Copy the URL (e.g., `https://veriflow-server-production.railway.app`)

---

## Step 2: Deploy Frontend to Netlify

1. **Update API URL in static-app.html**:
   - Replace `your-veriflow-api.railway.app` with your actual Railway URL

2. **Deploy on Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop your project folder
   - Or connect to GitHub repository

3. **Get your Netlify URL**:
   - Copy the URL (e.g., `https://veriflow-app.netlify.app`)

---

## Step 3: Configure CORS

1. **Update Railway Environment**:
   ```
   FRONTEND_URL=https://YOUR_ACTUAL_NETLIFY_URL.netlify.app
   ```

2. **Test the Connection**:
   - Visit your Netlify URL
   - Check if API calls work
   - Test email integration

---

## Step 4: Configure Email (Optional)

Add these to Railway environment:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Current Status ✅

- ✅ **Backend**: Production ready with Railway
- ✅ **Frontend**: Production ready with Netlify  
- ✅ **Email Integration**: Working with persistence
- ✅ **File Storage**: Persistent across deploys
- ✅ **Admin Settings**: Local storage persistence

---

## Next Steps

1. **Test thoroughly** with real users
2. **Add SSL certificates** (automatic with Railway/Netlify)
3. **Monitor performance** with Railway metrics
4. **Upgrade to database** (PostgreSQL) when ready
5. **Add more integrations** based on user feedback

---

## Troubleshooting

### CORS Issues
- Make sure `FRONTEND_URL` matches exactly in Railway
- Check browser console for CORS errors

### API Connection Issues  
- Verify Railway app is running (check logs)
- Test API health endpoint: `https://YOUR_RAILWAY_URL/health`

### Email Integration Issues
- Check Railway logs for email parsing errors  
- Verify webhook URLs are accessible

---

**🎉 Ready for production use!**