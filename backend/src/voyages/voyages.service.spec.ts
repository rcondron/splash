import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { VoyagesService } from './voyages.service';
import { PrismaService } from '../prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('VoyagesService', () => {
  let service: VoyagesService;
  let prisma: PrismaService;

  const mockVoyage = {
    id: 'voyage-1',
    voyageName: 'Test Voyage',
    internalReference: 'TV-001',
    vesselName: 'MV Pacific Star',
    imoNumber: '1234567',
    ownerCompanyName: 'Owner Corp',
    chartererCompanyName: 'Charterer Corp',
    brokerCompanyName: null,
    cargoType: 'Wheat',
    cargoQuantity: '50000 MT',
    loadPort: 'Rotterdam',
    dischargePort: 'Singapore',
    laycanStart: null,
    laycanEnd: null,
    freightRate: '15.50',
    freightCurrency: 'USD',
    rateBasis: 'MT',
    status: 'DRAFT',
    companyId: 'company-1',
    createdByUserId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    },
    company: { id: 'company-1', legalName: 'Test Company' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoyagesService,
        {
          provide: PrismaService,
          useValue: {
            voyage: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            voyageParticipant: {
              create: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
            auditEvent: {
              create: jest.fn().mockResolvedValue({}),
            },
          },
        },
        {
          provide: AnalyticsService,
          useValue: {
            track: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VoyagesService>(VoyagesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create voyage, participant, and audit event', async () => {
      (prisma.voyage.create as jest.Mock).mockResolvedValue(mockVoyage);
      (prisma.voyageParticipant.create as jest.Mock).mockResolvedValue({
        id: 'participant-1',
        voyageId: 'voyage-1',
        userId: 'user-1',
        role: 'ADMIN',
      });

      const dto = {
        voyageName: 'Test Voyage',
        internalReference: 'TV-001',
        vesselName: 'MV Pacific Star',
        imoNumber: '1234567',
        ownerCompanyName: 'Owner Corp',
        chartererCompanyName: 'Charterer Corp',
        cargoType: 'Wheat',
        cargoQuantity: '50000 MT',
        loadPort: 'Rotterdam',
        dischargePort: 'Singapore',
      };

      const result = await service.create('company-1', 'user-1', dto as any);

      expect(result).toEqual(mockVoyage);

      // Creator added as participant
      expect(prisma.voyageParticipant.create).toHaveBeenCalledWith({
        data: {
          voyageId: 'voyage-1',
          userId: 'user-1',
          role: 'ADMIN',
        },
      });

      // Audit event created
      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          voyageId: 'voyage-1',
          actorUserId: 'user-1',
          eventType: 'VOYAGE_CREATED',
          entityType: 'Voyage',
          entityId: 'voyage-1',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should apply filters correctly', async () => {
      const voyages = [mockVoyage];
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue(voyages);
      (prisma.voyage.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll('company-1', {
        status: 'DRAFT' as any,
        search: 'Pacific',
        vesselName: 'Pacific',
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(voyages);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      // Verify the where clause was constructed with filters
      const findManyCall = (prisma.voyage.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where).toHaveProperty('companyId', 'company-1');
      expect(findManyCall.where).toHaveProperty('status', 'DRAFT');
      expect(findManyCall.where).toHaveProperty('vesselName');
      expect(findManyCall.where).toHaveProperty('OR');
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(10);
    });

    it('should use default pagination when not provided', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.voyage.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll('company-1', {});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);

      const findManyCall = (prisma.voyage.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.skip).toBe(0);
      expect(findManyCall.take).toBe(20);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for non-existent voyage', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong company', async () => {
      const voyageWithParticipants = {
        ...mockVoyage,
        companyId: 'other-company',
        participants: [],
      };
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(
        voyageWithParticipants,
      );

      await expect(
        service.findOne('voyage-1', 'company-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return voyage for correct company', async () => {
      const voyageWithParticipants = {
        ...mockVoyage,
        participants: [],
        _count: { conversations: 2, files: 1, extractedTerms: 5 },
      };
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(
        voyageWithParticipants,
      );

      const result = await service.findOne('voyage-1', 'company-1');

      expect(result.id).toBe('voyage-1');
    });
  });

  describe('archive', () => {
    it('should set status to ARCHIVED', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);
      const archivedVoyage = { ...mockVoyage, status: 'ARCHIVED' };
      (prisma.voyage.update as jest.Mock).mockResolvedValue(archivedVoyage);

      const result = await service.archive('voyage-1', 'company-1', 'user-1');

      expect(result.status).toBe('ARCHIVED');
      expect(prisma.voyage.update).toHaveBeenCalledWith({
        where: { id: 'voyage-1' },
        data: { status: 'ARCHIVED' },
      });

      expect(prisma.auditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'VOYAGE_ARCHIVED',
        }),
      });
    });

    it('should throw NotFoundException for non-existent voyage', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.archive('nonexistent', 'company-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for wrong company', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);

      await expect(
        service.archive('voyage-1', 'other-company', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('addParticipant', () => {
    it('should create participant record', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);
      (prisma.voyageParticipant.findFirst as jest.Mock).mockResolvedValue(null);

      const newParticipant = {
        id: 'participant-2',
        voyageId: 'voyage-1',
        userId: 'user-2',
        role: 'VIEWER',
        user: {
          id: 'user-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@test.com',
          avatarUrl: null,
        },
      };
      (prisma.voyageParticipant.create as jest.Mock).mockResolvedValue(
        newParticipant,
      );

      const result = await service.addParticipant(
        'voyage-1',
        'company-1',
        { userId: 'user-2', role: 'VIEWER' },
      );

      expect(result).toEqual(newParticipant);
      expect(prisma.voyageParticipant.create).toHaveBeenCalledWith({
        data: {
          voyageId: 'voyage-1',
          userId: 'user-2',
          role: 'VIEWER',
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
    });

    it('should return existing participant if duplicate', async () => {
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);

      const existingParticipant = {
        id: 'participant-1',
        voyageId: 'voyage-1',
        userId: 'user-2',
        role: 'VIEWER',
      };
      (prisma.voyageParticipant.findFirst as jest.Mock).mockResolvedValue(
        existingParticipant,
      );

      const result = await service.addParticipant(
        'voyage-1',
        'company-1',
        { userId: 'user-2', role: 'VIEWER' },
      );

      expect(result).toEqual(existingParticipant);
      expect(prisma.voyageParticipant.create).not.toHaveBeenCalled();
    });
  });
});
