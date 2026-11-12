import {
  ASTEROID_SPRITES,
  BOSS_ASTEROID_SPRITE,
  BOSS_METEOR_SPRITE,
  BOSS_VICTORY_DELAY_MS,
  CONFIG,
  LEVEL_TEXTS,
  PLAYER_SHIP_SPRITE
} from "./config.js";

let context;
let returnToMenuButton;
let paddle;
let balls;
let bricks;
let powerUps;
let particles;
let bossMeteors;
let activeEffects;
let stars;
let boss;
let bossExplosion;
let score;
let lives;
let level;
let state;
let pausedFromState;
let getBallSpeed;
let getLevelBaseSpeed;

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawStars() {
  context.save();
  context.globalAlpha = 0.6;
  context.fillStyle = "#ffffff";
  for (const star of stars) {
    context.beginPath();
    context.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawPrincess(x, y) {
  const rows = [
    "..C.C.C..",
    ".HHHHHHH.",
    ".HFFFFFH.",
    "..FEFEF..",
    "..FFFFF..",
    "..VVVVV..",
    ".VVVVVVV.",
    "VV.V.V.VV"
  ];
  const colors = {
    C: "#FFD700",
    H: "#FFD700",
    F: "#FFDAB9",
    E: "#1a1a2e",
    V: "#AA44FF"
  };

  rows.forEach((row, rowIndex) => {
    [...row].forEach((pixel, columnIndex) => {
      if (pixel !== ".") {
        context.fillStyle = colors[pixel];
        context.fillRect(x + columnIndex * 8, y + rowIndex * 8, 8, 8);
      }
    });
  });
}

function drawDialogBubble(x, y, width, height, lines) {
  roundedRect(x, y, width, height, 12);
  context.fillStyle = "#0d1b2a";
  context.fill();
  context.strokeStyle = "#00FFFF";
  context.lineWidth = 2;
  context.stroke();

  context.beginPath();
  context.moveTo(x + 1, y + height / 2 - 9);
  context.lineTo(x - 12, y + height / 2);
  context.lineTo(x + 1, y + height / 2 + 9);
  context.closePath();
  context.fillStyle = "#0d1b2a";
  context.fill();
  context.strokeStyle = "#00FFFF";
  context.stroke();

  context.fillStyle = "#e8f7ff";
  context.font = "14px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const firstLineY = y + height / 2 - ((lines.length - 1) * 22) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, x + width / 2, firstLineY + index * 22);
  });
}

function drawIntro() {
  context.fillStyle = "#e8f7ff";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "bold 36px monospace";
  context.fillStyle = "#00FFFF";
  context.fillText("DEFESA ESPACIAL", CONFIG.canvasWidth / 2, 60);
  drawPrincess(120, 200);
  drawDialogBubble(280, 190, 380, 110, [
    "Comandante Vega!",
    "Estou presa em Sentinel-7,",
    "cercada por meteoros.",
    "Venha me resgatar!"
  ]);
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    context.fillStyle = "#ffffff";
    context.font = "16px monospace";
    context.fillText("PRESSIONE ESPAÇO PARA INICIAR", CONFIG.canvasWidth / 2, 560);
  }
  if (window.location.protocol === "file:") {
    context.fillStyle = "#ffcf70";
    context.font = "12px monospace";
    context.fillText(
      "Para ouvir música: python -m http.server 8000 e abra localhost:8000.",
      CONFIG.canvasWidth / 2,
      538
    );
  }
  context.fillStyle = "#a9eaff";
  context.font = "13px monospace";
  context.fillText("TECLAS 2, 3, 4 OU 5: INICIAR DIRETO NO NÍVEL", CONFIG.canvasWidth / 2, 584);
}

function drawTransition() {
  const text = LEVEL_TEXTS[level];
  if (text) {
    drawOverlay(text.title, [...text.lines, "", "Pressione ESPAÇO para continuar"]);
  }
}

