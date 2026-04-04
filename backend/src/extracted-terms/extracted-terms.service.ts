import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExtractionStatus, ProposedBy, TermType } from '@prisma/client';

export interface CreateTermDto {
  termType: TermType;
  rawValue: string;
  normalizedValue?: string;
  confidenceScore?: number;
  sourceMessageId?: string;
  sourceConversationId?: string;
}

export interface UpdateTermDto {
  rawValue?: string;
  normalizedValue?: string;
  termType?: TermType;
}

@Injectable()
export class ExtractedTermsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findByVoyage(voyageId: string) {
    return this.prisma.extractedTerm.findMany({
      where: { voyageId },
      orderBy: { createdAt: 'desc' },
      include: {
        sourceMessage: {
          select: { id: true, plainTextBody: true, sentAt: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findById(id: string) {
    const term = await this.prisma.extractedTerm.findUnique({
      where: { id },
      include: {
        sourceMessage: {
          select: { id: true, plainTextBody: true, sentAt: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!term) {
      throw new NotFoundException('Extracted term not found');
    }
    return term;
  }

  async create(voyageId: string, dto: CreateTermDto, userId: string) {
    const term = await this.prisma.extractedTerm.create({
      data: {
        voyageId,
        termType: dto.termType,
        rawValue: dto.rawValue,
        normalizedValue: dto.normalizedValue || null,
        confidenceScore: dto.confidenceScore || null,
        sourceMessageId: dto.sourceMessageId || null,
        sourceConversationId: dto.sourceConversationId || null,
        extractionStatus: ExtractionStatus.PROPOSED,
        proposedBy: ProposedBy.USER,
      },
    });

    await this.auditService.createEvent({
      voyageId,
      actorUserId: userId,
      eventType: 'TERM_CREATED',
      entityType: 'ExtractedTerm',
      entityId: term.id,
      metadata: { termType: dto.termType, rawValue: dto.rawValue },
    });

    return term;
  }

  async accept(id: string, userId: string) {
    const term = await this.findById(id);

    if (term.extractionStatus !== ExtractionStatus.PROPOSED) {
      throw new BadRequestException(
        `Cannot accept a term with status ${term.extractionStatus}`,
      );
    }

    const updated = await this.prisma.extractedTerm.update({
      where: { id },
      data: {
        extractionStatus: ExtractionStatus.ACCEPTED,
        approvedByUserId: userId,
      },
    });

    await this.auditService.createEvent({
      voyageId: term.voyageId,
      actorUserId: userId,
      eventType: 'TERM_ACCEPTED',
      entityType: 'ExtractedTerm',
      entityId: id,
      metadata: { termType: term.termType, rawValue: term.rawValue },
    });

    return updated;
  }

  async reject(id: string, userId: string) {
    const term = await this.findById(id);

    if (term.extractionStatus !== ExtractionStatus.PROPOSED) {
      throw new BadRequestException(
        `Cannot reject a term with status ${term.extractionStatus}`,
      );
    }

    const updated = await this.prisma.extractedTerm.update({
      where: { id },
      data: {
        extractionStatus: ExtractionStatus.REJECTED,
      },
    });

    await this.auditService.createEvent({
      voyageId: term.voyageId,
      actorUserId: userId,
      eventType: 'TERM_REJECTED',
      entityType: 'ExtractedTerm',
      entityId: id,
      metadata: { termType: term.termType, rawValue: term.rawValue },
    });

    return updated;
  }

  async update(id: string, dto: UpdateTermDto, userId: string) {
    const oldTerm = await this.findById(id);

    // Create a new version that supersedes the old one
    const newTerm = await this.prisma.$transaction(async (tx) => {
      const created = await tx.extractedTerm.create({
        data: {
          voyageId: oldTerm.voyageId,
          termType: dto.termType || oldTerm.termType,
          rawValue: dto.rawValue || oldTerm.rawValue,
          normalizedValue:
            dto.normalizedValue !== undefined
              ? dto.normalizedValue
              : oldTerm.normalizedValue,
          confidenceScore: oldTerm.confidenceScore,
          sourceMessageId: oldTerm.sourceMessageId,
          sourceConversationId: oldTerm.sourceConversationId,
          extractionStatus: ExtractionStatus.PROPOSED,
          proposedBy: ProposedBy.USER,
        },
      });

      // Mark old term as superseded
      await tx.extractedTerm.update({
        where: { id },
        data: {
          extractionStatus: ExtractionStatus.SUPERSEDED,
          supersededById: created.id,
        },
      });

      return created;
    });

    await this.auditService.createEvent({
      voyageId: oldTerm.voyageId,
      actorUserId: userId,
      eventType: 'TERM_EDITED',
      entityType: 'ExtractedTerm',
      entityId: newTerm.id,
      metadata: {
        previousTermId: id,
        termType: newTerm.termType,
        rawValue: newTerm.rawValue,
      },
    });

    return newTerm;
  }
}
