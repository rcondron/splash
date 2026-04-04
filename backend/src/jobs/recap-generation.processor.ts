import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExtractionStatus, GeneratedBy } from '@prisma/client';

export interface RecapGenerationJobData {
  voyageId: string;
  triggeredByUserId: string;
}

@Processor('recap-generation')
export class RecapGenerationProcessor {
  private readonly logger = new Logger(RecapGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Process()
  async handleRecapGeneration(
    job: Job<RecapGenerationJobData>,
  ): Promise<void> {
    const { voyageId, triggeredByUserId } = job.data;
    this.logger.log(
      `Starting recap generation for voyage ${voyageId} (job ${job.id})`,
    );

    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });

    if (!voyage) {
      this.logger.error(`Voyage ${voyageId} not found, skipping recap generation`);
      return;
    }

    // Gather accepted terms
    const terms = await this.prisma.extractedTerm.findMany({
      where: {
        voyageId,
        extractionStatus: ExtractionStatus.ACCEPTED,
      },
      orderBy: { createdAt: 'asc' },
    });

    const termsData = terms.map((t) => ({
      termType: t.termType,
      rawValue: t.rawValue,
      normalizedValue: t.normalizedValue,
    }));

    const voyageInfo = {
      voyageName: voyage.voyageName,
      vesselName: voyage.vesselName,
      cargoType: voyage.cargoType,
      cargoQuantity: voyage.cargoQuantity,
      loadPort: voyage.loadPort,
      dischargePort: voyage.dischargePort,
      laycanStart: voyage.laycanStart,
      laycanEnd: voyage.laycanEnd,
      freightRate: voyage.freightRate,
      freightCurrency: voyage.freightCurrency,
      status: voyage.status,
    };

    const aiResponse = await this.aiService.generateRecap(
      { terms: termsData },
      voyageInfo,
    );

    // Determine version number
    const lastRecap = await this.prisma.recap.findFirst({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastRecap?.versionNumber || 0) + 1;

    const recap = await this.prisma.recap.create({
      data: {
        voyageId,
        title: `Recap v${versionNumber} - ${voyage.voyageName}`,
        bodyMarkdown: aiResponse.data,
        bodyHtml: this.markdownToBasicHtml(aiResponse.data),
        versionNumber,
        generatedBy: GeneratedBy.AI,
        createdByUserId: triggeredByUserId,
      },
    });

    this.logger.log(
      `Recap ${recap.id} (v${versionNumber}) created for voyage ${voyageId}`,
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
        type: 'RECAP_GENERATED',
        title: 'New Recap Generated',
        body: `Recap v${versionNumber} has been generated for voyage "${voyage.voyageName}".`,
        actionUrl: `/voyages/${voyageId}/recaps/${recap.id}`,
      });
    }

    this.logger.log(
      `Recap generation job ${job.id} completed: recap ${recap.id} saved, ${participants.length} participants notified`,
    );
  }

  private markdownToBasicHtml(md: string): string {
    let html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    html = html.replace(
      /(<li>.*?<\/li>(?:<br>)?)+/g,
      (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`,
    );

    return `<p>${html}</p>`;
  }
}
