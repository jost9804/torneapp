import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccessModule } from './access/access.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { MatchesModule } from './matches/matches.module';
import { MembershipsModule } from './memberships/memberships.module';
import { PlayersModule } from './players/players.module';
import { PrismaModule } from './prisma/prisma.module';
import { StandingsModule } from './standings/standings.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AccessModule,
    MembershipsModule,
    TournamentsModule,
    TeamsModule,
    PlayersModule,
    FixturesModule,
    MatchesModule,
    StandingsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
