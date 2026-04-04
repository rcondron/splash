import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PdfService {
  constructor(private readonly prisma: PrismaService) {}

  generatePdf(html: string, title: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(title)}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      @page { margin: 20mm; size: A4; }
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.6;
      color: #1a202c;
      font-size: 14px;
    }
    h1 {
      color: #1a365d;
      border-bottom: 2px solid #2b6cb0;
      padding-bottom: 10px;
      font-size: 24px;
    }
    h2 {
      color: #2b6cb0;
      margin-top: 30px;
      font-size: 18px;
    }
    h3 {
      color: #2d3748;
      font-size: 16px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10px 0;
      page-break-inside: auto;
    }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
      font-size: 13px;
    }
    th { background-color: #edf2f7; font-weight: 600; }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2b6cb0;
    }
    .header h1 { border-bottom: none; }
    .header .subtitle { color: #718096; font-size: 14px; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 0.85em;
      color: #718096;
      text-align: center;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 24px;
      background-color: #2b6cb0;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover { background-color: #1a365d; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
  ${html}
  <div class="footer">
    <p>SPLASH &mdash; Generated: ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
  }

  async generateRecapPdf(recapId: string): Promise<string> {
    const recap = await this.prisma.recap.findUnique({
      where: { id: recapId },
      include: {
        voyage: {
          select: { voyageName: true, vesselName: true },
        },
        createdByUser: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!recap) {
      throw new NotFoundException('Recap not found');
    }

    const voyageName = recap.voyage?.voyageName || 'Unknown Voyage';
    const author = recap.createdByUser
      ? `${recap.createdByUser.firstName} ${recap.createdByUser.lastName}`
      : 'System';

    const bodyHtml = recap.bodyHtml || this.escapeHtml(recap.bodyMarkdown);

    const innerHtml = `
  <div class="header">
    <h1>${this.escapeHtml(recap.title)}</h1>
    <div class="subtitle">Voyage: ${this.escapeHtml(voyageName)} | Version: ${recap.versionNumber} | By: ${this.escapeHtml(author)}</div>
    <div class="subtitle">Created: ${recap.createdAt.toISOString()}</div>
  </div>
  ${bodyHtml}`;

    return this.generatePdf(innerHtml, recap.title);
  }

  async generateAuditPdf(voyageId: string): Promise<string> {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
      select: { voyageName: true },
    });

    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }

    const events = await this.prisma.auditEvent.findMany({
      where: { voyageId },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    const rows = events
      .map((event) => {
        const actor = event.actor
          ? `${event.actor.firstName} ${event.actor.lastName}`
          : 'System';
        const metadata = event.metadataJson
          ? this.escapeHtml(JSON.stringify(event.metadataJson))
          : '&mdash;';
        return `<tr>
        <td>${event.createdAt.toISOString()}</td>
        <td>${this.escapeHtml(event.eventType)}</td>
        <td>${this.escapeHtml(actor)}</td>
        <td>${this.escapeHtml(event.entityType)}</td>
        <td style="font-family: monospace; font-size: 11px;">${this.escapeHtml(event.entityId)}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${metadata}</td>
      </tr>`;
      })
      .join('\n');

    const innerHtml = `
  <div class="header">
    <h1>Audit Log</h1>
    <div class="subtitle">Voyage: ${this.escapeHtml(voyage.voyageName)}</div>
    <div class="subtitle">${events.length} event(s) recorded</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Event Type</th>
        <th>Actor</th>
        <th>Entity Type</th>
        <th>Entity ID</th>
        <th>Metadata</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;">No audit events found.</td></tr>'}
    </tbody>
  </table>`;

    const title = `Audit Log - ${voyage.voyageName}`;
    return this.generatePdf(innerHtml, title);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
