import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ExtractionStatus, GeneratedBy } from '@prisma/client';

@Injectable()
export class RecapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async generateRecap(voyageId: string, userId: string) {
    // Gather accepted terms
    const terms = await this.prisma.extractedTerm.findMany({
      where: {
        voyageId,
        extractionStatus: ExtractionStatus.ACCEPTED,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Gather voyage info
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });

    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }

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
        createdByUserId: userId,
      },
    });

    this.analyticsService.track('recap_generated', {
      recapId: recap.id,
      voyageId,
      versionNumber,
      termCount: terms.length,
      aiModel: aiResponse.model,
    }, userId);

    await this.auditService.createEvent({
      voyageId,
      actorUserId: userId,
      eventType: 'RECAP_GENERATED',
      entityType: 'Recap',
      entityId: recap.id,
      metadata: {
        versionNumber,
        aiModel: aiResponse.model,
        aiSource: aiResponse.source,
        termCount: terms.length,
      },
    });

    return recap;
  }

  async findByVoyage(voyageId: string) {
    return this.prisma.recap.findMany({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findById(id: string) {
    const recap = await this.prisma.recap.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!recap) {
      throw new NotFoundException('Recap not found');
    }
    return recap;
  }

  async update(id: string, body: { bodyMarkdown: string }, userId: string) {
    const recap = await this.findById(id);

    const updated = await this.prisma.recap.update({
      where: { id },
      data: {
        bodyMarkdown: body.bodyMarkdown,
        bodyHtml: this.markdownToBasicHtml(body.bodyMarkdown),
      },
    });

    await this.auditService.createEvent({
      voyageId: recap.voyageId,
      actorUserId: userId,
      eventType: 'RECAP_EDITED',
      entityType: 'Recap',
      entityId: id,
    });

    return updated;
  }

  async exportHtml(id: string) {
    const recap = await this.findById(id);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${recap.title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
    h1 { color: #1a365d; border-bottom: 2px solid #2b6cb0; padding-bottom: 10px; }
    h2 { color: #2b6cb0; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background-color: #edf2f7; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #718096; }
  </style>
</head>
<body>
  ${recap.bodyHtml || this.markdownToBasicHtml(recap.bodyMarkdown)}
  <div class="footer">
    <p>Generated: ${recap.createdAt.toISOString()} | Version: ${recap.versionNumber}</p>
  </div>
</body>
</html>`;
    return html;
  }

  private markdownToBasicHtml(md: string): string {
    // Basic markdown-to-HTML conversion for common patterns
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

    // Wrap loose <li> elements in <ul>
    html = html.replace(
      /(<li>.*?<\/li>(?:<br>)?)+/g,
      (match) => `<ul>${match.replace(/<br>/g, '')}</ul>`,
    );

    return `<p>${html}</p>`;
  }
}