function drawBoss() {
  drawPixelMeteor(
    boss.x + boss.width / 2,
    boss.y + boss.height / 2,
    6,
    BOSS_ASTEROID_SPRITE,
    {
      D: "#59352b",
      M: "#a85637",
      H: "#e18b55",
      h: "#d4784e",
      d: "#78402f",
      C: "#49332d",
      c: "#694336"
    }
  );

  const barX = 200;
  const barY = 48;
  const barWidth = 400;
  const barHeight = 12;
  const radius = barHeight / 2;
  roundedRect(barX, barY, barWidth, barHeight, radius);
  context.fillStyle = "#30343b";
  context.fill();
  roundedRect(
    barX,
    barY,
    Math.max(barHeight, barWidth * (boss.hp / boss.maxHp)),
    barHeight,
    radius
  );
  context.fillStyle = "#ff2244";
  context.fill();
}

function drawPixelMeteor(x, y, pixel, sprite = BOSS_METEOR_SPRITE, colors = {
  D: "#743d35",
  M: "#d46a42"
}) {
  sprite.forEach((row, rowIndex) => {
    [...row].forEach((cell, columnIndex) => {
      if (colors[cell]) {
        context.fillStyle = colors[cell];
        context.fillRect(
          x - (sprite[0].length * pixel) / 2 + columnIndex * pixel,
          y - (sprite.length * pixel) / 2 + rowIndex * pixel,
          pixel + 0.5,
          pixel + 0.5
        );
      }
    });
  });
}

function drawBossMeteors() {
  for (const meteor of bossMeteors) {
    drawPixelMeteor(meteor.x, meteor.y, 4);
  }
}

function drawBossVictory() {
  if (performance.now() - bossExplosion.startedAt < BOSS_VICTORY_DELAY_MS) {
    drawBossExplosion();
    return;
  }

  drawBossExplosion();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#FFD700";
  context.font = "bold 40px monospace";
  context.fillText("MISSÃO CUMPRIDA!", CONFIG.canvasWidth / 2, 80);
  drawPrincess(120, 180);
  drawDialogBubble(280, 170, 380, 130, [
    "Você conseguiu, Comandante!",
    "Nunca pensei que alguém",
    "viria até aqui. Obrigada,",
    "estou livre!"
  ]);
  context.fillStyle = "#8de8ff";
  context.font = "bold 24px monospace";
  context.fillText(`PONTUAÇÃO FINAL: ${score}`, CONFIG.canvasWidth / 2, 440);
  context.fillStyle = "#c3cedd";
  context.font = "16px monospace";
  context.fillText("Pressione R para jogar novamente", CONFIG.canvasWidth / 2, 490);
}

function drawBossExplosion() {
  if (!bossExplosion.active) {
    return;
  }

  context.save();
  if (bossExplosion.elapsed < 0.22) {
    const progress = bossExplosion.elapsed / 0.22;
    context.globalAlpha = 1 - progress;
    context.beginPath();
    context.arc(bossExplosion.x, bossExplosion.y, 38 * (1 - progress), 0, Math.PI * 2);
    context.fillStyle = "#fff7a1";
    context.fill();
  }
  if (bossExplosion.elapsed < 0.8) {
    const progress = bossExplosion.elapsed / 0.8;
    context.globalAlpha = 1 - progress;
    context.beginPath();
    context.arc(bossExplosion.x, bossExplosion.y, 18 + progress * 162, 0, Math.PI * 2);
    context.strokeStyle = progress < 0.5 ? "#fff7a1" : "#ff8c32";
    context.lineWidth = 8 * (1 - progress) + 1;
    context.stroke();
  }

  for (const particle of bossExplosion.particles) {
    context.globalAlpha = 1 - particle.age / particle.lifetime;
    context.fillStyle = particle.color;
    context.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }
  context.restore();
}

function drawAsteroid(brick) {
  const { x, y, width, height } = brick;
  const pixel = 6;
  const spriteWidth = ASTEROID_SPRITES[brick.sprite][0].length * pixel;
  const spriteHeight = ASTEROID_SPRITES[brick.sprite].length * pixel;
  const offsetX = (width - spriteWidth) / 2;
  const offsetY = (height - spriteHeight) / 2;
  const colors = {
    "#": "#929292",
    d: "#696969",
    h: "#b5b5b5"
  };
  const sprite = ASTEROID_SPRITES[brick.sprite];

  sprite.forEach((row, rowIndex) => {
    [...row].forEach((pixelType, columnIndex) => {
      if (colors[pixelType]) {
        context.fillStyle = colors[pixelType];
        context.fillRect(
          x + offsetX + columnIndex * pixel,
          y + offsetY + rowIndex * pixel,
          pixel + 0.5,
          pixel + 0.5
        );
      }
    });
  });
}

