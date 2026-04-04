import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
  ) {}

  async generateContract(
    voyageId: string,
    body: { recapId: string; templateName: string },
    userId: string,
  ) {
    const recap = await this.prisma.recap.findUnique({
      where: { id: body.recapId },
    });

    if (!recap || recap.voyageId !== voyageId) {
      throw new NotFoundException('Recap not found for this voyage');
    }

    const aiResponse = await this.aiService.generateContractDraft(
      {
        title: recap.title,
        bodyMarkdown: recap.bodyMarkdown,
        versionNumber: recap.versionNumber,
      },
      body.templateName,
    );

    // Determine version number
    const lastContract = await this.prisma.contractDraft.findFirst({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastContract?.versionNumber || 0) + 1;

    const contract = await this.prisma.contractDraft.create({
      data: {
        voyageId,
        templateName: body.templateName,
        bodyMarkdown: aiResponse.data,
        bodyHtml: this.markdownToBasicHtml(aiResponse.data),
        versionNumber,
        generatedFromRecapId: body.recapId,
      },
    });

    await this.auditService.createEvent({
      voyageId,
      actorUserId: userId,
      eventType: 'CONTRACT_GENERATED',
      entityType: 'ContractDraft',
      entityId: contract.id,
      metadata: {
        versionNumber,
        templateName: body.templateName,
        recapId: body.recapId,
        aiModel: aiResponse.model,
        aiSource: aiResponse.source,
      },
    });

    return contract;
  }

  async findByVoyage(voyageId: string) {
    return this.prisma.contractDraft.findMany({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
      include: {
        generatedFromRecap: {
          select: { id: true, title: true, versionNumber: true },
        },
      },
    });
  }

  async findById(id: string) {
    const contract = await this.prisma.contractDraft.findUnique({
      where: { id },
      include: {
        generatedFromRecap: {
          select: { id: true, title: true, versionNumber: true },
        },
      },
    });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }
    return contract;
  }

  async update(
    id: string,
    body: { bodyMarkdown: string },
    userId: string,
  ) {
    const contract = await this.findById(id);

    const updated = await this.prisma.contractDraft.update({
      where: { id },
      data: {
        bodyMarkdown: body.bodyMarkdown,
        bodyHtml: this.markdownToBasicHtml(body.bodyMarkdown),
      },
    });

    await this.auditService.createEvent({
      voyageId: contract.voyageId,
      actorUserId: userId,
      eventType: 'CONTRACT_EDITED',
      entityType: 'ContractDraft',
      entityId: id,
    });

    return updated;
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
