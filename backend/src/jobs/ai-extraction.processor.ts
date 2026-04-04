import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExtractionStatus, ProposedBy, TermType } from '@prisma/client';

export interface AiExtractionJobData {
  voyageId: string;
  triggeredByUserId: string;
}

@Processor('ai-extraction')
export class AiExtractionProcessor {
  private readonly logger = new Logger(AiExtractionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process()
  async handleExtraction(job: Job<AiExtractionJobData>): Promise<void> {
    const { voyageId, triggeredByUserId } = job.data;
    this.logger.log(
      `Starting AI term extraction for voyage ${voyageId} (job ${job.id})`,
    );

    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
      select: { voyageName: true },
    });

    if (!voyage) {
      this.logger.error(`Voyage ${voyageId} not found, skipping extraction`);
      return;
    }

    // Extract terms via AI service
    const result = await this.aiService.extractTermsFromVoyageMessages(voyageId);

    // Validate and map term types
    const validTermTypes = new Set(Object.values(TermType));

    // Save extracted terms to the database
    const createdTerms = [];
    for (const term of result.data) {
      const termType = term.termType as string;
      if (!validTermTypes.has(termType as TermType)) {
        this.logger.warn(
          `Skipping term with unknown type "${termType}" for voyage ${voyageId}`,
        );
        continue;
      }

      const created = await this.prisma.extractedTerm.create({
        data: {
          voyageId,
          termType: termType as TermType,
          rawValue: term.rawValue,
          normalizedValue: term.normalizedValue || null,
          confidenceScore: term.confidence ?? null,
          extractionStatus: ExtractionStatus.PROPOSED,
          proposedBy: ProposedBy.AI,
        },
      });
      createdTerms.push(created);
    }

    this.logger.log(
      `Extracted ${createdTerms.length} terms for voyage ${voyageId}`,
    );

    // Notify all voyage participants
    const participants = await this.prisma.voyageParticipant.findMany({
      where: { voyageId },
      select: { userId: true },
    });

    for (const participant of participants) {
      await this.notificationsService.create({
        userId: participant.userId,
        voyageId,
        type: 'AI_EXTRACTION_COMPLETE',
        title: 'AI Term Extraction Complete',
        body: `${createdTerms.length} new term(s) extracted from messages in voyage "${voyage.voyageName}".`,
        actionUrl: `/voyages/${voyageId}/terms`,
      });
    }

    this.logger.log(
      `AI extraction job ${job.id} completed: ${createdTerms.length} terms saved, ${participants.length} participants notified`,
    );
  }
}