function drawBricks() {
  for (const brick of bricks) {
    if (!brick.active) {
      continue;
    }

    drawAsteroid(brick);
    context.fillStyle = "#07101b";
    context.font = "bold 12px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(String(brick.hits), brick.x + brick.width / 2, brick.y + brick.height / 2 + 0.5);
  }
}

function drawPaddle() {
  context.beginPath();
  context.arc(
    paddle.x + paddle.width / 2,
    paddle.y + paddle.height,
    paddle.width / 2,
    Math.PI,
    Math.PI * 2
  );
  context.strokeStyle = paddle.color;
  context.lineWidth = CONFIG.paddleShieldThickness;
  context.lineCap = "round";
  context.stroke();
  context.lineCap = "butt";

  const shipColors = {
    W: "#ffffff",
    G: "#dce5ec"
  };
  const pixel = 3;
  const shipWidth = PLAYER_SHIP_SPRITE[0].length * pixel;
  const shipHeight = PLAYER_SHIP_SPRITE.length * pixel;
  const shipX = paddle.x + (paddle.width - shipWidth) / 2;
  const shipY = paddle.y + paddle.height - shipHeight - 8;

  PLAYER_SHIP_SPRITE.forEach((row, rowIndex) => {
    [...row].forEach((cell, columnIndex) => {
      if (shipColors[cell]) {
        context.fillStyle = shipColors[cell];
        context.fillRect(
          shipX + columnIndex * pixel,
          shipY + rowIndex * pixel,
          pixel + 0.5,
          pixel + 0.5
        );
      }
    });
  });

  const flamePhase = Math.floor(performance.now() / 120) % 3;
  const engineColumns = [2, 4, 6];
  engineColumns.forEach((column, index) => {
    const flameLength = 2 + ((flamePhase + index) % 2);
    for (let row = 0; row < flameLength; row += 1) {
      context.fillStyle = row === 0 ? "#fff2a1" : row === 1 ? "#ffad4d" : "#f05b35";
      context.fillRect(
        shipX + column * pixel,
        shipY + shipHeight + row * pixel,
        pixel,
        pixel + 0.5
      );
    }
  });
}

function drawBall(currentBall) {
  context.beginPath();
  context.arc(currentBall.x, currentBall.y, currentBall.radius, 0, Math.PI * 2);
  context.fillStyle = currentBall.color;
  context.fill();
}

function drawPowerUps() {
  const symbols = { wide: "W", multi: "2×" };
  for (const powerUp of powerUps) {
    context.beginPath();
    context.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
    context.fillStyle = CONFIG.powerUpColors[powerUp.type];
    context.fill();
    context.fillStyle = "#07101b";
    context.font = "bold 13px monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(symbols[powerUp.type], powerUp.x, powerUp.y + 1);
  }
}

function drawParticles() {
  for (const particle of particles) {
    context.globalAlpha = particle.alpha;
    context.fillStyle = particle.color;
    context.fillRect(particle.x, particle.y, 3, 3);
  }
  context.globalAlpha = 1;
}

function drawLifeHeart(x, y) {
  const pixel = 2;
  const heart = [
    "..KK..KK..",
    ".KRRKKRRK.",
    "KRRRRRRRRK",
    "KRRRRRRRRK",
    ".KRRRRRRK.",
    "..KRRRRK..",
    "...KRRK...",
    "....KK...."
  ];
  const colors = {
    K: "#25252a",
    R: "#ed2535"
  };

  heart.forEach((row, rowIndex) => {
    [...row].forEach((cell, columnIndex) => {
      if (colors[cell]) {
        context.fillStyle = colors[cell];
        context.fillRect(x + columnIndex * pixel, y + rowIndex * pixel, pixel, pixel);
      }
    });
  });
  context.fillStyle = "#ff7780";
  context.fillRect(x + 3 * pixel, y + 2 * pixel, pixel, pixel);
  context.fillRect(x + 7 * pixel, y + 2 * pixel, pixel, pixel);
}

