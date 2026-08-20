export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this.onReady = null;
    this.onBestMove = null;
    this.onEvaluation = null;
    this.pendingResolve = null;
  }

  init() {
    if (this.worker) {
      return;
    }

    const enginePath =
      `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite.js`;

    this.worker = new Worker(enginePath);

    this.worker.onmessage = (event) => {
      const message =
        typeof event.data === "string"
          ? event.data
          : String(event.data);

      console.log("Stockfish:", message);

      if (message === "uciok") {
        this.worker.postMessage("isready");
      }

      if (message === "readyok") {
        this.ready = true;

        if (this.onReady) {
          this.onReady();
        }
      }

      if (message.startsWith("info")) {
        const centipawnMatch =
          message.match(/score cp (-?\d+)/);

        const mateMatch =
          message.match(/score mate (-?\d+)/);

        if (centipawnMatch && this.onEvaluation) {
          const evaluation =
            Number(centipawnMatch[1]) / 100;

          this.onEvaluation({
            type: "centipawn",
            value: evaluation,
          });
        }

        if (mateMatch && this.onEvaluation) {
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
      console.error("Stockfish Worker chyba:", error);
      this.ready = false;
    };

    this.worker.postMessage("uci");
  }

  setLevel(elo) {
    if (!this.worker) {
      return;
    }

    const limitedElo = Math.max(
      800,
      Math.min(2800, Number(elo))
    );

    this.worker.postMessage(
      "setoption name UCI_LimitStrength value true"
    );

    this.worker.postMessage(
      `setoption name UCI_Elo value ${limitedElo}`
    );
  }

  findBestMove(fen, depth = 10) {
    if (!this.worker || !this.ready) {
      return false;
    }

    this.worker.postMessage("stop");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);

    return true;
  }

  analyze(fen, depth = 12) {
    if (!this.worker || !this.ready) {
      return false;
    }

    this.worker.postMessage("stop");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go depth ${depth}`);

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
    if (this.worker) {
      this.worker.postMessage("quit");
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}

export const stockfishEngine = new StockfishEngine();
