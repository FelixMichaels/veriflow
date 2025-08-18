import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { loadSessions, saveSessions, loadUsers, addSession, updateSession } from '../utils/sessionStorage';

const router = express.Router();

// Load users and sessions from persistent storage
export const mockUsers = loadUsers();
export let mockSessions = loadSessions();

// Function to refresh sessions from storage
export function refreshSessions() {
  mockSessions.length = 0; // Clear array
  mockSessions.push(...loadSessions()); // Reload from storage
}

// Get all verification sessions with search and filtering  
router.get('/', asyncHandler(async (req, res) => {
  const { 
    search, 
    status, 
    assignedToId, 
    meetingPlatform, 
    dateFrom, 
    dateTo,
    page = 1, 
    limit = 10 
  } = req.query;

  let filteredSessions = [...mockSessions];

  // Search functionality
  if (search) {
    const searchLower = search.toString().toLowerCase();
    filteredSessions = filteredSessions.filter(session => 
      session.employeeName.toLowerCase().includes(searchLower) ||
      session.employeeEmail.toLowerCase().includes(searchLower) ||
      session.ticket?.title?.toLowerCase().includes(searchLower) ||
      session.assignedToUser?.name?.toLowerCase().includes(searchLower)
    );
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
    filteredSessions = filteredSessions.filter(session => 
      new Date(session.createdAt) >= fromDate
    );
  }

  if (dateTo) {
    const toDate = new Date(dateTo.toString());
    toDate.setHours(23, 59, 59, 999); // End of day
    filteredSessions = filteredSessions.filter(session => 
      new Date(session.createdAt) <= toDate
    );
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
router.get('/users', asyncHandler(async (req, res) => {
  res.json({ success: true, data: mockUsers });
}));

// Get single verification session
router.get('/:id', asyncHandler(async (req, res) => {
  const session = mockSessions.find(s => s.id === req.params.id);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: { error: 'NotFound', message: 'Session not found' },
    });
  }

  res.json({ success: true, data: session });
}));

// Create new verification session
router.post('/', asyncHandler(async (req, res) => {
  const newSession = {
    id: String(mockSessions.length + 1),
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
    assignedToUser: mockUsers[0],
    ticket: { title: req.body.ticketTitle, priority: req.body.priority || 'medium' },
    verificationChecklist: {
      photoIdPresented: false,
      nameMatches: false,
      faceMatches: false,
      documentAuthentic: false,
      notesRecorded: false
    }
  };
  
  const savedSession = addSession(newSession);
  refreshSessions(); // Refresh in-memory array
  res.status(201).json({ success: true, data: savedSession });
}));

// Update verification session
router.put('/:id', asyncHandler(async (req, res) => {
  const sessionIndex = mockSessions.findIndex(s => s.id === req.params.id);
  if (sessionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { error: 'NotFound', message: 'Session not found' },
    });
  }

  const currentSession = mockSessions[sessionIndex];
  
  // Handle assignment changes
  let assignedToUser = currentSession.assignedToUser;
  if (req.body.assignedToId && req.body.assignedToId !== currentSession.assignedToId) {
    assignedToUser = mockUsers.find(user => user.id === req.body.assignedToId) || currentSession.assignedToUser;
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
  
  updateSession(req.params.id, updatedSession);
  refreshSessions(); // Refresh in-memory array
  res.json({ 
    success: true, 
    data: updatedSession,
    message: 'Verification session updated successfully'
  });
}));

// Schedule meeting for session
router.post('/:id/schedule-meeting', asyncHandler(async (req, res) => {
  const { platform, type = 'scheduled', date, time } = req.body;
  
  const sessionIndex = mockSessions.findIndex(s => s.id === req.params.id);
  if (sessionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { error: 'NotFound', message: 'Session not found' },
    });
  }

  // Validate required fields based on meeting type
  if (!platform) {
    return res.status(400).json({
      success: false,
      error: { error: 'MissingPlatform', message: 'Meeting platform is required' },
    });
  }

  if (type === 'scheduled' && (!date || !time)) {
    return res.status(400).json({
      success: false,
      error: { error: 'MissingDateTime', message: 'Date and time are required for scheduled meetings' },
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

  // Set meeting status and scheduled time
  let meetingStatus = type === 'instant' ? 'active' : 'scheduled';
  let scheduledAt = null;
  
  if (type === 'scheduled' && date && time) {
    // Combine date and time into ISO string
    scheduledAt = new Date(`${date}T${time}`).toISOString();
  } else if (type === 'instant') {
    // For instant meetings, set scheduled time to now
    scheduledAt = new Date().toISOString();
  }

  const updatedSession = {
    ...mockSessions[sessionIndex],
    meetingPlatform: platform,
    meetingType: type,
    meetingDate: date || null,
    meetingTime: time || null,
    meetingStatus: meetingStatus,
    meetingId: meetingId,
    videoCallLink: meetingLink,
    videoMeetingLink: meetingLink, // Add both field names for compatibility
    videoMeetingPlatform: platform,
    scheduledAt: scheduledAt,
    meetingAgenda: `Identity Verification Session for ${mockSessions[sessionIndex].employeeName}`,
    updatedAt: new Date().toISOString()
  };

  mockSessions[sessionIndex] = updatedSession;
  updateSession(req.params.id, updatedSession);

  res.json({ success: true, data: updatedSession });
}));

// Cancel meeting for session
router.delete('/:id/meeting', asyncHandler(async (req, res) => {
  const sessionIndex = mockSessions.findIndex(s => s.id === req.params.id);
  if (sessionIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { error: 'NotFound', message: 'Session not found' },
    });
  }

  const updatedSession = {
    ...mockSessions[sessionIndex],
    meetingPlatform: '',
    meetingType: '',
    meetingDate: '',
    meetingTime: '',
    meetingStatus: 'not_scheduled',
    meetingId: '',
    videoCallLink: '',
    videoMeetingLink: '', // Clear both field names
    videoMeetingPlatform: '',
    scheduledAt: null,
    meetingAgenda: '',
    updatedAt: new Date().toISOString()
  };

  mockSessions[sessionIndex] = updatedSession;
  updateSession(req.params.id, updatedSession);

  res.json({ success: true, data: updatedSession });
}));

export default router;