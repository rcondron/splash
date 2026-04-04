import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { DealSnapshotsService } from './deal-snapshots.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class DealSnapshotsController {
  constructor(private readonly dealSnapshotsService: DealSnapshotsService) {}

  @Post('voyages/:voyageId/snapshots')
  async create(
    @Param('voyageId', ParseUUIDPipe) voyageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.dealSnapshotsService.createSnapshot(voyageId, user.sub);
  }

  @Get('voyages/:voyageId/snapshots')
  async list(@Param('voyageId', ParseUUIDPipe) voyageId: string) {
    return this.dealSnapshotsService.findByVoyage(voyageId);
  }

  @Get('snapshots/compare')
  async compare(
    @Query('id1', ParseUUIDPipe) id1: string,
    @Query('id2', ParseUUIDPipe) id2: string,
  ) {
    return this.dealSnapshotsService.compareSnapshots(id1, id2);
  }

  @Get('snapshots/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.dealSnapshotsService.findById(id);
  }
}
