import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditService, AuditFilters } from './audit.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('voyages/:voyageId/audit')
  async list(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @Query('eventType') eventType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('actorUserId') actorUserId?: string,
  ) {
    const filters: AuditFilters = { eventType, dateFrom, dateTo, actorUserId };
    return this.auditService.findByVoyage(voyageId, filters);
  }

  @Get('audit/export/:voyageId')
  async export(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @Res() res: Response,
  ) {
    const events = await this.auditService.exportByVoyage(voyageId);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-${voyageId}.json"`,
    );
    res.json(events);
  }
}
