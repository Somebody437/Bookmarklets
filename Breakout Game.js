(() => {
  if (window.__breakoutRunning) return;
  window.__breakoutRunning = true;

  /* Overlay dark background */
  const dimmer = document.createElement("div");
  Object.assign(dimmer.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 999997,
    pointerEvents: "none"
  });
  document.body.appendChild(dimmer);

  /* Create game canvas */
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  Object.assign(canvas.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 999999,
    backgroundColor: "transparent",
    pointerEvents: "none"
  });
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  /* Wrapper for cloned elements */
  const wrapper = document.createElement("div");
  Object.assign(wrapper.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    zIndex: 999998,
    pointerEvents: "none"
  });
  document.body.appendChild(wrapper);

  /* Select DOM elements that are safe to embed */
  const usableElements = Array.from(document.querySelectorAll("button, img, input, a, div, p"))
    .filter(el =>
      el.offsetWidth > 30 && el.offsetHeight > 10 &&
      !wrapper.contains(el) && !canvas.contains(el) && !dimmer.contains(el)
    );

  /* Game settings */
  let paddleWidth = 100;
  let paddleHeight = 12;
  let paddleX = (canvas.width - paddleWidth) / 2;
  let paddleY = canvas.height * 0.75;
  let rightPressed = false;
  let leftPressed = false;

  let ballRadius = 8;
  let x = canvas.width / 2;
  let y = paddleY - 20;
  let dx = (Math.random() * 4 - 2);
  let dy = -Math.sqrt(9 - dx * dx);

  const brickRowCount = 5;
  const brickColumnCount = 6;
  const brickWidth = 75;
  const brickHeight = 20;
  const brickPadding = 10;
  const brickOffsetTop = 30;
  const totalBrickWidth = brickColumnCount * (brickWidth + brickPadding) - brickPadding;
  const brickOffsetLeft = (canvas.width - totalBrickWidth) / 2;

  let bricks = [];
  let score = 0;
  let speedMultiplier = 1;

  /* Create and layout bricks */
  function resetBricks() {
    while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        const brick = { x: brickX, y: brickY, status: 1, embedded: null, bg: null };

        /* Black backing div */
        const bg = document.createElement("div");
        Object.assign(bg.style, {
          position: "absolute",
          top: `${brickY}px`,
          left: `${brickX}px`,
          width: `${brickWidth}px`,
          height: `${brickHeight}px`,
          backgroundColor: "black",
          zIndex: 999998
        });
        wrapper.appendChild(bg);
        brick.bg = bg;

        /* Add element if safe and resizable */
        if (usableElements.length) {
          const el = usableElements[Math.floor(Math.random() * usableElements.length)];
          try {
            const clone = el.cloneNode(true);
            Object.assign(clone.style, {
              position: "absolute",
              top: `${brickY}px`,
              left: `${brickX}px`,
              width: `${brickWidth}px`,
              height: `${brickHeight}px`,
              overflow: "hidden",
              pointerEvents: "none",
              zIndex: 999999
            });
            wrapper.appendChild(clone);
            brick.embedded = clone;
          } catch (e) {
            /* Ignore unsafe elements */
          }
        }

        bricks[c][r] = brick;
      }
    }
  }

  resetBricks();

  /* Handle key events */
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "ArrowLeft") leftPressed = true;
    else if (e.key === "Escape") {
      canvas.remove();
      wrapper.remove();
      dimmer.remove();
      window.__breakoutRunning = false;
    }
  });

  document.addEventListener("keyup", e => {
    if (e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "ArrowLeft") leftPressed = false;
  });

  /* Draw functions */
  function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r];
        if (b.status === 1) {
          ctx.beginPath();
          ctx.rect(b.x, b.y, brickWidth, brickHeight);
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.closePath();
        }
      }
    }
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
  }

  function drawPaddle() {
    const radius = 10;
    ctx.beginPath();
    ctx.moveTo(paddleX + radius, paddleY);
    ctx.lineTo(paddleX + paddleWidth - radius, paddleY);
    ctx.quadraticCurveTo(paddleX + paddleWidth, paddleY, paddleX + paddleWidth, paddleY + radius);
    ctx.lineTo(paddleX + paddleWidth, paddleY + paddleHeight - radius);
    ctx.quadraticCurveTo(paddleX + paddleWidth, paddleY + paddleHeight, paddleX + paddleWidth - radius, paddleY + paddleHeight);
    ctx.lineTo(paddleX + radius, paddleY + paddleHeight);
    ctx.quadraticCurveTo(paddleX, paddleY + paddleHeight, paddleX, paddleY + paddleHeight - radius);
    ctx.lineTo(paddleX, paddleY + radius);
    ctx.quadraticCurveTo(paddleX, paddleY, paddleX + radius, paddleY);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
  }

  function drawScore() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("Score: " + score, 8, 20);
  }

  /* Detect collisions */
  function collisionDetection() {
    let allCleared = true;
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r];
        if (b.status == 1) {
          allCleared = false;
          if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
            dy = -dy;
            b.status = 0;
            if (b.embedded) b.embedded.remove();
            if (b.bg) b.bg.remove();
            score++;
          }
        }
      }
    }

    if (allCleared) {
      speedMultiplier *= 1.2;
      dx = (Math.random() * 4 - 2) * speedMultiplier;
      dy = -Math.sqrt(Math.max(1, 9 - dx * dx)) * speedMultiplier;
      x = canvas.width / 2;
      y = paddleY - 20;
      resetBricks();
    }
  }

  /* Main loop */
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawBall();
    drawPaddle();
    drawScore();
    collisionDetection();

    if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
    if (y + dy < ballRadius) dy = -dy;
    else if (y + dy > paddleY - ballRadius) {
      if (x > paddleX && x < paddleX + paddleWidth) {
        const hitRatio = (x - paddleX) / paddleWidth * 2 - 1;
        const maxAngle = Math.PI / 2.2;
        const angle = hitRatio * maxAngle;
        const speed = Math.sqrt(dx * dx + dy * dy);

        dx = speed * Math.sin(angle);
        dy = -Math.abs(speed * Math.cos(angle));
      } else if (y + dy > canvas.height - ballRadius) {
        alert("Game Over! Final score: " + score);
        canvas.remove();
        wrapper.remove();
        dimmer.remove();
        window.__breakoutRunning = false;
        return;
      }
    }

    x += dx;
    y += dy;

    if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 7;
    else if (leftPressed && paddleX > 0) paddleX -= 7;

    requestAnimationFrame(draw);
  }

  draw();
})();
