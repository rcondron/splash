import { Module } from '@nestjs/common';
import { DealSnapshotsController } from './deal-snapshots.controller';
import { DealSnapshotsService } from './deal-snapshots.service';

@Module({
  controllers: [DealSnapshotsController],
  providers: [DealSnapshotsService],
  exports: [DealSnapshotsService],
})
export class DealSnapshotsModule {}
