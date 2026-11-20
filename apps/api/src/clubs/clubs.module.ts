import { Module } from '@nestjs/common';
import { StandingsModule } from '../standings/standings.module';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';

@Module({
  imports: [StandingsModule],
  controllers: [ClubsController],
  providers: [ClubsService],
})
export class ClubsModule {}
