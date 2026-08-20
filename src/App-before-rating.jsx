import { useRef, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [moves, setMoves] = useState([]);
  const [boardOrientation, setBoardOrientation] = useState("white");
  const [computerElo, setComputerElo] = useState(1000);
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [gameStatus, setGameStatus] = useState("Na ťahu: biely");
  const [coachMessage, setCoachMessage] = useState(
    "Urob prvý ťah. Odporúčam e4 alebo d4."
  );

  const gameRef = useRef(new Chess());
  const timerRef = useRef(null);

  function describePosition(currentGame) {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === "w" ? "čierny" : "biely";
      return `Šach-mat – vyhral ${winner}`;
    }

    if (currentGame.isStalemate()) {
      return "Pat – partia skončila remízou";
    }

    if (currentGame.isThreefoldRepetition()) {
      return "Remíza – pozícia sa opakovala trikrát";
    }

    if (currentGame.isInsufficientMaterial()) {
      return "Remíza – nedostatok materiálu";
    }

    if (currentGame.isDraw()) {
      return "Partia skončila remízou";
    }

    const side = currentGame.turn() === "w" ? "biely" : "čierny";

    return currentGame.inCheck()
      ? `Na ťahu: ${side} – ŠACH`
      : `Na ťahu: ${side}`;
  }

  function getCoachComment(move, currentGame) {
    if (currentGame.isCheckmate()) {
      return "🏆 Šach-mat! Partiu si ukončil víťazstvom.";
    }

    if (currentGame.inCheck()) {
      return "⚔️ Dávaš súperovi šach. Skontroluj všetky súperove odpovede.";
    }

    if (move.san === "e4" || move.san === "d4") {
      return "✅ 9/10 – Výborný boj o centrum a otvorenie ciest pre figúry.";
    }

    if (move.piece === "n") {
      return "✅ 8/10 – Dobrý vývin jazdca. Jazdec smeruje bližšie k centru.";
    }

    if (move.piece === "b") {
      return "✅ 8/10 – Vyvíjaš strelca a približuješ sa k rošáde.";
    }

    if (move.san.includes("O-O")) {
      return "✅ 10/10 – Výborne. Rošáda zvýšila bezpečnosť kráľa.";
    }

    if (move.captured) {
      return "🔎 7/10 – Získal si materiál. Skontroluj, či súper nemôže figúru vziať späť.";
    }

    if (move.piece === "q" && currentGame.history().length < 10) {
      return "⚠️ 5/10 – Dámu vyvíjaš skoro. Súper ju môže napádať a získavať tempo.";
    }

    if (move.piece === "p") {
      return "👍 7/10 – Legálny pešiakový ťah. Sleduj, či podporuje centrum alebo vývin.";
    }

    return "👍 7/10 – Legálny ťah. Teraz skontroluj súperove šachy, brania a hrozby.";
  }

  function scoreComputerMove(currentGame, candidate) {
    let score = Math.random() * 3;

    if (candidate.captured) {
      score += PIECE_VALUES[candidate.captured] * 12;
      score -= PIECE_VALUES[candidate.piece] * 0.5;
    }

    if (candidate.san.includes("#")) {
      score += 10000;
    } else if (candidate.san.includes("+")) {
      score += 15;
    }

    if (candidate.san.includes("O-O")) {
      score += 8;
    }

    const importantCenterSquares = ["d4", "e4", "d5", "e5"];

    if (importantCenterSquares.includes(candidate.to)) {
      score += 5;
    }

    if (
      currentGame.history().length < 12 &&
      (candidate.piece === "n" || candidate.piece === "b")
    ) {
      score += 4;
    }

    if (
      currentGame.history().length < 10 &&
      candidate.piece === "q" &&
      !candidate.captured
    ) {
      score -= 4;
    }

    return score;
  }

  function chooseComputerMove(currentGame) {
    const legalMoves = currentGame.moves({ verbose: true });

    if (legalMoves.length === 0) {
      return null;
    }

    const rankedMoves = legalMoves
      .map((candidate) => ({
        candidate,
        score: scoreComputerMove(currentGame, candidate),
      }))
      .sort((a, b) => b.score - a.score);

    let candidateCount = 5;

    if (computerElo === 1000) {
      candidateCount = 3;
    }

    if (computerElo === 1200) {
      candidateCount = 1;
    }

    const availableCandidates = Math.min(
      candidateCount,
      rankedMoves.length
    );

    const selectedIndex = Math.floor(
      Math.random() * availableCandidates
    );

    return rankedMoves[selectedIndex].candidate;
  }

  function makeComputerMove(positionAfterPlayerMove) {
    setIsComputerThinking(true);
    setCoachMessage(`🤖 Súper ELO ${computerElo} premýšľa...`);

    timerRef.current = window.setTimeout(() => {
      const computerGame = new Chess(positionAfterPlayerMove.fen());

      if (computerGame.isGameOver()) {
        setIsComputerThinking(false);
        setGameStatus(describePosition(computerGame));
        return;
      }

      const selectedMove = chooseComputerMove(computerGame);

      if (!selectedMove) {
        setIsComputerThinking(false);
        setGameStatus(describePosition(computerGame));
        return;
      }

      const computerMove = computerGame.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion || "q",
      });

      gameRef.current = computerGame;
      setGame(computerGame);
      setMoves(computerGame.history());
      setGameStatus(describePosition(computerGame));
      setIsComputerThinking(false);

      if (computerGame.isCheckmate()) {
        setCoachMessage(
          `🤖 Súper zahral ${computerMove.san}. Šach-mat. Poďme neskôr nájsť rozhodujúcu chybu.`
        );
      } else if (computerGame.inCheck()) {
        setCoachMessage(
          `🤖 Súper zahral ${computerMove.san} a dáva ti šach. Najprv vyrieš bezpečnosť kráľa.`
        );
      } else {
        setCoachMessage(
          `🤖 Súper zahral ${computerMove.san}. Si na ťahu – skontroluj šachy, brania a hrozby.`
        );
      }
    }, 650);
  }

  function onDrop(sourceSquare, targetSquare) {
    if (isComputerThinking || game.isGameOver() || game.turn() !== "w") {
      return false;
    }

    const gameCopy = new Chess(game.fen());

    let move = null;

    try {
      move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    } catch {
      return false;
    }

    if (!move) {
      return false;
    }

    gameRef.current = gameCopy;
    setGame(gameCopy);
    setMoves(gameCopy.history());
    setGameStatus(describePosition(gameCopy));
    setCoachMessage(getCoachComment(move, gameCopy));

    if (!gameCopy.isGameOver()) {
      makeComputerMove(gameCopy);
    }

    return true;
  }

  function newGame() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    const freshGame = new Chess();

    gameRef.current = freshGame;
    setGame(freshGame);
    setMoves([]);
    setIsComputerThinking(false);
    setGameStatus("Na ťahu: biely");
    setCoachMessage(
      "Nová partia pripravená. Hráš bielymi. Skús e4 alebo d4."
    );
  }

  function flipBoard() {
    setBoardOrientation((current) =>
      current === "white" ? "black" : "white"
    );
  }

  function changeComputerElo(event) {
    const newElo = Number(event.target.value);
    setComputerElo(newElo);
    setCoachMessage(`Úroveň automatického súpera bola nastavená na ELO ${newElo}.`);
  }

  const moveRows = [];

  for (let index = 0; index < moves.length; index += 2) {
    moveRows.push({
      number: index / 2 + 1,
      white: moves[index] || "",
      black: moves[index + 1] || "",
    });
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>♟️ Chess Training Studio</h1>
        <p style={styles.subtitle}>
          Ivanov osobný tréner | ELO 900 → 1000+
        </p>
      </header>

      <div style={styles.layout}>
        <aside style={styles.panel}>
          <h2>👤 Profil</h2>
          <p><strong>Ivan Zrubec</strong></p>
          <p>Aktuálne ELO: 900</p>
          <p>Cieľ: 1000+</p>

          <hr style={styles.divider} />

          <h3>🤖 Automatický súper</h3>

          <label htmlFor="computerElo">Úroveň súpera</label>

          <select
            id="computerElo"
            value={computerElo}
            onChange={changeComputerElo}
            style={styles.select}
            disabled={isComputerThinking}
          >
            <option value={800}>ELO 800 – ľahký</option>
            <option value={1000}>ELO 1000 – môj cieľ</option>
            <option value={1200}>ELO 1200 – výzva</option>
          </select>

          <hr style={styles.divider} />

          <h3>📈 Pokrok</h3>

          <div style={styles.progressBackground}>
            <div style={styles.progressFill} />
          </div>

          <p style={{ textAlign: "center" }}>900 / 1000</p>

          <button
            type="button"
            onClick={newGame}
            style={styles.blueButton}
          >
            🔄 Nová partia
          </button>

          <button
            type="button"
            onClick={flipBoard}
            style={styles.greenButton}
          >
            🔃 Otočiť šachovnicu
          </button>
        </aside>

        <main>
          <div style={styles.boardContainer}>
            <Chessboard
              position={game.fen()}
              boardOrientation={boardOrientation}
              onPieceDrop={onDrop}
            />
          </div>

          <div style={styles.status}>
            {isComputerThinking
              ? "🤖 Automatický súper premýšľa..."
              : gameStatus}
          </div>
        </main>

        <aside style={styles.panel}>
          <h2>🤖 AI Coach</h2>

          <div style={styles.coachBox}>
            {coachMessage}
          </div>

          <hr style={styles.divider} />

          <h3>🧠 Pred každým ťahom</h3>

          <ul style={{ lineHeight: 1.8 }}>
            <li>Je môj kráľ v bezpečí?</li>
            <li>Čo napáda súper?</li>
            <li>Je moja figúra chránená?</li>
            <li>Mám šach, branie alebo hrozbu?</li>
          </ul>

          <hr style={styles.divider} />

          <h3>📖 História ťahov</h3>

          {moveRows.length === 0 ? (
            <p style={{ color: "#cbd5e1" }}>
              Zatiaľ nebol vykonaný žiadny ťah.
            </p>
          ) : (
            <div style={styles.moveHistory}>
              {moveRows.map((row) => (
                <div key={row.number} style={styles.moveRow}>
                  <span style={{ color: "#94a3b8" }}>
                    {row.number}.
                  </span>
                  <strong>{row.white}</strong>
                  <strong>{row.black}</strong>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#071226",
    color: "white",
    fontFamily: '"Segoe UI", Arial, sans-serif',
  },
  header: {
    textAlign: "center",
    padding: "22px",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
  },
  layout: {
    display: "grid",
    gridTemplateColumns:
      "minmax(230px, 270px) minmax(420px, 700px) minmax(290px, 350px)",
    gap: "20px",
    justifyContent: "center",
    alignItems: "start",
    padding: "0 20px 30px",
  },
  panel: {
    background: "#1e2b45",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
  },
  boardContainer: {
    background: "#111c31",
    borderRadius: "16px",
    padding: "14px",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.3)",
  },
  divider: {
    border: "none",
    borderTop: "1px solid #64748b",
    margin: "20px 0",
  },
  select: {
    width: "100%",
    marginTop: "8px",
    padding: "11px",
    background: "#0f1b31",
    color: "white",
    border: "1px solid #64748b",
    borderRadius: "9px",
  },
  progressBackground: {
    height: "18px",
    background: "#334155",
    borderRadius: "10px",
    overflow: "hidden",
  },
  progressFill: {
    width: "90%",
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #10b981)",
  },
  blueButton: {
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    border: "none",
    borderRadius: "10px",
    background: "#2563eb",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  greenButton: {
    width: "100%",
    padding: "12px",
    marginTop: "10px",
    border: "none",
    borderRadius: "10px",
    background: "#16a34a",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
  status: {
    marginTop: "12px",
    padding: "12px 16px",
    background: "#1e2b45",
    borderRadius: "12px",
    textAlign: "center",
    fontWeight: 700,
  },
  coachBox: {
    background: "#0f1b31",
    borderLeft: "4px solid #22c55e",
    padding: "12px",
    borderRadius: "8px",
    lineHeight: 1.5,
  },
  moveHistory: {
    maxHeight: "300px",
    overflowY: "auto",
  },
  moveRow: {
    display: "grid",
    gridTemplateColumns: "38px 1fr 1fr",
    gap: "8px",
    padding: "8px",
    marginBottom: "5px",
    background: "#0f1b31",
    borderRadius: "8px",
  },
};
