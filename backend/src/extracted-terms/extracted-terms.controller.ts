import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import {
  ExtractedTermsService,
  CreateTermDto,
  UpdateTermDto,
} from './extracted-terms.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ExtractedTermsController {
  constructor(
    private readonly extractedTermsService: ExtractedTermsService,
  ) {}

  @Get('voyages/:voyageId/terms')
  async list(@Param('voyageId', ParseUUIDPipe) voyageId: string) {
    return this.extractedTermsService.findByVoyage(voyageId);
  }

  @Post('voyages/:voyageId/terms')
  async create(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @Body() dto: CreateTermDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.extractedTermsService.create(voyageId, dto, user.sub);
  }

  @Patch('terms/:id/accept')
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.extractedTermsService.accept(id, user.sub);
  }

  @Patch('terms/:id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.extractedTermsService.reject(id, user.sub);
  }

  @Patch('terms/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTermDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.extractedTermsService.update(id, dto, user.sub);
  }
}
