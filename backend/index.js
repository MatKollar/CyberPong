let express = require("express");
let WebSocket = require("ws");
let http = require("http");

let app = express();
let PORT = 9000;
const CANVAS_WIDTH = 600;

let server = http.createServer(app);
let wss = new WebSocket.Server({ server });
const connectedClients = new Set();
let queuedUsers = [];
let walls = [];

let speed = 10;
let interval = null;
let gameStarted = false;
let ball;
let score = 0;

function handleKeystroke(ws, key) {
  const userMoving = queuedUsers.find((user) => user.conn === ws);
  if (userMoving) {
    if (key === "up") {
      userMoving.up();
    }
    if (key === "down") {
      userMoving.down();
    }
  }
}

function handleKeyRelease(ws) {
  const userStopping = queuedUsers.find((user) => user.conn === ws);
  if (userStopping) {
    userStopping.stop();
  }
}

function handleQueueUp(ws, name) {
  if (!name) {
    return;
  }
  const user = new User(name, ws);
  queuedUsers.push(user);
  sendNamesMessage();
  sendQueueMessage();
  if (queuedUsers.length === 4) {
    startGame();
  }
}

function handleClose(ws) {
  connectedClients.delete(ws);
  sendClientCount();
  for (let i = 0; i < queuedUsers.length; i++) {
    const user = queuedUsers[i];
    if (user.conn === ws) {
      queuedUsers.splice(i, 1);
      break;
    }
  }
  sendNamesMessage();
  sendQueueMessage();
  sendClientCount();
}

const PLAY_GAME = "play_game";
const RANK_STATUS = "rank_status";
const GAME_STATUS = "game_status";
const UPDATE_WALL = "update_wall";
const GAME_IN_PROGRESS = "game_in_progress";
const GAME_OVER = "game_over";

wss.on("connection", function connection(ws) {
  connectedClients.add(ws);
  sendClientCount();
  sendGameInProgress();

  ws.on("message", (message) => {
    const msg = JSON.parse(message);

    if (!msg.action) {
      return;
    }

    switch (msg.action) {
      case "keystroke":
        handleKeystroke(ws, msg.key);
        break;
      case "key_release":
        handleKeyRelease(ws);
        break;
      case "play_game":
        startGame();
        break;
      case "check_players":
        sendMessageEachClient(
          JSON.stringify({
            action: "check_players",
            paddles: queuedUsers.map((user) => user.paddle),
            walls: walls,
          }),
        );
        break;
      case "queue_up":
        handleQueueUp(ws, msg.name);
        break;
      case "send_message":
        sendMessageEachClient(
          JSON.stringify({
            action: "send_message",
            message: msg.message,
          }),
        );
        break;
      case "get_players_count":
        socket.send(
          JSON.stringify({
            action: "players_count",
            count: clients.size,
          }),
        );
        break;
      default:
        break;
    }
  });

  ws.on("close", () => {
    handleClose(ws);
  });
});

function sendClientCount() {
  connectedClients.forEach((client) => {
    const response = {
      action: "players_count",
      count: connectedClients.size,
    };
    client.send(JSON.stringify(response));
  });
}

function sendGameInProgress() {
  if (gameStarted) {
    connectedClients.forEach((client) => {
      const response = {
        action: GAME_IN_PROGRESS,
        gameInProgress: true,
      };
      client.send(JSON.stringify(response));
    });
  }
}

function sendNamesMessage() {
  sendMessageEachClient(
    JSON.stringify({
      action: "lobby_names",
      names: getNames(),
    }),
  );
}

function getNames() {
  return queuedUsers.map((user) => user.name);
}

function sendMessageEachClient(msg) {
  connectedClients.forEach((client) => client.send(msg));
}

function sendQueueMessage() {
  sortUsers();
  let rank = 1;

  queuedUsers.forEach((user) => {
    user.conn.send(
      JSON.stringify({
        action: RANK_STATUS,
        rank: rank,
        user: {
          name: user.name,
          paddle: user.paddle,
        },
      }),
    );
    rank++;
  });
}

