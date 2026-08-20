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
  const ratingChange = calculateRatingChange(
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
    change: ratingChange,
    newRating: Math.max(
      100,
      playerRating + ratingChange
    ),
  };
}

export function loadTrainingRating() {
  const savedRating = window.localStorage.getItem(
    STORAGE_KEY
  );

  const parsedRating = Number(savedRating);

  if (
    !Number.isFinite(parsedRating) ||
    parsedRating < 100
  ) {
    return DEFAULT_RATING;
  }

  return parsedRating;
}

export function saveTrainingRating(rating) {
  window.localStorage.setItem(
    STORAGE_KEY,
    String(rating)
  );
}

export function resetTrainingRating() {
  window.localStorage.setItem(
    STORAGE_KEY,
    String(DEFAULT_RATING)
  );

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
