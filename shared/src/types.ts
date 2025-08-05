import { z } from 'zod';

// User types
export const UserRole = z.enum(['admin', 'operator']);
export type UserRole = z.infer<typeof UserRole>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

// Verification Session types
export const VerificationStatus = z.enum([
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'failed',
  'cancelled'
]);
export type VerificationStatus = z.infer<typeof VerificationStatus>;

export const IDType = z.enum([
  'drivers_license',
  'passport',
  'state_id',
  'military_id',
  'other'
]);
export type IDType = z.infer<typeof IDType>;

export const VerificationSessionSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string(),
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  requestedBy: z.string().uuid(), // User ID
  status: VerificationStatus,
  scheduledAt: z.date().optional(),
  completedAt: z.date().optional(),
  videoMeetingLink: z.string().url().optional(),
  videoMeetingPlatform: z.enum(['zoom', 'google_meet', 'teams', 'other']).optional(),
  notes: z.string().optional(),
  verificationDetails: z.object({
    idType: IDType.optional(),
    idVerified: z.boolean().optional(),
    faceMatchVerified: z.boolean().optional(),
    nameMatchVerified: z.boolean().optional(),
    verificationNotes: z.string().optional(),
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type VerificationSession = z.infer<typeof VerificationSessionSchema>;

// Ticket types
export const TicketStatus = z.enum([
  'open',
  'in_progress',
  'waiting_for_verification',
  'resolved',
  'closed'
]);
export type TicketStatus = z.infer<typeof TicketStatus>;

export const TicketPriority = z.enum(['low', 'medium', 'high', 'urgent']);
export type TicketPriority = z.infer<typeof TicketPriority>;

export const TicketSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  status: TicketStatus,
  priority: TicketPriority,
  assignedTo: z.string().uuid().optional(),
  verificationSessionId: z.string().uuid().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Ticket = z.infer<typeof TicketSchema>;

// Audit Log types
export const AuditActionType = z.enum([
  'session_created',
  'session_updated',
  'session_completed',
  'verification_attempt',
  'user_login',
  'user_logout',
  'ticket_created',
  'ticket_updated'
]);
export type AuditActionType = z.infer<typeof AuditActionType>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: AuditActionType,
  resourceType: z.string(),
  resourceId: z.string(),
  details: z.record(z.any()),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.date(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// API Request/Response types
export const CreateVerificationSessionRequestSchema = z.object({
  employeeName: z.string().min(1),
  employeeEmail: z.string().email(),
  ticketTitle: z.string().min(1),
  ticketDescription: z.string().min(1),
  priority: TicketPriority.default('medium'),
});
export type CreateVerificationSessionRequest = z.infer<typeof CreateVerificationSessionRequestSchema>;

export const UpdateVerificationSessionRequestSchema = z.object({
  status: VerificationStatus.optional(),
  scheduledAt: z.string().datetime().optional(),
  videoMeetingLink: z.string().url().optional(),
  videoMeetingPlatform: z.enum(['zoom', 'google_meet', 'teams', 'other']).optional(),
  notes: z.string().optional(),
  verificationDetails: z.object({
    idType: IDType.optional(),
    idVerified: z.boolean().optional(),
    faceMatchVerified: z.boolean().optional(),
    nameMatchVerified: z.boolean().optional(),
    verificationNotes: z.string().optional(),
  }).optional(),
});
export type UpdateVerificationSessionRequest = z.infer<typeof UpdateVerificationSessionRequestSchema>;

// API Response types
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.any().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ApiResponseSchema = <T>(dataSchema: z.ZodType<T>) => z.object({
  success: z.boolean(),
  data: dataSchema.optional(),
  error: ApiErrorSchema.optional(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }).optional(),
});