const paddleHeight = 100;
const positions = ["left", "right", "top", "bottom"];
const paddlePositions = [
  { x: 10, y: 250 - paddleHeight / 2 },
  { x: CANVAS_WIDTH - 30, y: 250 - paddleHeight / 2 },
  { x: 250, y: 10 },
  { x: 250, y: CANVAS_WIDTH - 30 },
];

function initializePaddles() {
  for (let i = 0; i < queuedUsers.length; i++) {
    const user = queuedUsers[i];
    const pos = positions[i];
    const paddlePos = paddlePositions[i];
    user.setPaddle(new Paddle(paddlePos.x, paddlePos.y, 20, 100, pos));
  }
}

function createWalls() {
  let i = queuedUsers.length;
  while (i < 4) {
    const position = positions[i];
    walls.push(new Wall(position));
    i++;
  }
}

function sendGameState() {
  queuedUsers.forEach((user) => {
    user.conn.send(
      JSON.stringify({
        action: GAME_STATUS,
        ball: {
          x: ball.x,
          y: ball.y,
        },
        paddles: queuedUsers.map((user) => user.paddle),
        playerHP: queuedUsers.map((user) => {
          return {
            name: user.name,
            health: user.health,
          };
        }),
        score: score,
      }),
    );
  });
}

function startGame() {
  sendMessageEachClient(
    JSON.stringify({
      action: GAME_IN_PROGRESS,
    }),
  );

  gameStarted = true;
  score = 0;
  ball = new Ball();
  ball.speed = 5;

  initializePaddles();
  createWalls();

  sendMessageEachClient(
    JSON.stringify({
      action: PLAY_GAME,
    }),
  );

  let previousTime = performance.now();
  let currentTime = performance.now();
  let elapsedTime = 0;
  let tickCount = 0;
  interval = setInterval(() => {
    if (gameStarted) {
      previousTime = currentTime;
      currentTime = performance.now();
      let dt = (currentTime - previousTime) / 1000;
      elapsedTime += dt;

      if (elapsedTime > 1) {
        elapsedTime--;
        tickCount++;
      }
      if (tickCount > 5) {
        ball.increaseSpeed();
        tickCount = 0;
      }

      ball.tick();
      sendGameState();
    }
  }, 1000 / 60);
}

function sortUsers() {
  queuedUsers = queuedUsers.sort((a, b) => a.rank - b.rank);
}

function updateWall(wall) {
  sendMessageEachClient(
    JSON.stringify({
      action: UPDATE_WALL,
      wall: wall,
    }),
  );
}

function findUserByPaddlePosition(position) {
  return queuedUsers.find((user) => user.paddle.position === position);
}

function updateUserHealth(user) {
  user.health--;
  if (user.health <= 0) {
    user.conn.send(
      JSON.stringify({
        action: GAME_OVER,
        placing: queuedUsers.length,
      }),
    );
    const wall = new Wall(user.paddle.position);
    walls.push(wall);
    updateWall(wall);
    queuedUsers.splice(queuedUsers.indexOf(user), 1);
    sendQueueMessage();
  }
}

function decreasePlayerHealth(x, y) {
  let user;
  if (y < 0) {
    user = findUserByPaddlePosition("top");
  } else if (y > CANVAS_WIDTH) {
    user = findUserByPaddlePosition("bottom");
  } else if (x < 0) {
    user = findUserByPaddlePosition("left");
  } else if (x > CANVAS_WIDTH) {
    user = findUserByPaddlePosition("right");
  }

  if (user) {
    updateUserHealth(user);
  }
}

class User {
  static counter = 0;
  health;
  conn;
  rank;
  name;
  paddle;
  movementInterval;

  constructor(name, conn) {
    this.health = 3;
    this.name = name;
    this.conn = conn;
    this.rank = User.counter;
    User.counter++;
    this.movementInterval = null;
  }

  setPaddle(paddle) {
    this.paddle = paddle;
  }

  up() {
    this.startMovingInterval(() => this.paddle.moveUp());
  }

  down() {
    this.startMovingInterval(() => this.paddle.moveDown());
  }

  startMovingInterval(callback) {
    if (gameStarted && !this.movementInterval) {
      this.movementInterval = setInterval(callback, 1000 / 60);
    }
  }

