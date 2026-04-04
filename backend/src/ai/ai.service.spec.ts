import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService, ExtractedTermResult, AiResponse } from './ai.service';
import { PrismaService } from '../prisma.service';

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: PrismaService,
          useValue: {
            message: {
              findMany: jest.fn(),
            },
          },
        },
        {
          // No AI_API_URL or AI_API_KEY so the service falls back to MockAiProvider
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractTerms', () => {
    it('should return structured terms from the mock provider', async () => {
      const result: AiResponse<ExtractedTermResult[]> =
        await service.extractTerms(
          'Vessel MV Pacific Star loading at Rotterdam discharging Singapore, freight $15.50/MT',
        );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('model', 'mock-v1');
      expect(result).toHaveProperty('promptVersion', '1.0.0');
      expect(result).toHaveProperty('source', 'mock');

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Verify the shape of each extracted term
      for (const term of result.data) {
        expect(term).toHaveProperty('termType');
        expect(term).toHaveProperty('rawValue');
        expect(term).toHaveProperty('normalizedValue');
        expect(term).toHaveProperty('confidence');
        expect(typeof term.confidence).toBe('number');
        expect(term.confidence).toBeGreaterThanOrEqual(0);
        expect(term.confidence).toBeLessThanOrEqual(1);
      }

      // Verify known term types are present
      const termTypes = result.data.map((t) => t.termType);
      expect(termTypes).toContain('VESSEL');
      expect(termTypes).toContain('LOAD_PORT');
      expect(termTypes).toContain('DISCHARGE_PORT');
      expect(termTypes).toContain('FREIGHT_RATE');
      expect(termTypes).toContain('LAYCAN');
    });
  });

  describe('summarizeConversation', () => {
    it('should return a summary string from the mock provider', async () => {
      const messages = [
        '[2025-01-01T00:00:00Z] Let us discuss vessel nomination for the Rotterdam-Singapore run.',
        '[2025-01-01T01:00:00Z] We propose MV Pacific Star, freight rate $15.50/MT.',
        '[2025-01-01T02:00:00Z] Laycan 15-20 next month works for us.',
      ];

      const result: AiResponse<string> =
        await service.summarizeConversation(messages);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('model', 'mock-v1');
      expect(result).toHaveProperty('promptVersion', '1.0.0');
      expect(result).toHaveProperty('source', 'mock');

      expect(typeof result.data).toBe('string');
      expect(result.data.length).toBeGreaterThan(0);

      // The mock returns a summary that mentions key terms
      expect(result.data).toContain('Rotterdam');
      expect(result.data).toContain('Singapore');
      expect(result.data).toContain('15.50');
    });
  });

  describe('generateRecap', () => {
    it('should return a markdown recap from the mock provider', async () => {
      const terms = {
        vessel: 'MV Pacific Star',
        loadPort: 'Rotterdam',
        dischargePort: 'Singapore',
        freightRate: '15.50 USD/MT',
        laycan: '15-20',
      };

      const voyageInfo = {
        voyageName: 'Test Voyage',
        cargoType: 'Wheat',
        cargoQuantity: '50000 MT',
      };

      const result: AiResponse<string> = await service.generateRecap(
        terms,
        voyageInfo,
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('model', 'mock-v1');
      expect(result).toHaveProperty('promptVersion', '1.0.0');
      expect(result).toHaveProperty('source', 'mock');

      expect(typeof result.data).toBe('string');
      expect(result.data.length).toBeGreaterThan(0);

      // The mock recap should be in markdown format
      expect(result.data).toContain('# Voyage Recap');
      expect(result.data).toContain('MV Pacific Star');
      expect(result.data).toContain('Rotterdam');
      expect(result.data).toContain('Singapore');
      expect(result.data).toContain('15.50');
    });
  });

  describe('generateContractDraft', () => {
    it('should return a markdown contract draft from the mock provider', async () => {
      const recap = {
        vessel: 'MV Pacific Star',
        loadPort: 'Rotterdam',
        dischargePort: 'Singapore',
      };

      const result: AiResponse<string> =
        await service.generateContractDraft(recap, 'GENCON 2022');

      expect(result).toHaveProperty('data');
      expect(result.source).toBe('mock');

      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('Charter Party Contract');
      expect(result.data).toContain('MV Pacific Star');
      expect(result.data).toContain('Rotterdam');
    });
  });

  describe('summarizeVoyageConversations', () => {
    it('should fetch messages from prisma and summarize them', async () => {
      const mockMessages = [
        {
          plainTextBody: 'Discussing vessel nomination.',
          sentAt: new Date('2025-01-01T00:00:00Z'),
        },
        {
          plainTextBody: 'Freight rate agreed at $15.50/MT.',
          sentAt: new Date('2025-01-01T01:00:00Z'),
        },
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await service.summarizeVoyageConversations('voyage-123');

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversation: { voyageId: 'voyage-123' } },
        orderBy: { sentAt: 'asc' },
        select: { plainTextBody: true, sentAt: true },
        take: 200,
      });

      expect(result).toHaveProperty('data');
      expect(typeof result.data).toBe('string');
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('extractTermsFromVoyageMessages', () => {
    it('should fetch messages from prisma and extract terms', async () => {
      const mockMessages = [
        { plainTextBody: 'Vessel MV Pacific Star, load port Rotterdam.' },
        { plainTextBody: 'Discharge Singapore, freight $15.50/MT.' },
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result =
        await service.extractTermsFromVoyageMessages('voyage-456');

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversation: { voyageId: 'voyage-456' } },
        orderBy: { sentAt: 'asc' },
        select: { plainTextBody: true },
        take: 200,
      });

      expect(result).toHaveProperty('data');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });
});
