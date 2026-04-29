// ELO-Score für Spielstärke. Standard-K: 32 für Anfänger, 16 später.
const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function updateElo(
  ratingA: number,
  ratingB: number,
  result: 1 | 0.5 | 0,
  k = K,
): { a: number; b: number } {
  const expA = expectedScore(ratingA, ratingB);
  const expB = 1 - expA;
  const newA = Math.round(ratingA + k * (result - expA));
  const newB = Math.round(ratingB + k * ((1 - result) - expB));
  return { a: newA, b: newB };
}

// Gewinner aus Sets bestimmen ([[6,4],[3,6],[7,5]])
export function winnerFromSets(sets: number[][]): "a" | "b" {
  let setsA = 0;
  let setsB = 0;
  for (const [a, b] of sets) {
    if (a > b) setsA++;
    else if (b > a) setsB++;
  }
  return setsA > setsB ? "a" : "b";
}
