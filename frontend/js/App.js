const { createApp } = Vue;
const { Pong } = window;
let socket;

const app = createApp({
  data() {
    return {
      game: null,
      player: null,
      gameInProgress: false,
      name: "",
      queuedNames: [],
      rank: 0,
      playerCount: 0,
      numberOfPlayers: 0,
      placing: 0,
      score: 0,
      state: "form",
    };
  },

  created() {
    socket = new WebSocket("wss://site125.webte.fei.stuba.sk/zadanie3/backend");
    window.socket = socket;

    socket.onmessage = (event) => {
      const _data = JSON.parse(event.data);
      if (_data.action === "players_count") {
        this.playerCount = _data.count;
      }

      if (_data.action === "lobby_names") {
        this.queuedNames = _data.names;
      }

      if (_data.action === "rank_status") {
        this.rank = _data.rank;
        this.player = _data.user;
      }

      if (_data.action === "game_in_progress") {
        this.gameInProgress = _data.gameInProgress;
      }

      if (_data.action === "play_game") {
        this.state = "game";
        this.numberOfPlayers = _data.numberOfPlayers;
        socket.send(
          JSON.stringify({
            action: "check_players",
          }),
        );
      }

      if (_data.action === "ball_pos") {
        this.game.ball.x = _data.x;
        this.game.ball.y = _data.y;
        this.reDraw();
      }

      if (_data.action === "check_players") {
        const canvas = document.getElementById("canvas");
        this.game = new Pong(canvas);
        this.game.createPaddles(_data.paddles);
        this.game.createWalls(_data.walls);
      }

      if (_data.action === "update_wall") {
        if (this.game) {
          this.game.addWall(_data.wall);
          this.reDraw();
        }
      }

      if (_data.action === "game_status") {
        this.game.ball.x = _data.ball.x;
        this.game.ball.y = _data.ball.y;
        this.game.updatePaddles(_data.paddles);
        this.player.hp = _data.playerHP.find(
          (player) => player.name === this.player.name,
        );
        this.score = _data.score;
        this.reDraw();
      }

      if (_data.action === "game_over") {
        this.state = "gameOver";
        this.game = null;
        this.placing = _data.placing;
      }
    };
  },

  watch: {
    state(newState) {
      if (newState === "game" || newState === "gameOver") {
        playMusic(newState);
      }
    },
  },

  methods: {
    reDraw() {
      this.game.draw();
    },
    queueUp: function () {
      this.state = "queue";
      socket.send(
        JSON.stringify({
          action: "queue_up",
          name: this.name,
        }),
      );
    },
    startGame: function () {
      socket.send(
        JSON.stringify({
          action: "play_game",
        }),
      );
      this.state = "game";
    },
    restart() {
      this.game = null;
      this.player = null;
      this.name = "";
      this.rank = 0;
      this.placing = 0;
      this.score = 0;
      this.numberOfPlayers = 0;
      this.queuedNames = [];
      this.state = "form";
    },
  },
}).mount("#app");

document.addEventListener("keydown", (event) => {
  if (
    event.code === "KeyW" ||
    event.code === "KeyA" ||
    event.code === "ArrowUp" ||
    event.code === "ArrowLeft"
  ) {
    socket.send(
      JSON.stringify({
        action: "keystroke",
        key: "up",
      }),
    );
  }
  if (
    event.code === "KeyS" ||
    event.code === "KeyD" ||
    event.code === "ArrowDown" ||
    event.code === "ArrowRight"
  ) {
    socket.send(
      JSON.stringify({
        action: "keystroke",
        key: "down",
      }),
    );
  }
});

document.addEventListener("keyup", (event) => {
  if (
    event.code === "KeyW" ||
    event.code === "KeyA" ||
    event.code === "ArrowUp" ||
    event.code === "ArrowLeft" ||
    event.code === "KeyS" ||
    event.code === "KeyD" ||
    event.code === "ArrowDown" ||
    event.code === "ArrowRight"
  ) {
    socket.send(
      JSON.stringify({
        action: "key_release",
        key: event.code,
      }),
    );
  }
});
