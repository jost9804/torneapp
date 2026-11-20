/**
 * Demo catalog for trying the app: 15 tournaments in every state, with teams, players,
 * fixtures, results, goals, cards and likes from demo fans.
 *
 *   npm run seed:demo            create the demo tournaments (skips if they exist)
 *   npm run seed:demo -- --reset delete them and the demo fans, then create them again
 *   npm run seed:demo -- --remove delete them and the demo fans
 *
 * Demo fans have no password, so nobody can sign in with them.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type TournamentFormat,
  type TournamentStatus,
} from '../src/generated/prisma/client';
import { generateRoundRobin } from '../src/fixtures/round-robin';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FAN_DOMAIN = 'demo.torneapp.test';
const FAN_COUNT = 40;

interface DemoTournament {
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  teams: number;
  /** Share of the fixture already played; DRAFT tournaments have no fixture */
  played: number;
  likes: number;
}

const TOURNAMENTS: DemoTournament[] = [
  {
    name: 'Copa Veredal Moniquirá 2026',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 8,
    played: 0.6,
    likes: 34,
  },
  {
    name: 'Liga Interbarrios Barbosa',
    format: 'ROUND_ROBIN_HOME_AWAY',
    status: 'ACTIVE',
    teams: 6,
    played: 0.4,
    likes: 27,
  },
  {
    name: 'Torneo Relámpago San José de Pare',
    format: 'ROUND_ROBIN',
    status: 'FINISHED',
    teams: 4,
    played: 1,
    likes: 12,
  },
  {
    name: 'Copa Empresarial Tunja',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 10,
    played: 0.3,
    likes: 21,
  },
  {
    name: 'Liga Juvenil Sub-17 Chiquinquirá',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 8,
    played: 0.5,
    likes: 18,
  },
  {
    name: 'Torneo de Veteranos Duitama',
    format: 'ROUND_ROBIN_HOME_AWAY',
    status: 'ACTIVE',
    teams: 5,
    played: 0.7,
    likes: 9,
  },
  {
    name: 'Copa Navideña Santana',
    format: 'ROUND_ROBIN',
    status: 'DRAFT',
    teams: 6,
    played: 0,
    likes: 4,
  },
  {
    name: 'Interveredal Togüí',
    format: 'ROUND_ROBIN',
    status: 'FINISHED',
    teams: 6,
    played: 1,
    likes: 15,
  },
  {
    name: 'Liga Femenina Sogamoso',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 6,
    played: 0.5,
    likes: 30,
  },
  {
    name: 'Copa Comunal Arcabuco',
    format: 'ROUND_ROBIN',
    status: 'DRAFT',
    teams: 4,
    played: 0,
    likes: 1,
  },
  {
    name: 'Torneo Universitario UPTC',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 8,
    played: 0.2,
    likes: 25,
  },
  {
    name: 'Liga de Microempresarios Paipa',
    format: 'ROUND_ROBIN',
    status: 'FINISHED',
    teams: 5,
    played: 1,
    likes: 7,
  },
  {
    name: 'Copa Fiestas del Retorno Chitaraque',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 6,
    played: 0.8,
    likes: 16,
  },
  {
    name: 'Torneo Senior Villa de Leyva',
    format: 'ROUND_ROBIN_HOME_AWAY',
    status: 'DRAFT',
    teams: 4,
    played: 0,
    likes: 3,
  },
  {
    name: 'Liga Escolar Garagoa',
    format: 'ROUND_ROBIN',
    status: 'ACTIVE',
    teams: 7,
    played: 0.45,
    likes: 11,
  },
];