  stop() {
    clearInterval(this.movementInterval);
    this.movementInterval = null;
  }
}

class Ball {
  x;
  y;
  angle;
  speed;
  constructor() {
    this.x = 300;
    this.y = 300;
    this.speed = 5;
    this.angle = Math.random() * 2 * Math.PI;
  }

  tick() {
    this.move();
    const paddle = this.collidesWithPaddle();

    if (paddle) {
      this.handlePaddleCollision(paddle);
    }

    if (this.isOutOfBounds()) {
      decreasePlayerHealth(this.x, this.y);
      this.resetPosition();
    }

    if (queuedUsers.length === 0) {
      this.handleGameOver();
    }
  }

  move() {
    this.x += this.speed * Math.cos(this.angle);
    this.y += this.speed * Math.sin(this.angle);
  }

  handlePaddleCollision(paddle) {
    score++;
    if (Math.random() < 0.3) {
      if (paddle.position === "left" || paddle.position === "right") {
        this.angle = Math.PI - this.angle + 0.2;
      } else {
        this.angle = 2 * Math.PI - this.angle + 0.2;
      }
    } else {
      if (paddle.position === "left" || paddle.position === "right") {
        this.angle = Math.PI - this.angle;
      } else {
        this.angle = 2 * Math.PI - this.angle;
      }
    }
  }

  isOutOfBounds() {
    return this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_WIDTH;
  }

  resetPosition() {
    this.x = 250;
    this.y = 250;
    this.angle = Math.random() * 2 * Math.PI;
  }

  handleGameOver() {
    ball = null;
    gameStarted = false;
    queuedUsers = [];
    walls = [];
    clearInterval(interval);
    sendQueueMessage();
  }

  collidesWithPaddle() {
    for (let i = 0; i < queuedUsers.length; i++) {
      const paddle = queuedUsers[i].paddle;
      const isVerticalPaddle = paddle.position === "left" || paddle.position === "right";

      const inXRange = ball.x >= paddle.x - 12 && ball.x <= paddle.x + paddle.width + 12;
      const inYRange = ball.y >= paddle.y - 5 && ball.y <= paddle.y + paddle.height + 5;
      const verticalPaddleCollision = isVerticalPaddle && inXRange && inYRange;

      const inWidthRange = ball.x >= paddle.x && ball.x <= paddle.x + paddle.height;
      const inHeightRange = ball.y >= paddle.y && ball.y <= paddle.y + paddle.width;
      const horizontalPaddleCollision =
        !isVerticalPaddle && inWidthRange && inHeightRange;

      if (verticalPaddleCollision || horizontalPaddleCollision) {
        return paddle;
      }
    }
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const inXRange = ball.x >= wall.x && ball.x <= wall.x + wall.width;
      const inYRange = ball.y >= wall.y && ball.y <= wall.y + wall.height;

      if (inXRange && inYRange) {
        return wall;
      }
    }
  }

  increaseSpeed() {
    this.speed = (this.speed + 0.1) * 1.05;
  }
}

class Paddle {
  constructor(x, y, width, height, position) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.position = position;
  }

  toString() {
    return this.position;
  }

  moveUp() {
    if (this.position === "top" || this.position === "bottom") {
      if (this.x > 0) {
        this.x -= speed;
      }
    } else {
      if (this.y > 0) {
        this.y -= speed;
      }
    }
  }

  moveDown() {
    if (this.position === "top" || this.position === "bottom") {
      if (this.x < CANVAS_WIDTH - this.width) {
        this.x += speed;
      }
    } else {
      if (this.y < CANVAS_WIDTH - this.height) {
        this.y += speed;
      }
    }
  }
}

class Wall extends Paddle {
  constructor(position) {
    if (position === "top") {
      super(0, 0, 650, 45, position);
    } else if (position === "bottom") {
      super(0, 550, CANVAS_WIDTH, 35, position);
    } else if (position === "left") {
      super(0, 0, 35, CANVAS_WIDTH, position);
    } else {
      super(550, 0, 35, CANVAS_WIDTH, position);
    }
  }
}

app.use(express.static("../frontend"));

server.listen(PORT, function () {
  console.log(`app started`);
});
