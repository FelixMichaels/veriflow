import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Slack slash command handler
router.post('/slash-command', async (req, res) => {
    try {
        // Verify Slack request
        if (!verifySlackSignature(req)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { command, text, user_id, user_name, channel_id } = req.body;

        if (command === '/veriflow') {
            return await handleVeriFlowCommand(text, user_id, user_name, channel_id, res);
        }

        res.status(400).json({ error: 'Unknown command' });
    } catch (error) {
        console.error('Slack command error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Slack interactive components (buttons, modals)
router.post('/interactive', async (req, res) => {
    try {
        const payload = JSON.parse(req.body.payload);
        
        if (payload.type === 'block_actions') {
            return await handleBlockActions(payload, res);
        }
        
        if (payload.type === 'view_submission') {
            return await handleModalSubmission(payload, res);
        }

        res.json({ response_type: 'ephemeral', text: 'Unknown interaction' });
    } catch (error) {
        console.error('Slack interactive error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function handleVeriFlowCommand(text: string, userId: string, userName: string, channelId: string, res: any) {
    const args = text.trim().split(' ');
    const subCommand = args[0];

    switch (subCommand) {
        case 'request':
            return await createVerificationRequest(args.slice(1), userId, userName, res);
        case 'status':
            res.json({
                text: `📋 Verification Status: Not implemented yet - placeholder for command: /veriflow status ${args[1]}`,
                response_type: 'ephemeral'
            });
        case 'help':
        default:
            return res.json({
                response_type: 'ephemeral',
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: '*VeriFlow Commands:*\n• `/veriflow request [email]` - Request identity verification\n• `/veriflow status [session-id]` - Check verification status\n• `/veriflow help` - Show this help'
                        }
                    }
                ]
            });
    }
}

async function createVerificationRequest(args: string[], userId: string, userName: string, res: any) {
    const email = args[0];
    
    if (!email || !isValidEmail(email)) {
        return res.json({
            response_type: 'ephemeral',
            text: '❌ Please provide a valid email address: `/veriflow request user@company.com`'
        });
    }

    try {
        const session = await createVerificationSession({
            employeeEmail: email,
            employeeName: extractNameFromEmail(email),
            requestedBy: {
                slackUserId: userId,
                slackUserName: userName
            },
            ticket: {
                id: `slack-${Date.now()}`,
                title: `Identity verification requested by ${userName}`,
                source: 'slack'
            }
        });

        // Send message to channel with verification details
        const blocks = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `🔐 *Identity Verification Requested*\n*User:* ${email}\n*Session ID:* ${session.id}\n*Status:* ${session.status}`
                }
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'Schedule Meeting' },
                        style: 'primary',
                        action_id: 'schedule_meeting',
                        value: session.id
                    },
                    {
                        type: 'button',
                        text: { type: 'plain_text', text: 'View Details' },
                        action_id: 'view_details',
                        value: session.id
                    }
                ]
            }
        ];

        return res.json({
            response_type: 'in_channel',
            blocks: blocks
        });

    } catch (error) {
        return res.json({
            response_type: 'ephemeral',
            text: `❌ Failed to create verification request: ${error.message}`
        });
    }
}

async function handleBlockActions(payload: any, res: any) {
    const action = payload.actions[0];
    const sessionId = action.value;

    switch (action.action_id) {
        case 'schedule_meeting':
            return await showScheduleMeetingModal(payload, sessionId, res);
        case 'view_details':
            res.json({ text: `📋 Session Details: Placeholder for session ${sessionId}` });
        case 'approve_verification':
            res.json({ text: `✅ Session ${sessionId} marked as completed (placeholder)` });
        case 'reject_verification':
            res.json({ text: `❌ Session ${sessionId} marked as failed (placeholder)` });
        default:
            return res.json({ response_type: 'ephemeral', text: 'Unknown action' });
    }
}

async function showScheduleMeetingModal(payload: any, sessionId: string, res: any) {
    const modal = {
        type: 'modal',
        callback_id: 'schedule_meeting_modal',
        private_metadata: sessionId,
        title: { type: 'plain_text', text: 'Schedule Meeting' },
        submit: { type: 'plain_text', text: 'Schedule' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
            {
                type: 'section',
                text: { type: 'mrkdwn', text: `*Schedule verification meeting for Session: ${sessionId}*` }
            },
            {
                type: 'input',
                block_id: 'meeting_date',
                element: {
                    type: 'datepicker',
                    action_id: 'date_input',
                    placeholder: { type: 'plain_text', text: 'Select date' }
                },
                label: { type: 'plain_text', text: 'Meeting Date' }
            },
            {
                type: 'input',
                block_id: 'meeting_time',
                element: {
                    type: 'timepicker',
                    action_id: 'time_input',
                    placeholder: { type: 'plain_text', text: 'Select time' }
                },
                label: { type: 'plain_text', text: 'Meeting Time' }
            },
            {
                type: 'input',
                block_id: 'meeting_platform',
                element: {
                    type: 'static_select',
                    action_id: 'platform_select',
                    options: [
                        { text: { type: 'plain_text', text: 'Zoom' }, value: 'zoom' },
                        { text: { type: 'plain_text', text: 'Google Meet' }, value: 'google-meet' },
                        { text: { type: 'plain_text', text: 'Microsoft Teams' }, value: 'teams' }
                    ]
                },
                label: { type: 'plain_text', text: 'Platform' }
            }
        ]
    };

    // Open modal using Slack Web API
    await openSlackModal(payload.trigger_id, modal);
    return res.json({});
}

async function handleModalSubmission(payload: any, res: any) {
    const sessionId = payload.private_metadata;
    const values = payload.view.state.values;

    const meetingData = {
        date: values.meeting_date.date_input.selected_date,
        time: values.meeting_time.time_input.selected_time,
        platform: values.meeting_platform.platform_select.selected_option.value
    };

    try {
        await scheduleMeeting(sessionId, meetingData);
        
        // Send confirmation message
        await sendSlackMessage(payload.user.id, {
            text: `✅ Meeting scheduled for verification session ${sessionId}`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `✅ *Meeting Scheduled*\n*Session:* ${sessionId}\n*Date:* ${meetingData.date}\n*Time:* ${meetingData.time}\n*Platform:* ${meetingData.platform}`
                    }
                }
            ]
        });

        return res.json({});
    } catch (error) {
        return res.json({
            response_action: 'errors',
            errors: { meeting_date: 'Failed to schedule meeting. Please try again.' }
        });
    }
}

// Utility functions
function verifySlackSignature(req: any): boolean {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;
    const body = req.rawBody;

    if (!signature || !timestamp) return false;

    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!);
    hmac.update(`v0:${timestamp}:${body}`);
    const expectedSignature = `v0=${hmac.digest('hex')}`;

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractNameFromEmail(email: string): string {
    return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function openSlackModal(triggerId: string, modal: any) {
    // Implementation using Slack Web API
}

async function sendSlackMessage(userId: string, message: any) {
    // Implementation using Slack Web API
}

async function createVerificationSession(data: any) {
    // Create session in VeriFlow database
    return { id: 'session-123', status: 'pending' };
}

async function scheduleMeeting(sessionId: string, meetingData: any) {
    // Schedule meeting implementation
}

export default router;