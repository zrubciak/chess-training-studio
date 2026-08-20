const CENTER_SQUARES = [
  "d4",
  "e4",
  "d5",
  "e5",
];

export function classifyMove(evalLoss) {
  const loss = Math.max(0, Number(evalLoss) || 0);

  if (loss <= 0.1) {
    return {
      label: "Výborný",
      score: 10,
      color: "#22c55e",
    };
  }

  if (loss <= 0.3) {
    return {
      label: "Dobrý",
      score: 8,
      color: "#84cc16",
    };
  }

  if (loss <= 0.7) {
    return {
      label: "Nepresnosť",
      score: 6,
      color: "#f59e0b",
    };
  }

  if (loss <= 1.5) {
    return {
      label: "Chyba",
      score: 4,
      color: "#f97316",
    };
  }

  return {
    label: "Hrubá chyba",
    score: 2,
    color: "#ef4444",
  };
}

export function explainMove({
  move,
  bestMoveSan,
  evaluationLoss = 0,
  moveNumber = 1,
}) {
  const classification =
    classifyMove(evaluationLoss);

  const reasons = [];

  if (!move) {
    return {
      ...classification,
      title: classification.label,
      reasons: [
        "Ťah sa nepodarilo podrobnejšie vysvetliť.",
      ],
      recommendation: bestMoveSan
        ? `Lepšie bolo ${bestMoveSan}.`
        : "Pred ďalším ťahom skontroluj súperove hrozby.",
    };
  }

  if (move.san.includes("O-O")) {
    reasons.push(
      "Rošáda zvyšuje bezpečnosť kráľa."
    );
  }

  if (
    move.piece === "n" ||
    move.piece === "b"
  ) {
    reasons.push(
      "Vyvíjaš ľahkú figúru do hry."
    );
  }

  if (CENTER_SQUARES.includes(move.to)) {
    reasons.push(
      "Figúra alebo pešiak ovplyvňuje centrum."
    );
  }

  if (move.captured) {
    reasons.push(
      "Ťah získava alebo vymieňa materiál."
    );
  }

  if (move.san.includes("+")) {
    reasons.push(
      "Ťah dáva súperovmu kráľovi šach."
    );
  }

  if (
    move.piece === "q" &&
    moveNumber <= 5 &&
    !move.captured
  ) {
    reasons.push(
      "Dáma vychádza skoro a súper ju môže napádať so ziskom tempa."
    );
  }

  if (
    move.piece === "p" &&
    !CENTER_SQUARES.includes(move.to)
  ) {
    reasons.push(
      "Pešiakový ťah priamo nebojuje o hlavné centrálne polia."
    );
  }

  if (evaluationLoss >= 0.7) {
    reasons.push(
      `Pozícia sa zhoršila približne o ${evaluationLoss.toFixed(2)} pešiaka.`
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "Ťah je legálny, ale skontroluj vývin, centrum a bezpečnosť kráľa."
    );
  }

  let recommendation =
    "Pokračuj vo vývine a sleduj súperove hrozby.";

  if (
    bestMoveSan &&
    bestMoveSan !== move.san
  ) {
    recommendation =
      `Lepšie bolo ${bestMoveSan}. Tento ťah podľa enginu zachovával kvalitnejšiu pozíciu.`;
  }

  if (
    bestMoveSan &&
    bestMoveSan === move.san
  ) {
    recommendation =
      "Zahral si najlepší ťah odporúčaný enginom.";
  }

  return {
    ...classification,
    title: classification.label,
    playedMove: move.san,
    bestMove: bestMoveSan || null,
    evaluationLoss,
    reasons,
    recommendation,
  };
}

export function formatEngineMove(
  coordinateMove,
  chessPosition
) {
  if (
    !coordinateMove ||
    coordinateMove === "(none)"
  ) {
    return null;
  }

  const from = coordinateMove.slice(0, 2);
  const to = coordinateMove.slice(2, 4);
  const promotion =
    coordinateMove.length >= 5
      ? coordinateMove.slice(4, 5)
      : "q";

  try {
    const move = chessPosition.move({
      from,
      to,
      promotion,
    });

    return move ? move.san : null;
  } catch {
    return null;
  }
}
