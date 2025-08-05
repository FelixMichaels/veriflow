import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Zendesk webhook endpoint
router.post('/webhook', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-zendesk-webhook-signature'] as string;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.ZENDESK_WEBHOOK_SECRET!)
            .update(JSON.stringify(req.body))
            .digest('base64');

        if (signature !== expectedSignature) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { ticket, type } = req.body;

        // Check if this is a ticket that needs verification
        if (type === 'ticket.created' || type === 'ticket.updated') {
            const needsVerification = checkIfNeedsVerification(ticket);
            
            if (needsVerification) {
                const session = await createVerificationSession({
                    employeeName: ticket.requester.name,
                    employeeEmail: ticket.requester.email,
                    ticket: {
                        id: ticket.id,
                        title: ticket.subject,
                        description: ticket.description,
                        source: 'zendesk'
                    },
                    priority: mapZendeskPriority(ticket.priority)
                });

                // Update Zendesk ticket with verification session ID
                await updateZendeskTicket(ticket.id, {
                    custom_field: { id: 'verification_session_id', value: session.id }
                });

                // Add comment to ticket
                await addZendeskComment(ticket.id, 
                    `🔐 Identity verification session created: ${session.id}\n` +
                    `Status: ${session.status}\n` +
                    `Link: ${process.env.VERIFLOW_URL}/session/${session.id}`
                );
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Zendesk webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create verification session from Zendesk ticket
router.post('/create-session', async (req, res) => {
    try {
        const { ticketId, requesterEmail, subject } = req.body;
        
        const session = await createVerificationSession({
            employeeName: req.body.requesterName,
            employeeEmail: requesterEmail,
            ticket: {
                id: ticketId,
                title: subject,
                source: 'zendesk'
            }
        });

        res.json({ success: true, sessionId: session.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function checkIfNeedsVerification(ticket: any): boolean {
    const verificationKeywords = [
        'password reset', 'account locked', 'mfa', '2fa', 'authentication',
        'login issue', 'forgot password', 'identity verification'
    ];
    
    const text = `${ticket.subject} ${ticket.description}`.toLowerCase();
    return verificationKeywords.some(keyword => text.includes(keyword));
}

function mapZendeskPriority(priority: string): string {
    const mapping = {
        'urgent': 'high',
        'high': 'high',
        'normal': 'medium',
        'low': 'low'
    };
    return mapping[priority] || 'medium';
}

async function updateZendeskTicket(ticketId: string, customField: any) {
    // Implementation for Zendesk API call
    // Use Zendesk SDK or REST API
}

async function addZendeskComment(ticketId: string, comment: string) {
    // Implementation for adding comment to Zendesk ticket
}

async function createVerificationSession(data: any) {
    // Create session in VeriFlow database
    // Return session object
    return { id: 'session-123', status: 'pending' };
}

export default router;