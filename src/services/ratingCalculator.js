const DEFAULT_RATING = 900;
const K_FACTOR = 32;
const STORAGE_KEY = "ivanChessTrainingRating";

export function getExpectedScore(
  playerRating,
  opponentRating
) {
  return (
    1 /
    (1 +
      10 **
        ((opponentRating - playerRating) / 400))
  );
}

export function calculateRatingChange(
  playerRating,
  opponentRating,
  result
) {
  const expectedScore = getExpectedScore(
    playerRating,
    opponentRating
  );

  const rawChange =
    K_FACTOR * (result - expectedScore);

  return Math.round(rawChange);
}

export function calculateNewRating(
  playerRating,
  opponentRating,
  result
) {
  const change = calculateRatingChange(
    playerRating,
    opponentRating,
    result
  );

  return {
    oldRating: playerRating,
    opponentRating,
    result,
    expectedScore: getExpectedScore(
      playerRating,
      opponentRating
    ),
    change,
    newRating: Math.max(
      100,
      playerRating + change
    ),
  };
}

export function loadTrainingRating() {
  const storedValue =
    window.localStorage.getItem(STORAGE_KEY);

  const parsedValue = Number(storedValue);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 100
  ) {
    return DEFAULT_RATING;
  }

  return parsedValue;
}

export function saveTrainingRating(rating) {
  window.localStorage.setItem(
    STORAGE_KEY,
    String(rating)
  );
}

export function resetTrainingRating() {
  saveTrainingRating(DEFAULT_RATING);
  return DEFAULT_RATING;
}

export function getResultLabel(result) {
  if (result === 1) {
    return "Výhra";
  }

  if (result === 0.5) {
    return "Remíza";
  }

  return "Prehra";
}
