import { Module } from '@nestjs/common';
import { ExtractedTermsController } from './extracted-terms.controller';
import { ExtractedTermsService } from './extracted-terms.service';

@Module({
  controllers: [ExtractedTermsController],
  providers: [ExtractedTermsService],
  exports: [ExtractedTermsService],
})
export class ExtractedTermsModule {}
