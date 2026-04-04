import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { RecapsService } from './recaps.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class RecapsController {
  constructor(private readonly recapsService: RecapsService) {}

  @Post('voyages/:voyageId/recaps/generate')
  async generate(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recapsService.generateRecap(voyageId, user.sub);
  }

  @Get('voyages/:voyageId/recaps')
  async list(@Param('voyageId', ParseUUIDPipe) voyageId: string) {
    return this.recapsService.findByVoyage(voyageId);
  }

  @Get('recaps/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recapsService.findById(id);
  }

  @Patch('recaps/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { bodyMarkdown: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recapsService.update(id, body, user.sub);
  }

  @Get('recaps/:id/export/html')
  async exportHtml(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const html = await this.recapsService.exportHtml(id);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="recap-${id}.html"`,
    );
    res.send(html);
  }
}
