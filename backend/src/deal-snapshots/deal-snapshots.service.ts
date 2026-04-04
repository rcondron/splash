import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { ExtractionStatus, ProposedBy } from '@prisma/client';

@Injectable()
export class DealSnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async createSnapshot(voyageId: string, userId: string) {
    // Gather voyage data
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });

    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }

    // Gather accepted terms
    const terms = await this.prisma.extractedTerm.findMany({
      where: {
        voyageId,
        extractionStatus: ExtractionStatus.ACCEPTED,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Gather latest recap
    const latestRecap = await this.prisma.recap.findFirst({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
    });

    const snapshotJson = {
      voyage: {
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
      },
      terms: terms.map((t) => ({
        termType: t.termType,
        rawValue: t.rawValue,
        normalizedValue: t.normalizedValue,
      })),
      recap: latestRecap
        ? {
            title: latestRecap.title,
            versionNumber: latestRecap.versionNumber,
            bodyMarkdown: latestRecap.bodyMarkdown,
          }
        : null,
      snapshotTakenAt: new Date().toISOString(),
    };

    // Determine version number
    const lastSnapshot = await this.prisma.dealSnapshot.findFirst({
      where: { voyageId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (lastSnapshot?.versionNumber || 0) + 1;

    const snapshot = await this.prisma.dealSnapshot.create({
      data: {
        voyageId,
        versionNumber,
        snapshotJson,
        createdBy: ProposedBy.USER,
        createdByUserId: userId,
      },
    });

    await this.auditService.createEvent({
      voyageId,
      actorUserId: userId,
      eventType: 'DEAL_SNAPSHOT_CREATED',
      entityType: 'DealSnapshot',
      entityId: snapshot.id,
      metadata: {
        versionNumber,
        termCount: terms.length,
        hasRecap: !!latestRecap,
      },
    });

    return snapshot;
  }

  async findByVoyage(voyageId: string) {
    return this.prisma.dealSnapshot.findMany({
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
    const snapshot = await this.prisma.dealSnapshot.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!snapshot) {
      throw new NotFoundException('Deal snapshot not found');
    }
    return snapshot;
  }

  async compareSnapshots(id1: string, id2: string) {
    const [snapshot1, snapshot2] = await Promise.all([
      this.findById(id1),
      this.findById(id2),
    ]);

    const json1 = snapshot1.snapshotJson as Record<string, any>;
    const json2 = snapshot2.snapshotJson as Record<string, any>;

    const diff = this.buildDiff(json1, json2);

    return {
      snapshot1: {
        id: snapshot1.id,
        versionNumber: snapshot1.versionNumber,
        createdAt: snapshot1.createdAt,
      },
      snapshot2: {
        id: snapshot2.id,
        versionNumber: snapshot2.versionNumber,
        createdAt: snapshot2.createdAt,
      },
      diff,
    };
  }

  private buildDiff(
    obj1: Record<string, any>,
    obj2: Record<string, any>,
    path = '',
  ): Array<{ path: string; oldValue: any; newValue: any }> {
    const changes: Array<{ path: string; oldValue: any; newValue: any }> = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (
        val1 &&
        val2 &&
        typeof val1 === 'object' &&
        typeof val2 === 'object' &&
        !Array.isArray(val1) &&
        !Array.isArray(val2)
      ) {
        changes.push(...this.buildDiff(val1, val2, currentPath));
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        changes.push({ path: currentPath, oldValue: val1, newValue: val2 });
      }
    }

    return changes;
  }
}
