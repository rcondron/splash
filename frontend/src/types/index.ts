export enum CompanyType {
  SHIPOWNER = "shipowner",
  CHARTERER = "charterer",
  BROKER = "broker",
  OPERATOR = "operator",
}

export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  BROKER = "broker",
  OPERATOR = "operator",
  VIEWER = "viewer",
}

export enum VoyageStatus {
  DRAFT = "draft",
  INQUIRY = "inquiry",
  NEGOTIATION = "negotiation",
  SUBJECTS = "subjects",
  FIXED = "fixed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum ParticipantRole {
  OWNER = "owner",
  CHARTERER = "charterer",
  OWNER_BROKER = "owner_broker",
  CHARTERER_BROKER = "charterer_broker",
  OPERATOR = "operator",
}

export enum ConversationType {
  NEGOTIATION = "negotiation",
  INTERNAL = "internal",
  EXTERNAL = "external",
}

export enum MessageType {
  TEXT = "text",
  OFFER = "offer",
  COUNTER_OFFER = "counter_offer",
  ACCEPTANCE = "acceptance",
  REJECTION = "rejection",
  SYSTEM = "system",
}

export enum MessageSource {
  PLATFORM = "platform",
  EMAIL = "email",
  API = "api",
}

export enum TermType {
  FREIGHT_RATE = "freight_rate",
  LAYCAN = "laycan",
  LOAD_PORT = "load_port",
  DISCHARGE_PORT = "discharge_port",
  CARGO_TYPE = "cargo_type",
  CARGO_QUANTITY = "cargo_quantity",
  DEMURRAGE = "demurrage",
  LAYTIME = "laytime",
  VESSEL_NAME = "vessel_name",
  VESSEL_TYPE = "vessel_type",
  COMMISSION = "commission",
  PAYMENT_TERMS = "payment_terms",
  GOVERNING_LAW = "governing_law",
  ARBITRATION = "arbitration",
  OTHER = "other",
}

export enum ExtractionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  REJECTED = "rejected",
  MODIFIED = "modified",
}

export enum ProposedBy {
  OWNER = "owner",
  CHARTERER = "charterer",
}

export enum GeneratedBy {
  MANUAL = "manual",
  AI = "ai",
  TEMPLATE = "template",
}

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  domain: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  companyId: string;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

export interface Voyage {
  id: string;
  reference: string;
  status: VoyageStatus;
  vesselName: string | null;
  vesselImo: string | null;
  cargoType: string | null;
  cargoQuantity: number | null;
  cargoUnit: string | null;
  loadPort: string | null;
  dischargePort: string | null;
  laycanFrom: string | null;
  laycanTo: string | null;
  freightRate: number | null;
  freightUnit: string | null;
  demurrageRate: number | null;
  notes: string | null;
  createdById: string;
  createdBy?: User;
  participants?: VoyageParticipant[];
  conversations?: Conversation[];
  createdAt: string;
  updatedAt: string;
}

export interface VoyageParticipant {
  id: string;
  voyageId: string;
  companyId: string;
  userId: string;
  role: ParticipantRole;
  company?: Company;
  user?: User;
  voyage?: Voyage;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  voyageId: string;
  type: ConversationType;
  title: string;
  isArchived: boolean;
  voyage?: Voyage;
  messages?: Message[];
  participants?: VoyageParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  source: MessageSource;
  content: string;
  metadata: Record<string, unknown> | null;
  sender?: User;
  conversation?: Conversation;
  attachments?: FileAttachment[];
  extractedTerms?: ExtractedTerm[];
  createdAt: string;
  updatedAt: string;
}

export interface FileAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  message?: Message;
  createdAt: string;
}

export interface ExtractedTerm {
  id: string;
  messageId: string;
  voyageId: string;
  termType: TermType;
  label: string;
  value: string;
  confidence: number;
  status: ExtractionStatus;
  proposedBy: ProposedBy | null;
  confirmedById: string | null;
  message?: Message;
  voyage?: Voyage;
  confirmedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface DealSnapshot {
  id: string;
  voyageId: string;
  version: number;
  terms: Record<string, unknown>;
  status: VoyageStatus;
  createdById: string;
  voyage?: Voyage;
  createdBy?: User;
  createdAt: string;
}

export interface Recap {
  id: string;
  voyageId: string;
  content: string;
  generatedBy: GeneratedBy;
  isApproved: boolean;
  approvedById: string | null;
  approvedAt: string | null;
  voyage?: Voyage;
  approvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  voyageId: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  user?: User;
  voyage?: Voyage;
  createdAt: string;
}

export interface ContractDraft {
  id: string;
  voyageId: string;
  title: string;
  content: string;
  version: number;
  generatedBy: GeneratedBy;
  isFinalized: boolean;
  finalizedById: string | null;
  finalizedAt: string | null;
  voyage?: Voyage;
  finalizedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  readAt: string | null;
  linkUrl: string | null;
  metadata: Record<string, unknown> | null;
  user?: User;
  createdAt: string;
}

export interface ImportedEmail {
  id: string;
  voyageId: string | null;
  conversationId: string | null;
  messageId: string | null;
  externalMessageId: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  receivedAt: string;
  isProcessed: boolean;
  processedAt: string | null;
  voyage?: Voyage;
  conversation?: Conversation;
  message?: Message;
  createdAt: string;
}
