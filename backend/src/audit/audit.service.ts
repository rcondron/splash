import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface CreateEventDto {
  voyageId?: string;
  actorUserId?: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

export interface AuditFilters {
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  actorUserId?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(dto: CreateEventDto) {
    return this.prisma.auditEvent.create({
      data: {
        voyageId: dto.voyageId || null,
        actorUserId: dto.actorUserId || null,
        eventType: dto.eventType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        metadataJson: dto.metadata || null,
      },
    });
  }

  async findByVoyage(voyageId: string, filters?: AuditFilters) {
    const where: Prisma.AuditEventWhereInput = { voyageId };

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }
    if (filters?.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async exportByVoyage(voyageId: string) {
    return this.findByVoyage(voyageId);
  }
}
