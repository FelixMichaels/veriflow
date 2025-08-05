# 🔐 VeriFlow - Identity Verification System

**Status**: ✅ **Production Ready for Quick Deploy**

VeriFlow is a secure identity verification platform for password resets and account recovery via video calls with government-issued photo ID verification.

## 🚀 Quick Deploy (30 minutes)

### Current Features
- ✅ **Email Integration**: Automatic session creation from emails
- ✅ **File Persistence**: Sessions survive server restarts  
- ✅ **Admin Dashboard**: User management and settings
- ✅ **Video Meeting Integration**: Zoom, Google Meet, Teams
- ✅ **Search & Filtering**: Find sessions quickly
- ✅ **Verification Checklist**: Standardized ID verification process

---

## 🎯 Deploy Now

### Option 1: Quick Deploy (Recommended)
Follow the **deployment-guide.md** for step-by-step instructions to deploy to:
- **Backend**: Railway.app (free tier)
- **Frontend**: Netlify.com (free tier)

### Option 2: Local Development
```bash
# Start backend
cd server
npm install
npm run dev

# Access frontend  
open static-app.html
```

---

## 📧 Email Integration

Send emails to your webhook endpoint to automatically create verification sessions:

```
POST https://your-api.railway.app/api/integrations/email/webhook/your-company
```

**Supported Email Formats**:
- Password reset requests
- Account lockout notifications  
- MFA reset requests
- General verification requests

---

## 🔐 Admin Features

- **User Management**: Add/remove operators
- **Session Management**: Assign, track, and update sessions
- **Branding**: Customize company name, logo, colors
- **Security Settings**: Audit trails, data retention
- **Integration Configuration**: Email, Slack, Zendesk (planned)

---

## 🎨 Usage Example

1. **Email arrives** requesting password reset
2. **VeriFlow creates** verification session automatically  
3. **Operator schedules** video call with user
4. **ID verification** completed via checklist
5. **Password reset** approved and documented

---

## 📊 Current Status

- **Architecture**: Node.js + Express + TypeScript backend, Static HTML + Tailwind frontend
- **Database**: File-based persistence (PostgreSQL upgrade planned)
- **Authentication**: Basic mock auth (Auth0 integration planned)
- **Deployment**: Railway + Netlify ready
- **Email**: Full parsing and session creation
- **Persistence**: Working file storage

---

## 🔄 Roadmap

### Phase 1: Core Platform ✅ DONE
- [x] Email integration  
- [x] Session management
- [x] Admin dashboard
- [x] File persistence

### Phase 2: Production Ready (Next)
- [ ] Database migration (PostgreSQL)
- [ ] Security hardening  
- [ ] Real authentication
- [ ] Performance monitoring

### Phase 3: Enhanced Integrations
- [ ] Slack bot integration
- [ ] Zendesk app integration
- [ ] Advanced analytics
- [ ] Mobile app

---

## 🛠️ Technical Stack

**Backend**: Node.js, Express, TypeScript, Winston, Helmet, CORS
**Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript  
**Email**: Mailparser, Nodemailer
**Deployment**: Railway, Netlify
**Storage**: File-based (upgrading to PostgreSQL)

---

## 🎉 Ready to Deploy!

**Next Step**: Follow `deployment-guide.md` to get VeriFlow live in production within 30 minutes.

Questions? Check the deployment guide or submit an issue!