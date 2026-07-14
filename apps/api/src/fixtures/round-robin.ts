export interface Pairing {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Circle-method round robin. Odd team counts get a bye each round.
 * With homeAndAway, a mirrored second leg follows the first.
 */
export function generateRoundRobin(
  teamIds: string[],
  homeAndAway = false,
): Pairing[] {
  if (teamIds.length < 2) {
    throw new Error('At least 2 teams are required');
  }
  const slots: (string | null)[] = [...teamIds];
  if (slots.length % 2 === 1) slots.push(null);

  const n = slots.length;
  const roundsPerLeg = n - 1;
  const half = n / 2;
  const pairings: Pairing[] = [];

  let rotation = [...slots];
  for (let round = 1; round <= roundsPerLeg; round++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === null || b === null) continue;
      // Alternate venues each round so no team plays home too many times in a row
      const [homeTeamId, awayTeamId] = round % 2 === 0 ? [b, a] : [a, b];
      pairings.push({ round, homeTeamId, awayTeamId });
    }
    rotation = [rotation[0], rotation[n - 1], ...rotation.slice(1, n - 1)];
  }

  if (homeAndAway) {
    const secondLeg = pairings.map((p) => ({
      round: p.round + roundsPerLeg,
      homeTeamId: p.awayTeamId,
      awayTeamId: p.homeTeamId,
    }));
    pairings.push(...secondLeg);
  }

  return pairings;
}
