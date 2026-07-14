import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { generateRoundRobin } from '../src/fixtures/round-robin';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const TEAM_NAMES = [
  'Atlético Moniquirá',
  'Deportivo Boyacá',
  'Real Barbosa',
  'Juventud Chitaraque',
  'Unión Togüí',
  'Santana FC',
  'Independiente Suaita',
  'Racing Oiba',
];

const FIRST_NAMES = [
  'Carlos', 'Andrés', 'Juan', 'Luis', 'Miguel', 'Jorge', 'Fernando',
  'Ricardo', 'Sergio', 'Iván', 'Óscar', 'Camilo', 'Diego', 'Julián',
];
const LAST_NAMES = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flórez', 'Vargas', 'Castro',
];
const POSITIONS = ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'];

function playerName(seed: number): string {
  return `${FIRST_NAMES[seed % FIRST_NAMES.length]} ${LAST_NAMES[(seed * 7) % LAST_NAMES.length]}`;
}

async function main() {
  const existing = await prisma.tournament.findFirst({
    where: { name: 'Torneo Demo Fútbol 11' },
  });
  if (existing) {
    console.log('Demo tournament already exists, skipping seed.');
    return;
  }

  const tournament = await prisma.tournament.create({
    data: { name: 'Torneo Demo Fútbol 11', format: 'ROUND_ROBIN', status: 'ACTIVE' },
  });

  const teams: Awaited<ReturnType<typeof createTeam>>[] = [];
  const createTeam = (name: string) =>
    prisma.team.create({
      data: {
        name,
        tournamentId: tournament.id,
        players: {
          create: POSITIONS.map((position, i) => ({
            name: playerName(TEAM_NAMES.indexOf(name) * 11 + i),
            number: i + 1,
            position,
          })),
        },
      },
      include: { players: true },
    });
  for (const name of TEAM_NAMES) {
    teams.push(await createTeam(name));
  }

  const pairings = generateRoundRobin(teams.map((t) => t.id));
  await prisma.match.createMany({
    data: pairings.map((p) => ({ ...p, tournamentId: tournament.id })),
  });

  // Play the first 3 rounds with deterministic scores
  const toPlay = await prisma.match.findMany({
    where: { tournamentId: tournament.id, round: { lte: 3 } },
    orderBy: [{ round: 'asc' }],
  });

  let n = 0;
  for (const match of toPlay) {
    const homeScore = (n * 2 + match.round) % 4;
    const awayScore = (n + 3) % 3;
    n++;

    const homeTeam = teams.find((t) => t.id === match.homeTeamId)!;
    const awayTeam = teams.find((t) => t.id === match.awayTeamId)!;
    const forwards = (team: typeof homeTeam) =>
      team.players.filter((p) => p.position === 'FW' || p.position === 'MF');

    const goals = [
      ...Array.from({ length: homeScore }, (_, i) => ({
        playerId: forwards(homeTeam)[i % forwards(homeTeam).length].id,
        minute: 10 + i * 17,
      })),
      ...Array.from({ length: awayScore }, (_, i) => ({
        playerId: forwards(awayTeam)[i % forwards(awayTeam).length].id,
        minute: 20 + i * 23,
      })),
    ];

    await prisma.match.update({
      where: { id: match.id },
      data: {
        homeScore,
        awayScore,
        status: 'PLAYED',
        goals: { createMany: { data: goals } },
      },
    });
  }

  console.log(
    `Seeded tournament "${tournament.name}" with ${teams.length} teams, ` +
      `${pairings.length} matches (${toPlay.length} played).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
