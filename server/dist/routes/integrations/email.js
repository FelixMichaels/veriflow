"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mailparser_1 = require("mailparser");
const nodemailer_1 = require("nodemailer");
const verification_1 = require("../verification");
const sessionStorage_1 = require("../../utils/sessionStorage");
const router = express_1.default.Router();
// Simple tenant-specific email webhook
router.post('/webhook/:tenantId', async (req, res) => {
    const { tenantId } = req.params;
    try {
        let emailData;
        // Handle different email service formats
        if (req.body.provider === 'mailgun') {
            emailData = await parseMailgunWebhook(req.body);
        }
        else if (req.body.provider === 'sendgrid') {
            emailData = await parseSendGridWebhook(req.body);
        }
        else {
            // Generic email webhook format
            emailData = req.body;
        }
        const session = await processIncomingEmailForTenant(emailData, tenantId);
        if (session) {
            // Send tenant-branded confirmation email
            await sendTenantConfirmationEmail(emailData.from, session, tenantId);
        }
        res.json({ success: true, sessionId: session?.id });
    }
    catch (error) {
        console.error('Email webhook error:', error);
        res.status(500).json({ error: 'Failed to process email' });
    }
});
// Direct email parsing endpoint
router.post('/parse', async (req, res) => {
    try {
        const { rawEmail } = req.body;
        const parsed = await (0, mailparser_1.simpleParser)(rawEmail);
        const emailData = {
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            subject: parsed.subject || '',
            text: parsed.text || '',
            html: parsed.html || '',
            date: parsed.date,
            messageId: parsed.messageId
        };
        const session = await processIncomingEmailForTenant(emailData, 'default');
        res.json({ success: true, session });
    }
    catch (error) {
        console.error('Email parsing error:', error);
        res.status(500).json({ error: 'Failed to parse email' });
    }
});
async function processIncomingEmailForTenant(emailData, tenantId) {
    // Verify tenant exists and has email integration enabled
    const tenant = await getTenantConfig(tenantId);
    if (!tenant?.emailEnabled) {
        throw new Error(`Email integration not enabled for tenant: ${tenantId}`);
    }
    // Extract verification request details from email
    const requestInfo = await extractVerificationRequest(emailData);
    if (!requestInfo.isVerificationRequest) {
        console.log('Email does not appear to be a verification request');
        return null;
    }
    // Create verification session with tenant context
    const session = await createVerificationSession({
        employeeName: requestInfo.employeeName,
        employeeEmail: requestInfo.employeeEmail,
        tenantId: tenantId,
        ticket: {
            id: `email-${tenantId}-${Date.now()}`,
            title: requestInfo.subject,
            description: emailData.text,
            source: 'email'
        },
        requestedBy: {
            email: emailData.from,
            method: 'email'
        },
        priority: requestInfo.priority,
        metadata: {
            originalEmailId: emailData.messageId,
            receivedAt: emailData.date,
            tenantDomain: tenant.domain
        }
    });
    return session;
}
async function extractVerificationRequest(emailData) {
    const subject = emailData.subject.toLowerCase();
    const body = emailData.text.toLowerCase();
    const fullText = `${subject} ${body}`;
    // Check if this is a verification request
    const verificationKeywords = [
        'password reset', 'account locked', 'mfa', '2fa',
        'authentication', 'login issue', 'forgot password',
        'identity verification', 'verify identity', 'account recovery',
        'locked out', 'cant login', 'access issue'
    ];
    const isVerificationRequest = verificationKeywords.some(keyword => fullText.includes(keyword));
    if (!isVerificationRequest) {
        return { isVerificationRequest: false };
    }
    // Extract employee information
    const employeeInfo = await extractEmployeeInfo(emailData);
    // Determine priority based on keywords
    const priority = determinePriority(fullText);
    return {
        isVerificationRequest: true,
        employeeName: employeeInfo.name,
        employeeEmail: employeeInfo.email,
        subject: emailData.subject,
        priority: priority,
        requestType: classifyRequestType(fullText)
    };
}
async function extractEmployeeInfo(emailData) {
    // Try to extract employee info from email
    const fromEmail = parseEmailAddress(emailData.from);
    // Look for employee information in email body
    const emailLines = emailData.text.split('\n');
    let employeeName = '';
    let employeeEmail = fromEmail.email;
    // Common patterns for employee info in emails - more specific order
    const namePatterns = [
        // Bullet point patterns (- Name: Jessica Williams)
        /[-•*]\s*name\s*[:=]\s*(.+)/i,
        /[-•*]\s*user\s*[:=]\s*(.+)/i,
        /[-•*]\s*employee\s*[:=]\s*(.+)/i,
        // Direct colon patterns (Name: Jessica Williams)
        /^name\s*[:=]\s*(.+)/i,
        /^user\s*[:=]\s*(.+)/i,
        /^employee\s*[:=]\s*(.+)/i,
        /^full\s*name\s*[:=]\s*(.+)/i,
        // Email signature patterns - capture proper names
        /^([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)$/i,
        // Role/department patterns (capture name before roles)
        /^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*[-\n]\s*(director|manager|engineer|developer|analyst|coordinator|specialist|admin|ceo|cto|cfo)/i
    ];
    const emailPatterns = [
        /email[:\s]+([^\s@]+@[^\s@]+\.[^\s@]+)/i,
        /address[:\s]+([^\s@]+@[^\s@]+\.[^\s@]+)/i
    ];
    // Extract name with improved parsing - better validation
    for (const line of emailLines) {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.length < 5)
            continue;
        // Skip common greeting/intro/signature lines
        if (/^(hi|hello|dear|urgent|please|i|my|this|the|best|regards|sincerely|thanks|thank you|yours)/i.test(cleanLine)) {
            continue;
        }
        for (const pattern of namePatterns) {
            const match = cleanLine.match(pattern);
            if (match && match[1]) {
                let extractedName = match[1].trim();
                // Clean up the extracted name
                extractedName = extractedName
                    .replace(/^[-•*\s]+/, '') // Remove bullet points
                    .replace(/\s*[-\n].*$/, '') // Remove everything after dash or newline
                    .replace(/\s*\(.*\).*$/, '') // Remove parenthetical info
                    .replace(/[,:;].*$/, '') // Remove everything after comma, colon, semicolon
                    .replace(/^\s*mr\.?\s+|^\s*ms\.?\s+|^\s*mrs\.?\s+|^\s*dr\.?\s+/i, '') // Remove titles
                    .trim();
                // Better validation for real names
                const words = extractedName.split(/\s+/).filter(w => w.length > 1);
                const isValidName = extractedName.length >= 4 &&
                    words.length >= 2 &&
                    words.length <= 4 &&
                    words.every(word => /^[A-Za-z][a-z]*$/.test(word)) &&
                    !extractedName.toLowerCase().includes('support') &&
                    !extractedName.toLowerCase().includes('team') &&
                    !extractedName.toLowerCase().includes('details') &&
                    !extractedName.toLowerCase().includes('user') &&
                    !extractedName.toLowerCase().includes('employee');
                if (isValidName) {
                    // Ensure proper case
                    employeeName = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                    break;
                }
            }
        }
        if (employeeName)
            break;
    }
    // Extract email if different from sender
    for (const line of emailLines) {
        for (const pattern of emailPatterns) {
            const match = line.match(pattern);
            if (match && match[1].trim()) {
                employeeEmail = match[1].trim();
                break;
            }
        }
    }
    // Fallback to sender's info
    if (!employeeName) {
        employeeName = fromEmail.name || extractNameFromEmail(employeeEmail);
    }
    return {
        name: employeeName,
        email: employeeEmail
    };
}
function parseEmailAddress(emailString) {
    const match = emailString.match(/^(.+?)\s*<(.+)>$/) || emailString.match(/^(.+)$/);
    if (match) {
        if (match[2]) {
            return { name: match[1].trim(), email: match[2].trim() };
        }
        else {
            return { name: '', email: match[1].trim() };
        }
    }
    return { name: '', email: emailString };
}
function determinePriority(text) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const highKeywords = ['important', 'soon', 'priority', 'locked out'];
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
        return 'high';
    }
    if (highKeywords.some(keyword => text.includes(keyword))) {
        return 'medium';
    }
    return 'low';
}
function classifyRequestType(text) {
    if (text.includes('password'))
        return 'password_reset';
    if (text.includes('mfa') || text.includes('2fa'))
        return 'mfa_reset';
    if (text.includes('locked') || text.includes('login'))
        return 'account_unlock';
    return 'general_verification';
}
async function sendConfirmationEmail(to, session) {
    const transporter = (0, nodemailer_1.createTransport)({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    const mailOptions = {
        from: process.env.VERIFLOW_EMAIL,
        to: to,
        subject: 'VeriFlow: Identity Verification Request Received',
        html: `
            <h2>VeriFlow Identity Verification</h2>
            <p>Your identity verification request has been received and processed.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Session Details:</strong><br>
                Session ID: ${session.id}<br>
                Status: ${session.status}<br>
                Employee: ${session.employeeName}<br>
                Email: ${session.employeeEmail}
            </div>
            
            <p>You will receive a follow-up email when your verification session is scheduled.</p>
            
            <p>If you need immediate assistance, please contact IT support.</p>
            
            <hr>
            <small>This is an automated message from VeriFlow Identity Verification System.</small>
        `
    };
    await transporter.sendMail(mailOptions);
}
// Webhook parsers for different email services
async function parseMailgunWebhook(data) {
    return {
        from: data.sender,
        to: data.recipient,
        subject: data.subject,
        text: data['body-plain'],
        html: data['body-html'],
        date: new Date(data.timestamp * 1000),
        messageId: data['Message-Id']
    };
}
async function parseSendGridWebhook(data) {
    return {
        from: data.from,
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
        date: new Date(data.timestamp),
        messageId: data.messageId
    };
}
function extractNameFromEmail(email) {
    const localPart = email.split('@')[0];
    // Handle common email formats
    let name = localPart
        .replace(/[._-]/g, ' ') // Replace separators with spaces
        .replace(/\d+/g, '') // Remove numbers
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .trim();
    // Convert to proper case (first letter of each word capitalized)
    name = name.replace(/\b\w/g, l => l.toUpperCase());
    // If we have multiple words, assume it's first.last or first_last format
    const words = name.split(' ').filter(word => word.length > 1);
    if (words.length >= 2) {
        return words.join(' ');
    }
    else if (words.length === 1) {
        // Single word - might be firstnamelastname format
        // For now, just return the single word capitalized
        return words[0];
    }
    return name || 'Unknown User';
}
async function getTenantConfig(tenantId) {
    // Get tenant configuration from database
    // This would be your actual tenant lookup
    return {
        id: tenantId,
        domain: `${tenantId}.com`,
        emailEnabled: true,
        companyName: `${tenantId} Corporation`
    };
}
async function sendTenantConfirmationEmail(to, session, tenantId) {
    const tenant = await getTenantConfig(tenantId);
    // Skip email sending if SMTP not configured (for local testing)
    if (!process.env.SMTP_HOST) {
        console.log('📧 Email confirmation skipped (SMTP not configured)');
        console.log(`📧 Would send confirmation to: ${to}`);
        console.log(`📧 Subject: ${tenant.companyName}: Identity Verification Request Received`);
        return;
    }
    const transporter = (0, nodemailer_1.createTransport)({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    const mailOptions = {
        from: `VeriFlow <noreply@${tenant.domain}>`,
        to: to,
        subject: `${tenant.companyName}: Identity Verification Request Received`,
        html: `
            <h2>${tenant.companyName} - VeriFlow Identity Verification</h2>
            <p>Your identity verification request has been received and processed.</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Session Details:</strong><br>
                Session ID: ${session.id}<br>
                Status: ${session.status}<br>
                Employee: ${session.employeeName}<br>
                Email: ${session.employeeEmail}
            </div>
            
            <p>You will receive a follow-up email when your verification session is scheduled.</p>
            
            <p>If you need immediate assistance, please contact IT support.</p>
            
            <hr>
            <small>This is an automated message from ${tenant.companyName} VeriFlow Identity Verification System.</small>
        `
    };
    await transporter.sendMail(mailOptions);
}
async function createVerificationSession(data) {
    // Create session that matches VeriFlow's exact format and add to live dashboard
    const session = {
        id: String(verification_1.mockSessions.length + 1),
        employeeName: data.employeeName,
        employeeEmail: data.employeeEmail,
        status: 'pending',
        idType: '',
        idNumber: '',
        notes: `📧 Created from email: ${data.ticket?.title || 'Email request'}`,
        videoCallLink: '',
        meetingPlatform: '',
        meetingDate: '',
        meetingTime: '',
        meetingStatus: 'not_scheduled',
        meetingId: '',
        meetingAgenda: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requestedByUser: {
            name: data.requestedBy?.method === 'email' ? `📧 ${data.tenantId}` : 'Email Integration'
        },
        assignedToId: '1', // Default to first admin
        assignedToUser: verification_1.mockUsers[0],
        ticket: {
            title: data.ticket?.title || 'Email Verification Request',
            priority: data.priority || 'medium',
            source: 'email',
            tenantId: data.tenantId
        },
        verificationChecklist: {
            photoIdPresented: false,
            nameMatches: false,
            faceMatches: false,
            documentAuthentic: false,
            notesRecorded: false
        }
    };
    // 🚀 Add to live VeriFlow dashboard with persistence!
    const savedSession = (0, sessionStorage_1.addSession)(session);
    (0, verification_1.refreshSessions)(); // Refresh in-memory sessions
    console.log('📧 ✅ Created verification session from email and added to dashboard:', {
        id: session.id,
        employee: session.employeeName,
        tenant: data.tenantId,
        ticket: session.ticket?.title
    });
    return session;
}
exports.default = router;