const CLUB_PREFIXES = [
  'Atlético',
  'Deportivo',
  'Real',
  'Unión',
  'Juventud',
  'Independiente',
  'Racing',
  'Sporting',
  'Club',
  'Estrellas de',
];
const PLACES = [
  'La Esperanza',
  'El Carmen',
  'San Rafael',
  'Santa Bárbara',
  'El Recreo',
  'Los Pinos',
  'La Florida',
  'San Isidro',
  'El Roble',
  'Las Palmas',
  'La Pradera',
  'Villa Nueva',
  'El Centro',
  'Bella Vista',
  'San Antonio',
  'La Laguna',
  'El Mirador',
  'Los Alpes',
  'Primavera',
  'El Bosque',
];
const FIRST_NAMES = [
  'Carlos',
  'Andrés',
  'Juan',
  'Luis',
  'Miguel',
  'Jorge',
  'Fernando',
  'Ricardo',
  'Sergio',
  'Iván',
  'Óscar',
  'Camilo',
  'Diego',
  'Julián',
  'Mateo',
  'Santiago',
  'Felipe',
  'Esteban',
  'Brayan',
  'Kevin',
];
const WOMEN_NAMES = [
  'Laura',
  'Daniela',
  'Valentina',
  'Camila',
  'Paula',
  'Natalia',
  'Juliana',
  'Sofía',
  'Mariana',
  'Andrea',
  'Carolina',
  'Lina',
  'Diana',
  'Tatiana',
  'Yuliana',
  'Manuela',
];
const LAST_NAMES = [
  'García',
  'Rodríguez',
  'Martínez',
  'López',
  'González',
  'Pérez',
  'Sánchez',
  'Ramírez',
  'Torres',
  'Flórez',
  'Vargas',
  'Castro',
  'Rojas',
  'Moreno',
  'Suárez',
  'Pinzón',
  'Becerra',
  'Ávila',
];
const POSITIONS = [
  'GK',
  'DF',
  'DF',
  'DF',
  'DF',
  'MF',
  'MF',
  'MF',
  'FW',
  'FW',
  'FW',
  'GK',
  'DF',
  'MF',
  'FW',
];

/** Deterministic PRNG so every run builds the same catalog */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL_PREFIXES = CLUB_PREFIXES.slice(0, 5);
const POOL_PLACES = PLACES.slice(0, 8);
const clubName = (prefix: string, place: string, women: boolean) =>
  `${prefix} ${place}${women ? ' Femenino' : ''}`;