function drawHud() {
  context.fillStyle = "#d9f6ff";
  context.font = "16px monospace";
  context.textBaseline = "top";
  context.textAlign = "left";
  context.fillText(`PONTOS ${String(score).padStart(5, "0")}`, 24, 22);
  context.textAlign = "center";
  context.fillText(`NÍVEL ${level}`, CONFIG.canvasWidth / 2, 22);
  const heartCount = Math.max(0, lives);
  const heartWidth = 20;
  const heartGap = 4;
  const heartsWidth = heartCount * heartWidth + Math.max(0, heartCount - 1) * heartGap;
  for (let index = 0; index < heartCount; index += 1) {
    drawLifeHeart(CONFIG.canvasWidth - 24 - heartsWidth + index * (heartWidth + heartGap), 20);
  }

  const effects = [];
  const speedMultiplier = getBallSpeed() / getLevelBaseSpeed();
  if (speedMultiplier > 1) {
    effects.push(`VELOCIDADE x${speedMultiplier.toFixed(1)}`);
  }
  if (activeEffects.wide > performance.now()) {
    effects.push(`RAQUETE ${Math.ceil((activeEffects.wide - performance.now()) / 1000)}s`);
  }
  if (effects.length > 0) {
    context.textAlign = "center";
    context.fillStyle = "#a9eaff";
    context.font = "12px monospace";
    context.fillText(effects.join("  ·  "), CONFIG.canvasWidth / 2, 48);
  }
}

function drawOverlay(title, lines) {
  context.fillStyle = "#030712c9";
  context.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#f4fbff";
  context.shadowColor = "#55c7ff";
  context.shadowBlur = 24;
  context.font = "bold 48px monospace";
  context.fillText(title, CONFIG.canvasWidth / 2, 230);
  context.shadowBlur = 0;
  context.font = "18px monospace";
  lines.forEach((line, index) => {
    context.fillStyle = index === 0 ? "#8de8ff" : "#c3cedd";
    context.fillText(line, CONFIG.canvasWidth / 2, 300 + index * 34);
  });
}

export function createRenderer(canvasElement, menuButton) {
  context = canvasElement.getContext("2d");
  returnToMenuButton = menuButton;

  return function draw(game) {
    ({
      paddle,
      balls,
      bricks,
      powerUps,
      particles,
      bossMeteors,
      activeEffects,
      stars,
      boss,
      bossExplosion,
      score,
      lives,
      level,
      state,
      pausedFromState,
      getBallSpeed,
      getLevelBaseSpeed
    } = game);

    returnToMenuButton.hidden = state !== "paused";
    context.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);
    drawStars();
    if (state === "intro") {
      drawIntro();
      return;
    }
    if (state === "transition") {
      drawTransition();
      return;
    }
    if (state === "bossVictory") {
      drawBossVictory();
      return;
    }

    drawBricks();
    drawPowerUps();
    drawParticles();
    drawPaddle();
    for (const currentBall of balls) {
      drawBall(currentBall);
    }
    if (state === "boss" || (state === "paused" && pausedFromState === "boss")) {
      drawBoss();
      drawBossMeteors();
    }
    drawHud();

    if (state === "start") {
      drawOverlay("BRICK BREAKER", [
        "Pressione ESPAÇO para jogar",
        "Setas ou mouse para mover · P para pausar",
        "Velocidade +10% a cada 10s (máx. 2× por nível)",
        "HTML · CSS · JavaScript"
      ]);
    } else if (state === "paused") {
      drawOverlay("PAUSADO", ["Pressione P para continuar"]);
    } else if (state === "gameover") {
      drawOverlay("GAME OVER", [
        `Pontuação final: ${score}`,
        "Pressione R para reiniciar"
      ]);
    } else if (state === "victory") {
      drawOverlay("VOCÊ VENCEU!", [
        `Pontuação: ${score}`,
        "Pressione ESPAÇO para o próximo nível"
      ]);
    }
  };
}
