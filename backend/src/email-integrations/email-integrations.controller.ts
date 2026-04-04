import {
  Controller,
  Get,
  Post,
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
  EmailIntegrationsService,
  ConnectEmailDto,
  ImportEmailDto,
} from './email-integrations.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class EmailIntegrationsController {
  constructor(
    private readonly emailIntegrationsService: EmailIntegrationsService,
  ) {}

  @Post('email-integrations/connect')
  async connect(
    @Body() dto: ConnectEmailDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.emailIntegrationsService.connect(dto, user.sub);
  }

  @Get('email-integrations')
  async list(@CurrentUser() user: JwtPayload) {
    return this.emailIntegrationsService.findByUser(user.sub);
  }

  @Post('voyages/:voyageId/emails/import')
  async importEmail(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @Body() dto: ImportEmailDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.emailIntegrationsService.importEmail(
      voyageId,
      dto,
      user.sub,
    );
  }

  @Get('voyages/:voyageId/emails')
  async listEmails(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
  ) {
    return this.emailIntegrationsService.findEmailsByVoyage(voyageId);
  }
}
