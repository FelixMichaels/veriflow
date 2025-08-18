"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSessions = loadSessions;
exports.saveSessions = saveSessions;
exports.loadUsers = loadUsers;
exports.saveUsers = saveUsers;
exports.addSession = addSession;
exports.updateSession = updateSession;
// Simple file-based storage for development/testing
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const SESSIONS_FILE = path_1.default.join(__dirname, '../../data/sessions.json');
const USERS_FILE = path_1.default.join(__dirname, '../../data/users.json');
// Ensure data directory exists
const dataDir = path_1.default.dirname(SESSIONS_FILE);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
// Default data
const defaultSessions = [
    {
        id: '1',
        employeeName: 'John Doe',
        employeeEmail: 'john.doe@company.com',
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
        assignedToUser: { id: '1', name: 'Michael Rodriguez', email: 'michael@company.com', role: 'admin' },
        ticket: { title: 'Password Reset Request', priority: 'medium' },
        verificationChecklist: {
            photoIdPresented: false,
            nameMatches: false,
            faceMatches: false,
            documentAuthentic: false,
            notesRecorded: false
        }
    },
    {
        id: '2',
        employeeName: 'Sarah Johnson',
        employeeEmail: 'sarah.johnson@company.com',
        status: 'in_progress',
        idType: 'drivers_license',
        idNumber: '',
        notes: 'Scheduled for video verification',
        videoCallLink: 'https://meet.google.com/abc-defg-hij',
        meetingPlatform: 'meet',
        meetingDate: '2025-08-05',
        meetingTime: '10:30',
        meetingStatus: 'scheduled',
        meetingId: 'abc-defg-hij',
        meetingAgenda: 'Identity Verification Session for Sarah Johnson...',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
        requestedByUser: { name: 'IT Support' },
        assignedToId: '2',
        assignedToUser: { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'operator' },
        ticket: { title: 'MFA Reset Request', priority: 'high' },
        verificationChecklist: {
            photoIdPresented: true,
            nameMatches: true,
            faceMatches: false,
            documentAuthentic: false,
            notesRecorded: true
        }
    },
    {
        id: '3',
        employeeName: 'Alex Chen',
        employeeEmail: 'alex.chen@company.com',
        status: 'completed',
        idType: 'passport',
        idNumber: '',
        notes: 'Verification completed successfully. All checks passed.',
        videoCallLink: 'https://zoom.us/j/123456789',
        meetingPlatform: 'zoom',
        meetingDate: '2025-08-03',
        meetingTime: '14:00',
        meetingStatus: 'completed',
        meetingId: '123456789',
        meetingAgenda: 'Identity Verification Session for Alex Chen...',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        requestedByUser: { name: 'HR Department' },
        assignedToId: '3',
        assignedToUser: { id: '3', name: 'Alex Chen', email: 'alex@company.com', role: 'operator' },
        ticket: { title: 'Account Recovery Request', priority: 'low' },
        verificationChecklist: {
            photoIdPresented: true,
            nameMatches: true,
            faceMatches: true,
            documentAuthentic: true,
            notesRecorded: true
        }
    },
    {
        id: '4',
        employeeName: 'Emma Davis',
        employeeEmail: 'emma.davis@company.com',
        status: 'rejected',
        idType: 'drivers_license',
        idNumber: '',
        notes: 'ID verification failed. Document appears to be tampered.',
        videoCallLink: 'https://teams.microsoft.com/l/meetup-join/xyz',
        meetingPlatform: 'teams',
        meetingDate: '2025-08-04',
        meetingTime: '16:45',
        meetingStatus: 'completed',
        meetingId: 'teams-xyz-123',
        meetingAgenda: 'Identity Verification Session for Emma Davis...',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        requestedByUser: { name: 'Security Team' },
        assignedToId: '4',
        assignedToUser: { id: '4', name: 'Emma Davis', email: 'emma@company.com', role: 'admin' },
        ticket: { title: 'Emergency Access Request', priority: 'high' },
        verificationChecklist: {
            photoIdPresented: true,
            nameMatches: false,
            faceMatches: false,
            documentAuthentic: false,
            notesRecorded: true
        }
    },
    {
        id: '5',
        employeeName: 'Mike Wilson',
        employeeEmail: 'mike.wilson@company.com',
        status: 'escalated',
        idType: 'passport',
        idNumber: '',
        notes: 'Complex case requiring additional verification. Escalated to security team.',
        videoCallLink: '',
        meetingPlatform: '',
        meetingDate: '',
        meetingTime: '',
        meetingStatus: 'not_scheduled',
        meetingId: '',
        meetingAgenda: '',
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 259200000).toISOString(),
        requestedByUser: { name: 'Compliance Team' },
        assignedToId: '1',
        assignedToUser: { id: '1', name: 'Michael Rodriguez', email: 'michael@company.com', role: 'admin' },
        ticket: { title: 'Privileged Access Request', priority: 'high' },
        verificationChecklist: {
            photoIdPresented: true,
            nameMatches: true,
            faceMatches: true,
            documentAuthentic: true,
            notesRecorded: false
        }
    }
];
const defaultUsers = [
    { id: '1', name: 'Michael Rodriguez', email: 'michael@company.com', role: 'admin' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'operator' },
    { id: '3', name: 'Alex Chen', email: 'alex@company.com', role: 'operator' },
    { id: '4', name: 'Emma Davis', email: 'emma@company.com', role: 'admin' }
];
function loadSessions() {
    try {
        if (fs_1.default.existsSync(SESSIONS_FILE)) {
            const data = fs_1.default.readFileSync(SESSIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading sessions:', error);
    }
    // Return default sessions if file doesn't exist or has errors
    saveSessions(defaultSessions);
    return defaultSessions;
}
function saveSessions(sessions) {
    try {
        fs_1.default.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    }
    catch (error) {
        console.error('Error saving sessions:', error);
    }
}
function loadUsers() {
    try {
        if (fs_1.default.existsSync(USERS_FILE)) {
            const data = fs_1.default.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error loading users:', error);
    }
    // Return default users if file doesn't exist or has errors
    saveUsers(defaultUsers);
    return defaultUsers;
}
function saveUsers(users) {
    try {
        fs_1.default.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }
    catch (error) {
        console.error('Error saving users:', error);
    }
}
function addSession(session) {
    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);
    return session;
}
function updateSession(sessionId, updates) {
    const sessions = loadSessions();
    const index = sessions.findIndex((s) => s.id === sessionId);
    if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates, updatedAt: new Date().toISOString() };
        saveSessions(sessions);
        return sessions[index];
    }
    return null;
}
