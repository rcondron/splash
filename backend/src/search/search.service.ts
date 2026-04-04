import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface SearchFilters {
  q: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchResults {
  voyages: any[];
  messages: any[];
  terms: any[];
  recaps: any[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: SearchFilters, companyId: string): Promise<SearchResults> {
    const { q, type, status, dateFrom, dateTo } = filters;

    if (!q || q.trim().length === 0) {
      return { voyages: [], messages: [], terms: [], recaps: [] };
    }

    const searchPattern = `%${q}%`;
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    const hasDateFilter = dateFrom || dateTo;

    const types = type ? type.split(',') : ['voyages', 'messages', 'terms', 'recaps'];

    const results: SearchResults = {
      voyages: [],
      messages: [],
      terms: [],
      recaps: [],
    };

    if (types.includes('voyages')) {
      const where: Prisma.VoyageWhereInput = {
        companyId,
        OR: [
          { voyageName: { contains: q, mode: 'insensitive' } },
          { vesselName: { contains: q, mode: 'insensitive' } },
          { internalReference: { contains: q, mode: 'insensitive' } },
          { cargoType: { contains: q, mode: 'insensitive' } },
          { loadPort: { contains: q, mode: 'insensitive' } },
          { dischargePort: { contains: q, mode: 'insensitive' } },
          { ownerCompanyName: { contains: q, mode: 'insensitive' } },
          { chartererCompanyName: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (status) {
        where.status = status as any;
      }
      if (hasDateFilter) {
        where.createdAt = dateFilter;
      }

      results.voyages = await this.prisma.voyage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          voyageName: true,
          vesselName: true,
          internalReference: true,
          status: true,
          loadPort: true,
          dischargePort: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    if (types.includes('messages')) {
      const where: Prisma.MessageWhereInput = {
        conversation: {
          voyage: { companyId },
        },
        OR: [
          { plainTextBody: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (hasDateFilter) {
        where.createdAt = dateFilter;
      }

      results.messages = await this.prisma.message.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: 20,
        select: {
          id: true,
          plainTextBody: true,
          messageType: true,
          sentAt: true,
          conversationId: true,
          conversation: {
            select: {
              id: true,
              title: true,
              voyageId: true,
              voyage: {
                select: { id: true, voyageName: true },
              },
            },
          },
          author: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }

    if (types.includes('terms')) {
      const where: Prisma.ExtractedTermWhereInput = {
        voyage: { companyId },
        OR: [
          { rawValue: { contains: q, mode: 'insensitive' } },
          { normalizedValue: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (status) {
        where.extractionStatus = status as any;
      }
      if (hasDateFilter) {
        where.createdAt = dateFilter;
      }

      results.terms = await this.prisma.extractedTerm.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          termType: true,
          rawValue: true,
          normalizedValue: true,
          extractionStatus: true,
          voyageId: true,
          createdAt: true,
          voyage: {
            select: { id: true, voyageName: true },
          },
        },
      });
    }

    if (types.includes('recaps')) {
      const where: Prisma.RecapWhereInput = {
        voyage: { companyId },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { bodyMarkdown: { contains: q, mode: 'insensitive' } },
        ],
      };
      if (hasDateFilter) {
        where.createdAt = dateFilter;
      }

      results.recaps = await this.prisma.recap.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          versionNumber: true,
          voyageId: true,
          generatedBy: true,
          createdAt: true,
          voyage: {
            select: { id: true, voyageName: true },
          },
        },
      });
    }

    return results;
  }
}
