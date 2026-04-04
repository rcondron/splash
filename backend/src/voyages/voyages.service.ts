import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { CreateVoyageDto } from './dto/create-voyage.dto';
import { UpdateVoyageDto } from './dto/update-voyage.dto';
import { Prisma, VoyageStatus } from '@prisma/client';

@Injectable()
export class VoyagesService {
  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateVoyageDto) {
    const voyage = await this.prisma.voyage.create({
      data: {
        voyageName: dto.voyageName,
        internalReference: dto.internalReference,
        vesselName: dto.vesselName,
        imoNumber: dto.imoNumber,
        ownerCompanyName: dto.ownerCompanyName,
        chartererCompanyName: dto.chartererCompanyName,
        brokerCompanyName: dto.brokerCompanyName,
        cargoType: dto.cargoType,
        cargoQuantity: dto.cargoQuantity,
        loadPort: dto.loadPort,
        dischargePort: dto.dischargePort,
        laycanStart: dto.laycanStart ? new Date(dto.laycanStart) : undefined,
        laycanEnd: dto.laycanEnd ? new Date(dto.laycanEnd) : undefined,
        freightRate: dto.freightRate,
        freightCurrency: dto.freightCurrency,
        rateBasis: dto.rateBasis,
        status: dto.status || VoyageStatus.DRAFT,
        companyId,
        createdByUserId: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: true,
      },
    });

    // Add the creator as a participant
    await this.prisma.voyageParticipant.create({
      data: {
        voyageId: voyage.id,
        userId,
        role: 'ADMIN',
      },
    });

    this.analyticsService.track('voyage_created', {
      voyageId: voyage.id,
      voyageName: voyage.voyageName,
      companyId,
      vesselName: voyage.vesselName,
      status: voyage.status,
    }, userId);

    // Create audit event
    await this.prisma.auditEvent.create({
      data: {
        voyageId: voyage.id,
        actorUserId: userId,
        eventType: 'VOYAGE_CREATED',
        entityType: 'Voyage',
        entityId: voyage.id,
        metadataJson: { voyageName: voyage.voyageName },
      },
    });

    return voyage;
  }

  async findAll(
    companyId: string,
    filters: {
      status?: VoyageStatus;
      search?: string;
      vesselName?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VoyageWhereInput = {
      companyId,
      status: { not: VoyageStatus.ARCHIVED },
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vesselName) {
      where.vesselName = {
        contains: filters.vesselName,
        mode: 'insensitive',
      };
    }

    if (filters.search) {
      where.OR = [
        { voyageName: { contains: filters.search, mode: 'insensitive' } },
        { internalReference: { contains: filters.search, mode: 'insensitive' } },
        { vesselName: { contains: filters.search, mode: 'insensitive' } },
        { cargoType: { contains: filters.search, mode: 'insensitive' } },
        { loadPort: { contains: filters.search, mode: 'insensitive' } },
        { dischargePort: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [voyages, total] = await Promise.all([
      this.prisma.voyage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              conversations: true,
              participants: true,
              files: true,
            },
          },
        },
      }),
      this.prisma.voyage.count({ where }),
    ]);

    return {
      data: voyages,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: true,
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
              },
            },
          },
        },
        _count: {
          select: {
            conversations: true,
            files: true,
            extractedTerms: true,
          },
        },
      },
    });

    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }

    if (voyage.companyId !== companyId) {
      // Check if user is a participant from another company
      const isParticipant = voyage.participants.some(
        (p) => p.user.id === companyId,
      );
      if (!isParticipant) {
        throw new ForbiddenException('Cannot access this voyage');
      }
    }

    return voyage;
  }

  async update(
    id: string,
    companyId: string,
    userId: string,
    dto: UpdateVoyageDto,
  ) {
    const voyage = await this.prisma.voyage.findUnique({ where: { id } });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot modify this voyage');
    }

    const updated = await this.prisma.voyage.update({
      where: { id },
      data: {
        ...dto,
        laycanStart: dto.laycanStart ? new Date(dto.laycanStart) : undefined,
        laycanEnd: dto.laycanEnd ? new Date(dto.laycanEnd) : undefined,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        voyageId: id,
        actorUserId: userId,
        eventType: 'VOYAGE_UPDATED',
        entityType: 'Voyage',
        entityId: id,
        metadataJson: { updatedFields: Object.keys(dto) },
      },
    });

    return updated;
  }

  async archive(id: string, companyId: string, userId: string) {
    const voyage = await this.prisma.voyage.findUnique({ where: { id } });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot archive this voyage');
    }

    const updated = await this.prisma.voyage.update({
      where: { id },
      data: { status: VoyageStatus.ARCHIVED },
    });

    await this.prisma.auditEvent.create({
      data: {
        voyageId: id,
        actorUserId: userId,
        eventType: 'VOYAGE_ARCHIVED',
        entityType: 'Voyage',
        entityId: id,
      },
    });

    return updated;
  }

  async addParticipant(
    voyageId: string,
    companyId: string,
    data: { userId: string; role: string },
  ) {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException('Cannot modify participants of this voyage');
    }

    const existing = await this.prisma.voyageParticipant.findFirst({
      where: { voyageId, userId: data.userId },
    });
    if (existing) {
      return existing;
    }

    const participant = await this.prisma.voyageParticipant.create({
      data: {
        voyageId,
        userId: data.userId,
        role: data.role as any,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return participant;
  }

  async removeParticipant(
    voyageId: string,
    userId: string,
    companyId: string,
  ) {
    const voyage = await this.prisma.voyage.findUnique({
      where: { id: voyageId },
    });
    if (!voyage) {
      throw new NotFoundException('Voyage not found');
    }
    if (voyage.companyId !== companyId) {
      throw new ForbiddenException(
        'Cannot modify participants of this voyage',
      );
    }

    const participant = await this.prisma.voyageParticipant.findFirst({
      where: { voyageId, userId },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    await this.prisma.voyageParticipant.delete({
      where: { id: participant.id },
    });

    return { deleted: true };
  }
}
