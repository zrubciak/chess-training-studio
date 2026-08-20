export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;

    this.onReady = null;
    this.onBestMove = null;
    this.onEvaluation = null;
    this.onError = null;
  }

  init() {
    if (this.worker) {
      return;
    }

    const enginePath =
      `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite.js`;

    try {
      this.worker = new Worker(enginePath);

      this.worker.onmessage = (event) => {
        const message =
          typeof event.data === "string"
            ? event.data
            : String(event.data);

        console.log("Stockfish:", message);

        if (message === "uciok") {
          this.worker.postMessage("isready");
          return;
        }

        if (message === "readyok") {
          this.ready = true;

          if (this.onReady) {
            this.onReady();
          }

          return;
        }

        if (message.startsWith("info")) {
          const centipawnMatch =
            message.match(/score cp (-?\d+)/);

          const mateMatch =
            message.match(/score mate (-?\d+)/);

          if (
            centipawnMatch &&
            this.onEvaluation
          ) {
            this.onEvaluation({
              type: "centipawn",
              value:
                Number(centipawnMatch[1]) / 100,
            });
          }

          if (
            mateMatch &&
            this.onEvaluation
          ) {
            this.onEvaluation({
              type: "mate",
              value: Number(mateMatch[1]),
            });
          }
        }

        if (message.startsWith("bestmove")) {
          const parts = message.split(" ");
          const bestMove = parts[1];

          if (
            bestMove &&
            bestMove !== "(none)" &&
            this.onBestMove
          ) {
            this.onBestMove(bestMove);
          }
        }
      };

      this.worker.onerror = (error) => {
        console.error(
          "Stockfish Worker chyba:",
          error
        );

        this.ready = false;

        if (this.onError) {
          this.onError(error);
        }
      };

      this.worker.postMessage("uci");
    } catch (error) {
      console.error(
        "Stockfish sa nepodarilo spustiť:",
        error
      );

      this.ready = false;

      if (this.onError) {
        this.onError(error);
      }
    }
  }

  setLevel(elo) {
    if (!this.worker) {
      return;
    }

    const numericElo = Number(elo);

    const skillMap = {
      800: 0,
      1000: 2,
      1200: 4,
      1500: 7,
    };

    const skillLevel =
      skillMap[numericElo] ?? 2;

    this.worker.postMessage(
      "setoption name UCI_LimitStrength value false"
    );

    this.worker.postMessage(
      `setoption name Skill Level value ${skillLevel}`
    );

    this.worker.postMessage("isready");
  }

  findBestMove(fen, depth = 10) {
    if (!this.worker || !this.ready) {
      return false;
    }

    this.worker.postMessage("stop");
    this.worker.postMessage(
      `position fen ${fen}`
    );
    this.worker.postMessage(
      `go depth ${depth}`
    );

    return true;
  }

  analyzePosition(fen, depth = 12) {
    if (!this.worker || !this.ready) {
      return false;
    }

    this.worker.postMessage("stop");
    this.worker.postMessage(
      `position fen ${fen}`
    );
    this.worker.postMessage(
      `go depth ${depth}`
    );

    return true;
  }

  newGame() {
    if (!this.worker) {
      return;
    }

    this.worker.postMessage("stop");
    this.worker.postMessage("ucinewgame");
    this.worker.postMessage("isready");
  }

  stop() {
    if (this.worker) {
      this.worker.postMessage("stop");
    }
  }

  destroy() {
    if (!this.worker) {
      return;
    }

    this.worker.postMessage("quit");
    this.worker.terminate();

    this.worker = null;
    this.ready = false;
  }
}

export const stockfishEngine =
  new StockfishEngine();
