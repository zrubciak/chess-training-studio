import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function App() {
  const [game, setGame] = useState(() => new Chess());
  const [moves, setMoves] = useState([]);
  const [coachMessage, setCoachMessage] = useState(
    "Urob prvý ťah. Hráš bielymi."
  );
  const [boardOrientation, setBoardOrientation] =
    useState("white");
  const [isComputerThinking, setIsComputerThinking] =
    useState(false);
  const [gameStatus, setGameStatus] = useState(
    "Na ťahu: biely"
  );

  function getCoachComment(move, currentGame) {
    if (currentGame.isCheckmate()) {
      return "🏆 Šach-mat! Partia sa skončila.";
    }

    if (currentGame.inCheck()) {
      return "⚔️ Šach! Súperov kráľ je napadnutý.";
    }

    if (move.san === "e4" || move.san === "d4") {
      return "✅ 9/10 – Výborné. Bojuješ o centrum a otváraš figúry.";
    }

    if (move.piece === "n") {
      return "✅ 8/10 – Dobrý vývin jazdca. Jazdci patria v otvorení bližšie k centru.";
    }

    if (move.piece === "b") {
      return "✅ 8/10 – Dobrý vývin strelca. Pripravuj si rošádu.";
    }

    if (move.san.includes("O-O")) {
      return "✅ 10/10 – Výborne. Rošádou si zvýšil bezpečnosť kráľa.";
    }

    if (move.captured) {
      return "🔎 7/10 – Vzal si súperovu figúru. Skontroluj, či súper nemôže vziať tvoju figúru späť.";
    }

    if (move.piece === "q" && moves.length < 8) {
      return "⚠️ 5/10 – Dámu vyvíjaš pomerne skoro. Súper ju môže napádať a získavať tempo.";
    }

    if (move.piece === "p") {
      return "👍 7/10 – Legálny pešiakový ťah. Sleduj, či pomáha centru alebo vývinu.";
    }

    return "👍 7/10 – Legálny ťah. Pred ďalším ťahom skontroluj súperove hrozby.";
  }

  function updateGameStatus(currentGame) {
    if (currentGame.isCheckmate()) {
      const winner =
        currentGame.turn() === "w" ? "čierny" : "biely";

      setGameStatus(`Šach-mat – vyhral ${winner}`);
      return;
    }

    if (currentGame.isStalemate()) {
      setGameStatus("Pat – partia je remíza");
      return;
    }

    if (currentGame.isThreefoldRepetition()) {
      setGameStatus(
        "Remíza – pozícia sa zopakovala trikrát"
      );
      return;
    }

    if (currentGame.isInsufficientMaterial()) {
      setGameStatus(
        "Remíza – nedostatok materiálu na mat"
      );
      return;
    }

    if (currentGame.isDraw()) {
      setGameStatus("Partia je remíza");
      return;
    }

    if (currentGame.inCheck()) {
      const side =
        currentGame.turn() === "w" ? "biely" : "čierny";

      setGameStatus(`Na ťahu: ${side} – ŠACH`);
      return;
    }

    const side =
      currentGame.turn() === "w" ? "biely" : "čierny";

    setGameStatus(`Na ťahu: ${side}`);
  }

  function chooseComputerMove(currentGame) {
    const legalMoves = currentGame.moves({
      verbose: true,
    });

    if (legalMoves.length === 0) {
      return null;
    }

    const pieceValues = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 100,
    };

    const scoredMoves = legalMoves.map((move) => {
      let score = Math.random() * 2;

      if (move.captured) {
        score += pieceValues[move.captured] * 10;
        score -= pieceValues[move.piece] * 0.5;
      }

      if (move.san.includes("+")) {
        score += 5;
      }

      if (move.san.includes("#")) {
        score += 1000;
      }

      if (move.san.includes("O-O")) {
        score += 4;
      }

      if (
        move.to === "e5" ||
        move.to === "d5" ||
        move.to === "e4" ||
        move.to === "d4"
      ) {
        score += 3;
      }

      if (
        (move.piece === "n" || move.piece === "b") &&
        currentGame.history().length < 12
      ) {
        score += 2;
      }

      return {
        move,
        score,
      };
    });

    scoredMoves.sort((a, b) => b.score - a.score);

    const numberOfCandidates = Math.min(
      3,
      scoredMoves.length
    );

    const selectedIndex = Math.floor(
      Math.random() * numberOfCandidates
    );

    return scoredMoves[selectedIndex].move;
  }

  function makeComputerMove(positionAfterPlayerMove) {
    setIsComputerThinking(true);

    window.setTimeout(() => {
      const computerGame = new Chess(
        positionAfterPlayerMove.fen()
      );

      if (computerGame.isGameOver()) {
        setIsComputerThinking(false);
        updateGameStatus(computerGame);
        return;
      }

      const selectedMove =
        chooseComputerMove(computerGame);

      if (!selectedMove) {
        setIsComputerThinking(false);
        updateGameStatus(computerGame);
        return;
      }

      const computerMove = computerGame.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: "q",
      });

      setGame(computerGame);
      setMoves(computerGame.history());

      if (computerGame.isCheckmate()) {
        setCoachMessage(
          `🤖 Počítač zahral ${computerMove.san}. Šach-mat. Pozrime sa, kde sa obrana pokazila.`
        );
      } else if (computerGame.inCheck()) {
        setCoachMessage(
          `🤖 Počítač zahral ${computerMove.san} a dáva ti šach. Najprv musíš vyriešiť ohrozenie kráľa.`
        );
      } else {
        setCoachMessage(
          `🤖 Počítač zahral ${computerMove.san}. Teraz si na ťahu. Skontroluj napadnuté a nechránené figúry.`
        );
      }

      updateGameStatus(computerGame);
      setIsComputerThinking(false);
    }, 650);
  }

  function onDrop(sourceSquare, targetSquare) {
    if (isComputerThinking) {
      return false;
    }

    if (game.isGameOver()) {
      setCoachMessage(
        "Partia sa už skončila. Klikni na Nová partia."
      );
      return false;
    }

    if (game.turn() !== "w") {
      setCoachMessage(
        "Počkaj, teraz je na ťahu počítač."
      );
      return false;
    }

    const gameCopy = new Chess(game.fen());

    let move;

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

    setGame(gameCopy);
    setMoves(gameCopy.history());
    setCoachMessage(
      getCoachComment(move, gameCopy)
    );
    updateGameStatus(gameCopy);

    if (!gameCopy.isGameOver()) {
      makeComputerMove(gameCopy);
    }

    return true;
  }

  function newGame() {
    const freshGame = new Chess();

    setGame(freshGame);
    setMoves([]);
    setCoachMessage(
      "Nová partia pripravená. Hráš bielymi. Skús ovládnuť centrum."
    );
    setGameStatus("Na ťahu: biely");
    setIsComputerThinking(false);
  }

  function flipBoard() {
    setBoardOrientation((previousOrientation) =>
      previousOrientation === "white"
        ? "black"
        : "white"
    );
  }

  function createMoveRows() {
    const rows = [];

    for (let index = 0; index < moves.length; index += 2) {
      rows.push({
        number: index / 2 + 1,
        white: moves[index] || "",
        black: moves[index + 1] || "",
      });
    }

    return rows;
  }

  const moveRows = createMoveRows();

  return (
    <div
      style={{
        background: "#071226",
        minHeight: "100vh",
        color: "white",
        padding: "20px",
        fontFamily:
          '"Segoe UI", Arial, sans-serif',
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          margin: "0 0 10px",
        }}
      >
        ♟️ Chess Training Studio
      </h1>

      <p
        style={{
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        Ivanov osobný tréner | ELO 900 → 1000+
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 260px) minmax(420px, 700px) minmax(280px, 340px)",
          gap: "20px",
          justifyContent: "center",
          alignItems: "start",
        }}
      >
        {/* PROFIL */}
        <aside style={panelStyle}>
          <h2>👤 Profil</h2>

          <p>
            <strong>Ivan Zrubec</strong>
          </p>

          <p>ELO: 900</p>
          <p>Cieľ: 1000+</p>

          <hr style={dividerStyle} />

          <h3>📈 Pokrok</h3>

          <div
            style={{
              height: "20px",
              background: "#334155",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "90%",
                height: "100%",
                background:
                  "linear-gradient(90deg, #22c55e, #10b981)",
              }}
            />
          </div>

          <p style={{ textAlign: "center" }}>
            900 / 1000
          </p>

          <hr style={dividerStyle} />

          <h3>🎯 Dnešný tréning</h3>

          <ul style={{ lineHeight: 1.8 }}>
            <li>✅ 3 puzzle</li>
            <li>✅ 1 tréningová partia</li>
            <li>✅ Analýza Lichess</li>
          </ul>

          <button
            type="button"
            onClick={newGame}
            style={buttonStyleBlue}
          >
            🔄 Nová partia
          </button>

          <button
            type="button"
            onClick={flipBoard}
            style={buttonStyleGreen}
          >
            🔃 Otočiť šachovnicu
          </button>
        </aside>

        {/* ŠACHOVNICA */}
        <main>
          <div
            style={{
              background: "#111c31",
              borderRadius: "16px",
              padding: "14px",
              boxShadow:
                "0 12px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            <Chessboard
              position={game.fen()}
              boardOrientation={boardOrientation}
              onPieceDrop={onDrop}
            />
          </div>

          <div
            style={{
              marginTop: "12px",
              padding: "12px 16px",
              background: "#1e2b45",
              borderRadius: "12px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            {isComputerThinking
              ? "🤖 Počítač premýšľa..."
              : gameStatus}
          </div>
        </main>

        {/* AI COACH */}
        <aside style={panelStyle}>
          <h2>🤖 AI Coach</h2>

          <div
            style={{
              background: "#0f1b31",
              borderLeft: "4px solid #22c55e",
              padding: "12px",
              borderRadius: "8px",
              lineHeight: 1.5,
            }}
          >
            {coachMessage}
          </div>

          <hr style={dividerStyle} />

          <h3>🧠 Pred každým ťahom</h3>

          <ul style={{ lineHeight: 1.8 }}>
            <li>Je môj kráľ v bezpečí?</li>
            <li>Čo napáda súper?</li>
            <li>Je moja figúra chránená?</li>
            <li>Mám šach, branie alebo hrozbu?</li>
          </ul>

          <hr style={dividerStyle} />

          <h3>📖 História ťahov</h3>

          {moveRows.length === 0 ? (
            <p style={{ color: "#cbd5e1" }}>
              Zatiaľ nebol vykonaný žiadny ťah.
            </p>
          ) : (
            <div
              style={{
                maxHeight: "280px",
                overflowY: "auto",
              }}
            >
              {moveRows.map((row) => (
                <div
                  key={row.number}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "38px 1fr 1fr",
                    gap: "8px",
                    padding: "8px",
                    marginBottom: "5px",
                    background: "#0f1b31",
                    borderRadius: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "#94a3b8",
                    }}
                  >
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

const panelStyle = {
  background: "#1e2b45",
  borderRadius: "16px",
  padding: "20px",
  boxShadow: "0 12px 30px rgba(0, 0, 0, 0.22)",
};

const dividerStyle = {
  border: "none",
  borderTop: "1px solid #64748b",
  margin: "20px 0",
};

const buttonStyleBlue = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonStyleGreen = {
  width: "100%",
  padding: "12px",
  marginTop: "10px",
  border: "none",
  borderRadius: "10px",
  background: "#16a34a",
  color: "white",
  fontWeight: 700,
  cursor: "pointer",
};