/** Demo clubs have no members, so nobody can edit them. */
async function ensureClub(name: string, women: boolean, rand: () => number) {
  const existing = await prisma.club.findFirst({
    where: { name, members: { none: {} } },
    include: { players: true },
  });
  if (existing) return existing;
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(rand() * list.length)];
  const squad = 11 + Math.floor(rand() * 5);
  return prisma.club.create({
    data: {
      name,
      players: {
        create: POSITIONS.slice(0, squad).map((position, i) => ({
          name: `${pick(women ? WOMEN_NAMES : FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          number: i + 1,
          position,
        })),
      },
    },
    include: { players: true },
  });
}

const fanEmail = (i: number) => `hincha${i + 1}@${FAN_DOMAIN}`;

async function removeDemo() {
  const { count } = await prisma.tournament.deleteMany({
    where: { name: { in: TOURNAMENTS.map((t) => t.name) } },
  });
  const fans = await prisma.user.deleteMany({
    where: { email: { endsWith: `@${FAN_DOMAIN}` } },
  });
  // Clubs nobody owns that no longer play anywhere; real clubs always have an owner
  const clubs = await prisma.club.deleteMany({
    where: { members: { none: {} }, entries: { none: {} } },
  });
  console.log(
    `Removed ${count} demo tournaments, ${clubs.count} demo clubs and ${fans.count} demo fans.`,
  );
}

async function ensureFans() {
  const fans: { id: string }[] = [];
  for (let i = 0; i < FAN_COUNT; i++) {
    fans.push(
      await prisma.user.upsert({
        where: { email: fanEmail(i) },
        create: { email: fanEmail(i), name: `Hincha ${i + 1}` },
        update: {},
      }),
    );
  }
  return fans;
}

async function createTournament(
  spec: DemoTournament,
  index: number,
  fanIds: string[],
) {
  const rand = random(index * 7919 + 17);
  const pick = <T>(list: readonly T[]) =>
    list[Math.floor(rand() * list.length)];
  const women = spec.name.includes('Femenina');

  // Older tournaments first, so "recent" order looks natural
  const createdAt = new Date(
    Date.now() - (TOURNAMENTS.length - index) * 3 * 86_400_000,
  );
  const tournament = await prisma.tournament.create({
    data: {
      name: spec.name,
      format: spec.format,
      status: spec.status,
      createdAt,
    },
  });

  // Clubs come from a small pool so the same club shows up in several tournaments
  const usedNames = new Set<string>();
  const teams: {
    id: string;
    players: { id: string; position: string | null }[];
  }[] = [];
  for (let t = 0; t < spec.teams; t++) {
    let name: string;
    do name = clubName(pick(POOL_PREFIXES), pick(POOL_PLACES), women);
    while (usedNames.has(name));
    usedNames.add(name);

    const club = await ensureClub(name, women, rand);
    teams.push(
      await prisma.team.create({
        data: {
          name,
          clubId: club.id,
          tournamentId: tournament.id,
          players: {
            create: club.players.map(({ name, number, position }) => ({
              name,
              number,
              position,
            })),
          },
        },
        include: { players: true },
      }),
    );
  }

  let played = 0;
  let matches = 0;
  if (spec.status !== 'DRAFT') {
    const pairings = generateRoundRobin(
      teams.map((t) => t.id),
      spec.format === 'ROUND_ROBIN_HOME_AWAY',
    );
    matches = pairings.length;
    const rounds = Math.max(...pairings.map((p) => p.round));
    const playedRounds = Math.round(rounds * spec.played);
    // Played rounds are past Sundays; the rest are upcoming Sundays
    const nextSunday = new Date();
    nextSunday.setDate(
      nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7),
    );
    nextSunday.setHours(15, 0, 0, 0);
    const dateFor = (round: number) =>
      new Date(
        nextSunday.getTime() + (round - playedRounds - 1) * 7 * 86_400_000,
      );

    for (const pairing of pairings) {
      const isPlayed = pairing.round <= playedRounds;
      const match = await prisma.match.create({
        data: {
          ...pairing,
          tournamentId: tournament.id,
          scheduledAt: dateFor(pairing.round),
          status: isPlayed ? 'PLAYED' : 'SCHEDULED',
        },
      });
      if (!isPlayed) continue;
      played++;

      const home = teams.find((t) => t.id === pairing.homeTeamId)!;
      const away = teams.find((t) => t.id === pairing.awayTeamId)!;
      const goalsFor = () => Math.floor(rand() * rand() * 5);
      const homeScore = goalsFor();
      const awayScore = goalsFor();
      const scorers = (team: typeof home) =>
        team.players.filter((p) => p.position !== 'GK');
      const goals = [
        ...Array.from({ length: homeScore }, () => ({
          playerId: pick(scorers(home)).id,
          minute: 1 + Math.floor(rand() * 90),
        })),
        ...Array.from({ length: awayScore }, () => ({
          playerId: pick(scorers(away)).id,
          minute: 1 + Math.floor(rand() * 90),
        })),
      ];
      const cards = Array.from({ length: Math.floor(rand() * 4) }, () => ({
        playerId: pick([...home.players, ...away.players]).id,
        type: rand() < 0.15 ? ('RED' as const) : ('YELLOW' as const),
        minute: 1 + Math.floor(rand() * 90),
      }));

      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore,
          awayScore,
          goals: { createMany: { data: goals } },
          cards: { createMany: { data: cards } },
        },
      });
    }
  }

  const likers = [...fanIds].sort(() => rand() - 0.5).slice(0, spec.likes);
  await prisma.tournamentLike.createMany({
    data: likers.map((userId) => ({ userId, tournamentId: tournament.id })),
  });

  console.log(
    `  ${spec.name}: ${spec.teams} teams, ${played}/${matches} matches played, ${likers.length} likes`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--remove') || args.includes('--reset')) await removeDemo();
  if (args.includes('--remove')) return;

  const existing = await prisma.tournament.count({
    where: { name: { in: TOURNAMENTS.map((t) => t.name) } },
  });
  if (existing > 0) {
    console.log(
      `${existing} demo tournaments already exist; use --reset to rebuild them.`,
    );
    return;
  }

  const fanIds = (await ensureFans()).map((f) => f.id);
  console.log(`Creating ${TOURNAMENTS.length} demo tournaments:`);
  for (const [i, spec] of TOURNAMENTS.entries()) {
    await createTournament(spec, i, fanIds);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
