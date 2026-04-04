import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RecapsService } from './recaps.service';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('RecapsService', () => {
  let service: RecapsService;
  let prisma: PrismaService;
  let aiService: AiService;
  let auditService: AuditService;

  const mockVoyage = {
    id: 'voyage-1',
    voyageName: 'Test Voyage',
    vesselName: 'MV Pacific Star',
    cargoType: 'Wheat',
    cargoQuantity: '50000 MT',
    loadPort: 'Rotterdam',
    dischargePort: 'Singapore',
    laycanStart: new Date('2025-03-01'),
    laycanEnd: new Date('2025-03-05'),
    freightRate: '15.50',
    freightCurrency: 'USD',
    status: 'NEGOTIATING',
  };

  const mockRecap = {
    id: 'recap-1',
    voyageId: 'voyage-1',
    title: 'Recap v1 - Test Voyage',
    bodyMarkdown: '# Voyage Recap\n\nVessel: MV Pacific Star',
    bodyHtml: '<p><h1>Voyage Recap</h1></p>',
    versionNumber: 1,
    generatedBy: 'AI',
    createdByUserId: 'user-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    createdByUser: {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecapsService,
        {
          provide: PrismaService,
          useValue: {
            extractedTerm: {
              findMany: jest.fn(),
            },
            voyage: {
              findUnique: jest.fn(),
            },
            recap: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: AiService,
          useValue: {
            generateRecap: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createEvent: jest.fn().mockResolvedValue({}),
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

    service = module.get<RecapsService>(RecapsService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRecap', () => {
    it('should gather accepted terms and call AI service', async () => {
      const mockTerms = [
        {
          id: 't1',
          termType: 'VESSEL',
          rawValue: 'MV Pacific Star',
          normalizedValue: 'MV Pacific Star',
          createdAt: new Date(),
        },
      ];

      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue(mockTerms);
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);
      (prisma.recap.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recap.create as jest.Mock).mockResolvedValue(mockRecap);
      (aiService.generateRecap as jest.Mock).mockResolvedValue({
        data: '# Voyage Recap\n\nVessel: MV Pacific Star',
        model: 'mock-v1',
        promptVersion: '1.0.0',
        source: 'mock',
      });

      const result = await service.generateRecap('voyage-1', 'user-1');

      expect(prisma.extractedTerm.findMany).toHaveBeenCalledWith({
        where: {
          voyageId: 'voyage-1',
          extractionStatus: 'ACCEPTED',
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(aiService.generateRecap).toHaveBeenCalledWith(
        {
          terms: [
            {
              termType: 'VESSEL',
              rawValue: 'MV Pacific Star',
              normalizedValue: 'MV Pacific Star',
            },
          ],
        },
        expect.objectContaining({
          voyageName: 'Test Voyage',
          vesselName: 'MV Pacific Star',
        }),
      );

      expect(result).toEqual(mockRecap);
    });

    it('should create audit event', async () => {
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);
      (prisma.recap.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recap.create as jest.Mock).mockResolvedValue(mockRecap);
      (aiService.generateRecap as jest.Mock).mockResolvedValue({
        data: '# Recap',
        model: 'mock-v1',
        promptVersion: '1.0.0',
        source: 'mock',
      });

      await service.generateRecap('voyage-1', 'user-1');

      expect(auditService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          voyageId: 'voyage-1',
          actorUserId: 'user-1',
          eventType: 'RECAP_GENERATED',
          entityType: 'Recap',
          entityId: 'recap-1',
        }),
      );
    });

    it('should version correctly (first = 1, subsequent increments)', async () => {
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(mockVoyage);
      (aiService.generateRecap as jest.Mock).mockResolvedValue({
        data: '# Recap',
        model: 'mock-v1',
        promptVersion: '1.0.0',
        source: 'mock',
      });

      // First recap - no previous
      (prisma.recap.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.recap.create as jest.Mock).mockResolvedValue({
        ...mockRecap,
        versionNumber: 1,
      });

      await service.generateRecap('voyage-1', 'user-1');

      expect(prisma.recap.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ versionNumber: 1 }),
      });

      // Second recap - previous exists with version 1
      (prisma.recap.findFirst as jest.Mock).mockResolvedValue({
        versionNumber: 1,
      });
      (prisma.recap.create as jest.Mock).mockResolvedValue({
        ...mockRecap,
        versionNumber: 2,
      });

      await service.generateRecap('voyage-1', 'user-1');

      expect(prisma.recap.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ versionNumber: 2 }),
      });
    });

    it('should throw NotFoundException if voyage does not exist', async () => {
      (prisma.extractedTerm.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.voyage.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.generateRecap('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should modify body and create audit event', async () => {
      (prisma.recap.findUnique as jest.Mock).mockResolvedValue(mockRecap);

      const updatedRecap = {
        ...mockRecap,
        bodyMarkdown: '# Updated Recap',
        bodyHtml: '<p><h1>Updated Recap</h1></p>',
      };
      (prisma.recap.update as jest.Mock).mockResolvedValue(updatedRecap);

      const result = await service.update(
        'recap-1',
        { bodyMarkdown: '# Updated Recap' },
        'user-1',
      );

      expect(result.bodyMarkdown).toBe('# Updated Recap');
      expect(prisma.recap.update).toHaveBeenCalledWith({
        where: { id: 'recap-1' },
        data: {
          bodyMarkdown: '# Updated Recap',
          bodyHtml: expect.any(String),
        },
      });

      expect(auditService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'RECAP_EDITED',
          entityType: 'Recap',
          entityId: 'recap-1',
        }),
      );
    });
  });

  describe('exportHtml', () => {
    it('should return valid HTML document', async () => {
      (prisma.recap.findUnique as jest.Mock).mockResolvedValue(mockRecap);

      const html = await service.exportHtml('recap-1');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain(mockRecap.title);
      expect(html).toContain('Version: 1');
    });
  });
});
