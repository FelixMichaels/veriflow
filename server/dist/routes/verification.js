"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockSessions = exports.mockUsers = void 0;
exports.refreshSessions = refreshSessions;
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const sessionStorage_1 = require("../utils/sessionStorage");
const router = express_1.default.Router();
// Load users and sessions from persistent storage
exports.mockUsers = (0, sessionStorage_1.loadUsers)();
exports.mockSessions = (0, sessionStorage_1.loadSessions)();
// Function to refresh sessions from storage
function refreshSessions() {
    exports.mockSessions.length = 0; // Clear array
    exports.mockSessions.push(...(0, sessionStorage_1.loadSessions)()); // Reload from storage
}
// Get all verification sessions with search and filtering  
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { search, status, assignedToId, meetingPlatform, dateFrom, dateTo, page = 1, limit = 10 } = req.query;
    let filteredSessions = [...exports.mockSessions];
    // Search functionality
    if (search) {
        const searchLower = search.toString().toLowerCase();
        filteredSessions = filteredSessions.filter(session => session.employeeName.toLowerCase().includes(searchLower) ||
            session.employeeEmail.toLowerCase().includes(searchLower) ||
            session.ticket?.title?.toLowerCase().includes(searchLower) ||
            session.assignedToUser?.name?.toLowerCase().includes(searchLower));
    }
    // Status filter
    if (status) {
        filteredSessions = filteredSessions.filter(session => session.status === status);
    }
    // Assignment filter
    if (assignedToId) {
        filteredSessions = filteredSessions.filter(session => session.assignedToId === assignedToId);
    }
    // Meeting platform filter
    if (meetingPlatform) {
        filteredSessions = filteredSessions.filter(session => session.meetingPlatform === meetingPlatform);
    }
    // Date range filter
    if (dateFrom) {
        const fromDate = new Date(dateFrom.toString());
        filteredSessions = filteredSessions.filter(session => new Date(session.createdAt) >= fromDate);
    }
    if (dateTo) {
        const toDate = new Date(dateTo.toString());
        toDate.setHours(23, 59, 59, 999); // End of day
        filteredSessions = filteredSessions.filter(session => new Date(session.createdAt) <= toDate);
    }
    // Pagination
    const pageNum = parseInt(page.toString());
    const limitNum = parseInt(limit.toString());
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex);
    res.json({
        success: true,
        data: paginatedSessions,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: filteredSessions.length,
            totalPages: Math.ceil(filteredSessions.length / limitNum),
        },
        filters: {
            search: search || '',
            status: status || '',
            assignedToId: assignedToId || '',
            meetingPlatform: meetingPlatform || '',
            dateFrom: dateFrom || '',
            dateTo: dateTo || ''
        }
    });
}));
// Get users/operators
router.get('/users', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({ success: true, data: exports.mockUsers });
}));
// Get single verification session
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const session = exports.mockSessions.find(s => s.id === req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            error: { error: 'NotFound', message: 'Session not found' },
        });
    }
    res.json({ success: true, data: session });
}));
// Create new verification session
router.post('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const newSession = {
        id: String(exports.mockSessions.length + 1),
        ...req.body,
        status: 'pending',
        idType: '',
        idNumber: '',
        notes: '',
        videoCallLink: '',
        meetingPlatform: '',
        meetingDate: '',
        meetingTime: '',
        meetingStatus: 'not_scheduled',
        meetingId: '',
        meetingAgenda: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        requestedByUser: { name: 'Admin User' },
        assignedToId: '1',
        assignedToUser: exports.mockUsers[0],
        ticket: { title: req.body.ticketTitle, priority: req.body.priority || 'medium' },
        verificationChecklist: {
            photoIdPresented: false,
            nameMatches: false,
            faceMatches: false,
            documentAuthentic: false,
            notesRecorded: false
        }
    };
    const savedSession = (0, sessionStorage_1.addSession)(newSession);
    refreshSessions(); // Refresh in-memory array
    res.status(201).json({ success: true, data: savedSession });
}));
// Update verification session
router.put('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const sessionIndex = exports.mockSessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
        return res.status(404).json({
            success: false,
            error: { error: 'NotFound', message: 'Session not found' },
        });
    }
    const currentSession = exports.mockSessions[sessionIndex];
    // Handle assignment changes
    let assignedToUser = currentSession.assignedToUser;
    if (req.body.assignedToId && req.body.assignedToId !== currentSession.assignedToId) {
        assignedToUser = exports.mockUsers.find(user => user.id === req.body.assignedToId) || currentSession.assignedToUser;
    }
    const updatedSession = {
        ...currentSession,
        ...req.body,
        assignedToUser,
        // Properly merge verification checklist
        verificationChecklist: req.body.verificationChecklist ? {
            ...currentSession.verificationChecklist,
            ...req.body.verificationChecklist
        } : currentSession.verificationChecklist,
        updatedAt: new Date().toISOString()
    };
    (0, sessionStorage_1.updateSession)(req.params.id, updatedSession);
    refreshSessions(); // Refresh in-memory array
    res.json({
        success: true,
        data: updatedSession,
        message: 'Verification session updated successfully'
    });
}));
// Schedule meeting for session
router.post('/:id/schedule-meeting', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { platform, date, time } = req.body;
    const sessionIndex = exports.mockSessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
        return res.status(404).json({
            success: false,
            error: { error: 'NotFound', message: 'Session not found' },
        });
    }
    // Generate meeting link based on platform
    let meetingLink = '';
    let meetingId = '';
    switch (platform) {
        case 'zoom':
            meetingId = Math.floor(Math.random() * 1000000000).toString();
            meetingLink = `https://zoom.us/j/${meetingId}`;
            break;
        case 'meet':
            meetingId = Math.random().toString(36).substring(2, 15);
            meetingLink = `https://meet.google.com/${meetingId}`;
            break;
        case 'teams':
            meetingId = Math.random().toString(36).substring(2, 15);
            meetingLink = `https://teams.microsoft.com/l/meetup-join/${meetingId}`;
            break;
        default:
            return res.status(400).json({
                success: false,
                error: { error: 'InvalidPlatform', message: 'Unsupported meeting platform' },
            });
    }
    const updatedSession = {
        ...exports.mockSessions[sessionIndex],
        meetingPlatform: platform,
        meetingDate: date,
        meetingTime: time,
        meetingStatus: 'scheduled',
        meetingId: meetingId,
        videoCallLink: meetingLink,
        meetingAgenda: `Identity Verification Session for ${exports.mockSessions[sessionIndex].employeeName}...`,
        updatedAt: new Date().toISOString()
    };
    exports.mockSessions[sessionIndex] = updatedSession;
    (0, sessionStorage_1.updateSession)(req.params.id, updatedSession);
    res.json({ success: true, data: updatedSession });
}));
// Cancel meeting for session
router.delete('/:id/meeting', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const sessionIndex = exports.mockSessions.findIndex(s => s.id === req.params.id);
    if (sessionIndex === -1) {
        return res.status(404).json({
            success: false,
            error: { error: 'NotFound', message: 'Session not found' },
        });
    }
    const updatedSession = {
        ...exports.mockSessions[sessionIndex],
        meetingPlatform: '',
        meetingDate: '',
        meetingTime: '',
        meetingStatus: 'not_scheduled',
        meetingId: '',
        videoCallLink: '',
        meetingAgenda: '',
        updatedAt: new Date().toISOString()
    };
    exports.mockSessions[sessionIndex] = updatedSession;
    (0, sessionStorage_1.updateSession)(req.params.id, updatedSession);
    res.json({ success: true, data: updatedSession });
}));
exports.default = router;
