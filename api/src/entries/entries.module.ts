import { Module } from '@nestjs/common';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';

@Module({
  providers: [EntriesService],
  controllers: [EntriesController],
})
export class EntriesModule {}
