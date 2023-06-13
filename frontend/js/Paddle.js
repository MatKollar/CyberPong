const { socket } = window;

class Paddle {
  constructor(x, y, width, height, position, color = "black") {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.position = position;
    this.color = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    if (this.position === "left" || this.position === "right") {
      ctx.fillRect(this.x, this.y, this.width, this.height);
    } else {
      ctx.fillRect(this.x, this.y, this.height, this.width);
    }
  }
}

class Wall extends Paddle {
  constructor(position) {
    const wallSettings = {
      top: { x: 0, y: 0, width: 600, height: 35 },
      bottom: { x: 0, y: 565, width: 600, height: 35 },
      left: { x: 0, y: 0, width: 35, height: 600 },
      right: { x: 565, y: 0, width: 35, height: 600 },
    };

    super(
      wallSettings[position].x,
      wallSettings[position].y,
      wallSettings[position].width,
      wallSettings[position].height,
      position,
      "#fdf800",
    );
  }

  draw(ctx) {
    ctx.fillStyle = "#fdf800";
    ctx.fillRect(this.x, this.y, this.width, this.height);

    ctx.strokeStyle = "black";
    ctx.lineWidth = 5;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    const spacing = 20;
    const lineLength = 10;

    if (this.position === "top" || this.position === "bottom") {
      for (let x = this.x + spacing; x < this.x + this.width; x += spacing) {
        ctx.moveTo(x, this.y);
        ctx.lineTo(x - lineLength, this.y + lineLength);
      }
    } else {
      for (let y = this.y + spacing; y < this.y + this.height; y += spacing) {
        ctx.moveTo(this.x, y);
        ctx.lineTo(this.x + lineLength, y - lineLength);
      }
    }

    ctx.stroke();
  }
}

window.Paddle = Paddle;
window.Wall = Wall;
