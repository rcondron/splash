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
import { ContractsService } from './contracts.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('voyages/:voyageId/contracts/generate')
  async generate(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @Body() body: { recapId: string; templateName: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractsService.generateContract(voyageId, body, user.sub);
  }

  @Get('voyages/:voyageId/contracts')
  async list(@Param('voyageId', ParseUUIDPipe) voyageId: string) {
    return this.contractsService.findByVoyage(voyageId);
  }

  @Get('contracts/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contractsService.findById(id);
  }

  @Patch('contracts/:id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { bodyMarkdown: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.contractsService.update(id, body, user.sub);
  }
}
