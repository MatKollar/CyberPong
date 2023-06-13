const { socket, Ball, Paddle, Wall } = window;

class Pong {
  canvas;
  ctx;
  ball;
  paddles = [];
  walls = [];

  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ball = new Ball(canvas.width / 2, canvas.height / 2);
    this.backgroundImage = new Image();
    this.backgroundImage.src = "../frontend/images/samurai.png";
  }

  draw() {
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scaledWidth = canvas.width * 0.7;
    const scaledHeight = canvas.height * 0.7;
    const centerX = (canvas.width - scaledWidth) / 2;
    const centerY = (canvas.height - scaledHeight) / 2;
    this.ctx.drawImage(this.backgroundImage, centerX, centerY, scaledWidth, scaledHeight);
    this.ball.draw(this.ctx);
    this.paddles.forEach((paddle) => paddle.draw(this.ctx));
    this.walls.forEach((paddle) => paddle.draw(this.ctx));
  }

  createWalls(paddles) {
    paddles.forEach((paddle) => {
      const { position } = paddle;
      this.walls.push(new Wall(position));
    });
  }

  addWall(wall) {
    this.walls.push(new Wall(wall.position));
  }

  createPaddles(paddles) {
    paddles.forEach((paddle) => {
      const { x, y, width, height, position } = paddle;
      this.paddles.push(new Paddle(x, y, width, height, position));
    });
  }

  updatePaddles(paddles) {
    if (paddles.length < this.paddles.length) {
      const paddle = this.paddles.find(
        (paddle) => !paddles.find((p) => p.position === paddle.position),
      );
      this.paddles = this.paddles.filter((p) => p.position !== paddle.position);
    }
    paddles.forEach((paddle) => {
      const foundPaddle = this.getPaddleByPosition(paddle.position);
      foundPaddle.x = paddle.x;
      foundPaddle.y = paddle.y;
    });
  }

  getPaddleByPosition(position) {
    return this.paddles.find((paddle) => paddle.position === position);
  }
}

window.Pong = Pong;
