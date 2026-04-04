import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExtractedTermsService } from './extracted-terms.service';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

describe('ExtractedTermsService', () => {
  let service: ExtractedTermsService;
  let prisma: PrismaService;
  let auditService: AuditService;

  const mockTerm = {
    id: 'term-1',
    voyageId: 'voyage-1',
    termType: 'VESSEL',
    rawValue: 'MV Pacific Star',
    normalizedValue: 'MV Pacific Star',
    confidenceScore: 0.95,
    extractionStatus: 'PROPOSED',
    proposedBy: 'USER',
    sourceMessageId: 'msg-1',
    sourceConversationId: 'conv-1',
    approvedByUserId: null,
    supersededById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sourceMessage: null,
    approvedBy: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractedTermsService,
        {
          provide: PrismaService,
          useValue: {
            extractedTerm: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            createEvent: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<ExtractedTermsService>(ExtractedTermsService);
    prisma = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a term with correct fields', async () => {
      const dto = {
        termType: 'VESSEL' as any,
        rawValue: 'MV Pacific Star',
        normalizedValue: 'MV Pacific Star',
        confidenceScore: 0.95,
        sourceMessageId: 'msg-1',
        sourceConversationId: 'conv-1',
      };

      const createdTerm = { ...mockTerm };
      (prisma.extractedTerm.create as jest.Mock).mockResolvedValue(createdTerm);

      const result = await service.create('voyage-1', dto, 'user-1');

      expect(result).toEqual(createdTerm);
      expect(prisma.extractedTerm.create).toHaveBeenCalledWith({
        data: {
          voyageId: 'voyage-1',
          termType: 'VESSEL',
          rawValue: 'MV Pacific Star',
          normalizedValue: 'MV Pacific Star',
          confidenceScore: 0.95,
          sourceMessageId: 'msg-1',
          sourceConversationId: 'conv-1',
          extractionStatus: 'PROPOSED',
          proposedBy: 'USER',
        },
      });

      expect(auditService.createEvent).toHaveBeenCalledWith({
        voyageId: 'voyage-1',
        actorUserId: 'user-1',
        eventType: 'TERM_CREATED',
        entityType: 'ExtractedTerm',
        entityId: 'term-1',
        metadata: { termType: 'VESSEL', rawValue: 'MV Pacific Star' },
      });
    });
  });

  describe('accept', () => {
    it('should change status to ACCEPTED and set approvedByUserId', async () => {
      const proposedTerm = { ...mockTerm, extractionStatus: 'PROPOSED' };
      (prisma.extractedTerm.findUnique as jest.Mock).mockResolvedValue(proposedTerm);

      const acceptedTerm = {
        ...proposedTerm,
        extractionStatus: 'ACCEPTED',
        approvedByUserId: 'user-1',
      };
      (prisma.extractedTerm.update as jest.Mock).mockResolvedValue(acceptedTerm);

      const result = await service.accept('term-1', 'user-1');

      expect(result.extractionStatus).toBe('ACCEPTED');
      expect(result.approvedByUserId).toBe('user-1');
      expect(prisma.extractedTerm.update).toHaveBeenCalledWith({
        where: { id: 'term-1' },
        data: {
          extractionStatus: 'ACCEPTED',
          approvedByUserId: 'user-1',
        },
      });

      expect(auditService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'TERM_ACCEPTED',
          entityId: 'term-1',
        }),
      );
    });

    it('should throw BadRequestException if term is already ACCEPTED', async () => {
      const acceptedTerm = { ...mockTerm, extractionStatus: 'ACCEPTED' };
      (prisma.extractedTerm.findUnique as jest.Mock).mockResolvedValue(acceptedTerm);

      await expect(service.accept('term-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reject', () => {
    it('should change status to REJECTED', async () => {
      const proposedTerm = { ...mockTerm, extractionStatus: 'PROPOSED' };
      (prisma.extractedTerm.findUnique as jest.Mock).mockResolvedValue(proposedTerm);

      const rejectedTerm = { ...proposedTerm, extractionStatus: 'REJECTED' };
      (prisma.extractedTerm.update as jest.Mock).mockResolvedValue(rejectedTerm);

      const result = await service.reject('term-1', 'user-1');

      expect(result.extractionStatus).toBe('REJECTED');
      expect(prisma.extractedTerm.update).toHaveBeenCalledWith({
        where: { id: 'term-1' },
        data: {
          extractionStatus: 'REJECTED',
        },
      });

      expect(auditService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'TERM_REJECTED',
          entityId: 'term-1',
        }),
      );
    });
  });

  describe('update', () => {
    it('should create new term and mark old as SUPERSEDED', async () => {
      const oldTerm = { ...mockTerm, extractionStatus: 'PROPOSED' };
      (prisma.extractedTerm.findUnique as jest.Mock).mockResolvedValue(oldTerm);

      const newTerm = {
        ...mockTerm,
        id: 'term-2',
        rawValue: 'MV Atlantic Star',
        extractionStatus: 'PROPOSED',
      };

      const mockTx = {
        extractedTerm: {
          create: jest.fn().mockResolvedValue(newTerm),
          update: jest.fn().mockResolvedValue({
            ...oldTerm,
            extractionStatus: 'SUPERSEDED',
            supersededById: 'term-2',
          }),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb) =>
        cb(mockTx),
      );

      const result = await service.update(
        'term-1',
        { rawValue: 'MV Atlantic Star' },
        'user-1',
      );

      expect(result).toEqual(newTerm);

      // Verify the transaction created new term
      expect(mockTx.extractedTerm.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          voyageId: 'voyage-1',
          rawValue: 'MV Atlantic Star',
          extractionStatus: 'PROPOSED',
          proposedBy: 'USER',
        }),
      });

      // Verify old term marked as SUPERSEDED
      expect(mockTx.extractedTerm.update).toHaveBeenCalledWith({
        where: { id: 'term-1' },
        data: {
          extractionStatus: 'SUPERSEDED',
          supersededById: 'term-2',
        },
      });

      expect(auditService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'TERM_EDITED',
          entityId: 'term-2',
          metadata: expect.objectContaining({ previousTermId: 'term-1' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when term does not exist', async () => {
      (prisma.extractedTerm.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
