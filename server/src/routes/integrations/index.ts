import express from 'express';
import zendeskRouter from './zendesk';
import slackRouter from './slack';
import emailRouter from './email';

const router = express.Router();

// Mount integration routes
router.use('/zendesk', zendeskRouter);
router.use('/slack', slackRouter);
router.use('/email', emailRouter);

// Integration status endpoint
router.get('/status', async (req, res) => {
    try {
        const integrations = await getIntegrationStatus();
        res.json({ integrations });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get integration status' });
    }
});

// Webhook verification endpoint
router.get('/webhook-verify/:service', (req, res) => {
    const { service } = req.params;
    const { challenge } = req.query;

    // Handle webhook verification for different services
    switch (service) {
        case 'zendesk':
            res.json({ challenge });
            break;
        case 'slack':
            res.json({ challenge });
            break;
        default:
            res.status(400).json({ error: 'Unknown service' });
    }
});

async function getIntegrationStatus() {
    return {
        zendesk: {
            enabled: !!process.env.ZENDESK_SUBDOMAIN,
            configured: !!(process.env.ZENDESK_USERNAME && process.env.ZENDESK_API_TOKEN),
            webhookUrl: `${process.env.VERIFLOW_API_URL}/api/integrations/zendesk/webhook`
        },
        slack: {
            enabled: !!process.env.SLACK_BOT_TOKEN,
            configured: !!(process.env.SLACK_SIGNING_SECRET && process.env.SLACK_BOT_TOKEN),
            webhookUrl: `${process.env.VERIFLOW_API_URL}/api/integrations/slack/slash-command`
        },
        email: {
            enabled: !!process.env.SMTP_HOST,
            configured: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
            webhookUrl: `${process.env.VERIFLOW_API_URL}/api/integrations/email/webhook`
        }
    };
}

export default router;