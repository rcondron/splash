import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  const mockVoyage = {
    id: 'voyage-1',
    voyageName: 'Pacific Voyage',
    vesselName: 'MV Star',
    internalReference: 'REF-001',
    status: 'ACTIVE',
    loadPort: 'Singapore',
    dischargePort: 'Rotterdam',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessageResult = {
    id: 'msg-1',
    plainTextBody: 'Discussing Pacific route',
    messageType: 'USER_TEXT',
    sentAt: new Date(),
    conversationId: 'conv-1',
    conversation: {
      id: 'conv-1',
      title: 'Main Chat',
      voyageId: 'voyage-1',
      voyage: { id: 'voyage-1', voyageName: 'Pacific Voyage' },
    },
    author: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
  };

  const mockTermResult = {
    id: 'term-1',
    termType: 'VESSEL',
    rawValue: 'Pacific Star',
    normalizedValue: 'Pacific Star',
    extractionStatus: 'PROPOSED',
    voyageId: 'voyage-1',
    createdAt: new Date(),
    voyage: { id: 'voyage-1', voyageName: 'Pacific Voyage' },
  };

  const mockRecapResult = {
    id: 'recap-1',
    title: 'Pacific Voyage Recap',
    versionNumber: 1,
    voyageId: 'voyage-1',
    generatedBy: 'user-1',
    createdAt: new Date(),
    voyage: { id: 'voyage-1', voyageName: 'Pacific Voyage' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            voyage: {
              findMany: jest.fn(),
            },
            message: {
              findMany: jest.fn(),
            },
            extractedTerm: {
              findMany: jest.fn(),
            },
            recap: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return results across all entity types', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([mockVoyage]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessageResult]);
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([mockTermResult]);
      (prisma.recap.findMany as jest.Mock).mockResolvedValue([mockRecapResult]);

      const result = await service.search({ q: 'Pacific' }, 'company-1');

      expect(result.voyages).toHaveLength(1);
      expect(result.voyages[0].voyageName).toBe('Pacific Voyage');
      expect(result.messages).toHaveLength(1);
      expect(result.terms).toHaveLength(1);
      expect(result.recaps).toHaveLength(1);

      expect(prisma.voyage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1' }),
          take: 20,
        }),
      );
    });

    it('should filter by type when type parameter is provided', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([mockVoyage]);

      const result = await service.search(
        { q: 'Pacific', type: 'voyages' },
        'company-1',
      );

      expect(result.voyages).toHaveLength(1);
      expect(result.messages).toHaveLength(0);
      expect(result.terms).toHaveLength(0);
      expect(result.recaps).toHaveLength(0);

      expect(prisma.voyage.findMany).toHaveBeenCalled();
      expect(prisma.message.findMany).not.toHaveBeenCalled();
      expect(prisma.extractedTerm.findMany).not.toHaveBeenCalled();
      expect(prisma.recap.findMany).not.toHaveBeenCalled();
    });

    it('should return empty results for no matches', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.recap.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.search({ q: 'nonexistent' }, 'company-1');

      expect(result.voyages).toHaveLength(0);
      expect(result.messages).toHaveLength(0);
      expect(result.terms).toHaveLength(0);
      expect(result.recaps).toHaveLength(0);
    });

    it('should return empty results when query is empty', async () => {
      const result = await service.search({ q: '' }, 'company-1');

      expect(result).toEqual({
        voyages: [],
        messages: [],
        terms: [],
        recaps: [],
      });

      expect(prisma.voyage.findMany).not.toHaveBeenCalled();
    });

    it('should return empty results when query is whitespace', async () => {
      const result = await service.search({ q: '   ' }, 'company-1');

      expect(result).toEqual({
        voyages: [],
        messages: [],
        terms: [],
        recaps: [],
      });
    });

    it('should filter by multiple types when comma-separated', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([mockVoyage]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([mockMessageResult]);

      const result = await service.search(
        { q: 'Pacific', type: 'voyages,messages' },
        'company-1',
      );

      expect(result.voyages).toHaveLength(1);
      expect(result.messages).toHaveLength(1);
      expect(result.terms).toHaveLength(0);
      expect(result.recaps).toHaveLength(0);

      expect(prisma.extractedTerm.findMany).not.toHaveBeenCalled();
      expect(prisma.recap.findMany).not.toHaveBeenCalled();
    });

    it('should apply date filters when provided', async () => {
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.recap.findMany as jest.Mock).mockResolvedValue([]);

      await service.search(
        { q: 'Pacific', dateFrom: '2025-01-01', dateTo: '2025-12-31' },
        'company-1',
      );

      expect(prisma.voyage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });
});
