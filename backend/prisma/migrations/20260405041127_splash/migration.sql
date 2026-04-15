-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('OWNER', 'BROKER', 'CHARTERER', 'OPERATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'COMPANY_ADMIN', 'BROKER', 'OWNER', 'CHARTERER', 'OPERATOR', 'LEGAL', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "VoyageStatus" AS ENUM ('DRAFT', 'NEGOTIATING', 'FIXED', 'PERFORMING', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('OWNER', 'BROKER', 'CHARTERER', 'OPERATOR', 'LEGAL', 'OBSERVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('INTERNAL', 'EXTERNAL', 'NEGOTIATION', 'EMAIL_SYNC', 'CALL_NOTES');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('USER_TEXT', 'SYSTEM', 'AI_SUMMARY', 'EMAIL_IMPORT', 'CALL_NOTE', 'FILE_NOTE');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('APP', 'EMAIL', 'IMPORTED', 'SYSTEM', 'AI');

-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('VESSEL', 'CARGO', 'QUANTITY', 'LOAD_PORT', 'DISCHARGE_PORT', 'LAYCAN', 'FREIGHT_RATE', 'DEMURRAGE', 'DESPATCH', 'COMMISSION', 'PAYMENT_TERMS', 'CP_FORM', 'OTHER');

-- CreateEnum
CREATE TYPE "ExtractionStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ProposedBy" AS ENUM ('AI', 'USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GeneratedBy" AS ENUM ('AI', 'USER');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyages" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "internalReference" TEXT NOT NULL,
    "voyageName" TEXT NOT NULL,
    "vesselName" TEXT,
    "imoNumber" TEXT,
    "ownerCompanyName" TEXT,
    "chartererCompanyName" TEXT,
    "brokerCompanyName" TEXT,
    "cargoType" TEXT,
    "cargoQuantity" TEXT,
    "loadPort" TEXT,
    "dischargePort" TEXT,
    "laycanStart" TIMESTAMP(3),
    "laycanEnd" TIMESTAMP(3),
    "freightRate" TEXT,
    "freightCurrency" TEXT DEFAULT 'USD',
    "rateBasis" TEXT,
    "status" "VoyageStatus" NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voyages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voyage_participants" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "visibilityLevel" TEXT NOT NULL DEFAULT 'full',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voyage_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "type" "ConversationType" NOT NULL,
    "title" TEXT NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "authorUserId" UUID,
    "messageType" "MessageType" NOT NULL,
    "plainTextBody" TEXT NOT NULL,
    "richTextBody" TEXT,
    "source" "MessageSource" NOT NULL,
    "externalMessageId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "conversationId" UUID,
    "messageId" UUID,
    "uploadedByUserId" UUID NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_terms" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "sourceMessageId" UUID,
    "sourceConversationId" UUID,
    "termType" "TermType" NOT NULL,
    "rawValue" TEXT NOT NULL,
    "normalizedValue" TEXT,
    "confidenceScore" DOUBLE PRECISION,
    "extractionStatus" "ExtractionStatus" NOT NULL,
    "proposedBy" "ProposedBy" NOT NULL,
    "approvedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededById" UUID,

    CONSTRAINT "extracted_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_snapshots" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdBy" "ProposedBy" NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recaps" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "generatedBy" "GeneratedBy" NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "voyageId" UUID,
    "actorUserId" UUID,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_integration_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'inactive',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_integration_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imported_emails" (
    "id" UUID NOT NULL,
    "voyageId" UUID,
    "emailIntegrationAccountId" UUID NOT NULL,
    "externalThreadId" TEXT,
    "externalMessageId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddressesJson" JSONB NOT NULL,
    "ccAddressesJson" JSONB,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imported_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_drafts" (
    "id" UUID NOT NULL,
    "voyageId" UUID NOT NULL,
    "templateName" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "versionNumber" INTEGER NOT NULL,
    "generatedFromRecapId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "voyageId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "voyages_companyId_idx" ON "voyages"("companyId");

-- CreateIndex
CREATE INDEX "voyages_status_idx" ON "voyages"("status");

-- CreateIndex
CREATE INDEX "voyages_createdByUserId_idx" ON "voyages"("createdByUserId");

-- CreateIndex
CREATE INDEX "voyages_createdAt_idx" ON "voyages"("createdAt");

-- CreateIndex
CREATE INDEX "voyage_participants_voyageId_idx" ON "voyage_participants"("voyageId");

-- CreateIndex
CREATE INDEX "voyage_participants_userId_idx" ON "voyage_participants"("userId");

-- CreateIndex
CREATE INDEX "conversations_voyageId_idx" ON "conversations"("voyageId");

-- CreateIndex
CREATE INDEX "conversations_createdByUserId_idx" ON "conversations"("createdByUserId");

-- CreateIndex
CREATE INDEX "conversations_createdAt_idx" ON "conversations"("createdAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_authorUserId_idx" ON "messages"("authorUserId");

-- CreateIndex
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt");

-- CreateIndex
CREATE INDEX "file_attachments_voyageId_idx" ON "file_attachments"("voyageId");

-- CreateIndex
CREATE INDEX "file_attachments_conversationId_idx" ON "file_attachments"("conversationId");

-- CreateIndex
CREATE INDEX "file_attachments_messageId_idx" ON "file_attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_terms_supersededById_key" ON "extracted_terms"("supersededById");

-- CreateIndex
CREATE INDEX "extracted_terms_voyageId_idx" ON "extracted_terms"("voyageId");

-- CreateIndex
CREATE INDEX "extracted_terms_sourceMessageId_idx" ON "extracted_terms"("sourceMessageId");

-- CreateIndex
CREATE INDEX "extracted_terms_sourceConversationId_idx" ON "extracted_terms"("sourceConversationId");

-- CreateIndex
CREATE INDEX "deal_snapshots_voyageId_idx" ON "deal_snapshots"("voyageId");

-- CreateIndex
CREATE INDEX "recaps_voyageId_idx" ON "recaps"("voyageId");

-- CreateIndex
CREATE INDEX "audit_events_voyageId_idx" ON "audit_events"("voyageId");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_idx" ON "audit_events"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_events_eventType_idx" ON "audit_events"("eventType");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- CreateIndex
CREATE INDEX "email_integration_accounts_userId_idx" ON "email_integration_accounts"("userId");

-- CreateIndex
CREATE INDEX "imported_emails_voyageId_idx" ON "imported_emails"("voyageId");

-- CreateIndex
CREATE INDEX "imported_emails_emailIntegrationAccountId_idx" ON "imported_emails"("emailIntegrationAccountId");

-- CreateIndex
CREATE INDEX "contract_drafts_voyageId_idx" ON "contract_drafts"("voyageId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_voyageId_idx" ON "notifications"("voyageId");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyages" ADD CONSTRAINT "voyages_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyage_participants" ADD CONSTRAINT "voyage_participants_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voyage_participants" ADD CONSTRAINT "voyage_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_terms" ADD CONSTRAINT "extracted_terms_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_terms" ADD CONSTRAINT "extracted_terms_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_terms" ADD CONSTRAINT "extracted_terms_sourceConversationId_fkey" FOREIGN KEY ("sourceConversationId") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_terms" ADD CONSTRAINT "extracted_terms_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_terms" ADD CONSTRAINT "extracted_terms_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "extracted_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_snapshots" ADD CONSTRAINT "deal_snapshots_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_snapshots" ADD CONSTRAINT "deal_snapshots_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recaps" ADD CONSTRAINT "recaps_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recaps" ADD CONSTRAINT "recaps_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_integration_accounts" ADD CONSTRAINT "email_integration_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_emails" ADD CONSTRAINT "imported_emails_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imported_emails" ADD CONSTRAINT "imported_emails_emailIntegrationAccountId_fkey" FOREIGN KEY ("emailIntegrationAccountId") REFERENCES "email_integration_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_drafts" ADD CONSTRAINT "contract_drafts_generatedFromRecapId_fkey" FOREIGN KEY ("generatedFromRecapId") REFERENCES "recaps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "voyages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
