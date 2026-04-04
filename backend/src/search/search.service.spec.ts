import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: PrismaService,
          useValue: {
            voyage: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            message: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            extractedTerm: {
              findMany: jest.fn().mockResolvedValue([]),
            },
            recap: {
              findMany: jest.fn().mockResolvedValue([]),
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
    it('should query across all entity types when no type filter', async () => {
      const mockVoyages = [
        {
          id: 'v-1',
          voyageName: 'Pacific Run',
          vesselName: 'MV Pacific Star',
          status: 'FIXING',
        },
      ];
      const mockMessages = [
        {
          id: 'm-1',
          plainTextBody: 'Discussing Pacific route',
          sentAt: new Date(),
        },
      ];

      (prisma.voyage.findMany as jest.Mock).mockResolvedValue(mockVoyages);
      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await service.search(
        { q: 'Pacific' },
        'company-1',
      );

      expect(prisma.voyage.findMany).toHaveBeenCalled();
      expect(prisma.message.findMany).toHaveBeenCalled();
      expect(prisma.extractedTerm.findMany).toHaveBeenCalled();
      expect(prisma.recap.findMany).toHaveBeenCalled();

      expect(result.voyages).toEqual(mockVoyages);
      expect(result.messages).toEqual(mockMessages);
    });

    it('should only query specified type when type filter is set', async () => {
      const mockVoyages = [
        { id: 'v-1', voyageName: 'Test', status: 'DRAFT' },
      ];
      (prisma.voyage.findMany as jest.Mock).mockResolvedValue(mockVoyages);

      const result = await service.search(
        { q: 'Test', type: 'voyages' },
        'company-1',
      );

      expect(prisma.voyage.findMany).toHaveBeenCalled();
      expect(prisma.message.findMany).not.toHaveBeenCalled();
      expect(prisma.extractedTerm.findMany).not.toHaveBeenCalled();
      expect(prisma.recap.findMany).not.toHaveBeenCalled();

      expect(result.voyages).toEqual(mockVoyages);
      expect(result.messages).toEqual([]);
      expect(result.terms).toEqual([]);
      expect(result.recaps).toEqual([]);
    });

    it('should return empty results for no matches', async () => {
      const result = await service.search(
        { q: 'nonexistent-query-xyz' },
        'company-1',
      );

      expect(result.voyages).toEqual([]);
      expect(result.messages).toEqual([]);
      expect(result.terms).toEqual([]);
      expect(result.recaps).toEqual([]);
    });

    it('should return empty results for empty query', async () => {
      const result = await service.search({ q: '' }, 'company-1');

      expect(result).toEqual({
        voyages: [],
        messages: [],
        terms: [],
        recaps: [],
      });

      // Should not call any prisma methods for empty query
      expect(prisma.voyage.findMany).not.toHaveBeenCalled();
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('should apply date filters when provided', async () => {
      await service.search(
        {
          q: 'test',
          dateFrom: '2025-01-01',
          dateTo: '2025-12-31',
        },
        'company-1',
      );

      const voyageCall = (prisma.voyage.findMany as jest.Mock).mock.calls[0][0];
      expect(voyageCall.where.createdAt).toBeDefined();
      expect(voyageCall.where.createdAt.gte).toEqual(new Date('2025-01-01'));
      expect(voyageCall.where.createdAt.lte).toEqual(new Date('2025-12-31'));
    });

    it('should apply status filter to voyages', async () => {
      await service.search(
        { q: 'test', type: 'voyages', status: 'DRAFT' },
        'company-1',
      );

      const voyageCall = (prisma.voyage.findMany as jest.Mock).mock.calls[0][0];
      expect(voyageCall.where.status).toBe('DRAFT');
    });
  });
});
