cat > src/services/stockfishEngine.js <<'EOF'
export class StockfishEngine {
  constructor() {
    this.worker = null;
    this.ready = false;

    this.onReady = null;
    this.onError = null;

    this.currentRequest = null;
    this.lastEvaluation = null;
  }

  init() {
    if (this.worker) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const enginePath =
        `${import.meta.env.BASE_URL}stockfish/stockfish-18-lite.js`;

      try {
        this.worker = new Worker(enginePath);

        this.onReady = resolve;
        this.onError = reject;

        this.worker.onmessage = (event) => {
          const message =
            typeof event.data === "string"
              ? event.data
              : String(event.data);

          this.handleMessage(message);
        };

        this.worker.onerror = (error) => {
          console.error(
            "Stockfish Worker chyba:",
            error
          );

          this.ready = false;

          if (this.currentRequest) {
            this.currentRequest.reject(error);
            this.currentRequest = null;
          }

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
        reject(error);
      }
    });
  }

  handleMessage(message) {
    if (message === "uciok") {
      this.worker.postMessage("isready");
      return;
    }

    if (message === "readyok") {
      this.ready = true;

      if (this.onReady) {
        this.onReady();
        this.onReady = null;
      }

      return;
    }

    if (message.startsWith("info")) {
      this.readEvaluation(message);
      return;
    }

    if (message.startsWith("bestmove")) {
      this.finishRequest(message);
    }
  }

  readEvaluation(message) {
    const centipawnMatch =
      message.match(/score cp (-?\d+)/);

    const mateMatch =
      message.match(/score mate (-?\d+)/);

    const depthMatch =
      message.match(/depth (\d+)/);

    if (centipawnMatch) {
      this.lastEvaluation = {
        type: "centipawn",
        value:
          Number(centipawnMatch[1]) / 100,
        depth: depthMatch
          ? Number(depthMatch[1])
          : null,
      };
    }

    if (mateMatch) {
      this.lastEvaluation = {
        type: "mate",
        value: Number(mateMatch[1]),
        depth: depthMatch
          ? Number(depthMatch[1])
          : null,
      };
    }
  }

  finishRequest(message) {
    const parts = message.split(" ");
    const bestMove = parts[1];

    if (!this.currentRequest) {
      return;
    }

    const request = this.currentRequest;
    this.currentRequest = null;

    if (
      !bestMove ||
      bestMove === "(none)"
    ) {
      request.resolve({
        bestMove: null,
        evaluation: this.lastEvaluation,
      });

      return;
    }

    request.resolve({
      bestMove,
      evaluation: this.lastEvaluation,
    });
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

  requestAnalysis(
    fen,
    depth = 11
  ) {
    if (!this.worker || !this.ready) {
      return Promise.reject(
        new Error(
          "Stockfish ešte nie je pripravený."
        )
      );
    }

    if (this.currentRequest) {
      this.worker.postMessage("stop");

      this.currentRequest.reject(
        new Error(
          "Predchádzajúca analýza bola prerušená."
        )
      );

      this.currentRequest = null;
    }

    this.lastEvaluation = null;

    return new Promise((resolve, reject) => {
      this.currentRequest = {
        resolve,
        reject,
      };

      this.worker.postMessage(
        `position fen ${fen}`
      );

      this.worker.postMessage(
        `go depth ${depth}`
      );
    });
  }

  findBestMove(
    fen,
    depth = 10
  ) {
    return this.requestAnalysis(
      fen,
      depth
    );
  }

  analyzePosition(
    fen,
    depth = 12
  ) {
    return this.requestAnalysis(
      fen,
      depth
    );
  }

  newGame() {
    if (!this.worker) {
      return;
    }

    this.stop();
    this.worker.postMessage("ucinewgame");
    this.worker.postMessage("isready");
  }

  stop() {
    if (!this.worker) {
      return;
    }

    this.worker.postMessage("stop");

    if (this.currentRequest) {
      this.currentRequest.reject(
        new Error(
          "Analýza bola zastavená."
        )
      );

      this.currentRequest = null;
    }
  }

  destroy() {
    if (!this.worker) {
      return;
    }

    this.stop();
    this.worker.postMessage("quit");
    this.worker.terminate();

    this.worker = null;
    this.ready = false;
  }
}

export const stockfishEngine =
  new StockfishEngine();
EOF