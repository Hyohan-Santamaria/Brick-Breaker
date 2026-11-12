"use strict";

import {
  ASTEROID_SPRITES,
  BOSS_VICTORY_DELAY_MS,
  CONFIG,
  REINFORCED_ROWS_BY_LEVEL
} from "./config.js";
import { createAudio } from "./audio.js";
import { createInput } from "./input.js";
import { createRenderer } from "./render.js";

const canvas = document.getElementById("game");
const returnToMenuButton = document.getElementById("return-to-menu");
const paddle = {
  x: (CONFIG.canvasWidth - CONFIG.paddleWidth) / 2,
  y: CONFIG.canvasHeight - CONFIG.paddleBottomOffset - CONFIG.paddleHeight,
  width: CONFIG.paddleWidth,
  height: CONFIG.paddleHeight,
  speed: CONFIG.paddleSpeed,
  color: "#b9f4ff"
};
let ball = {
  x: CONFIG.canvasWidth / 2,
  y: paddle.y - CONFIG.ballRadius - 1,
  radius: CONFIG.ballRadius,
  dx: CONFIG.ballSpeed * 0.65,
  dy: -CONFIG.ballSpeed * 0.76,
  color: "#ffffff"
};
const balls = [ball];
const bricks = [];
const powerUps = [];
const particles = [];
const bossMeteors = [];
const activeEffects = {
  wide: 0
};
const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * CONFIG.canvasWidth,
  y: Math.random() * CONFIG.canvasHeight,
  r: 0.5 + Math.random() * 1.5
}));
const boss = {
  x: 0,
  y: 0,
  width: 132,
  height: 108,
  hp: 20,
  maxHp: 20,
  dx: 3,
  active: false
};
const bossExplosion = {
  active: false,
  elapsed: 0,
  startedAt: 0,
  x: 0,
  y: 0,
  particles: []
};

let score = 0;
let lives = CONFIG.startingLives;
let level = 1;
let state = "start";
let lastFrameTime = 0;
let paddleWidthBeforePowerUp = CONFIG.paddleWidth;
let levelElapsed = 0;
let pausedFromState = "playing";
let bossMeteorElapsed = 0;
let input;
const { startAudio, updateMusicPlayback, playSound } = createAudio(() => state);
const draw = createRenderer(canvas, returnToMenuButton);

function drawFrame() {
  draw({
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
  });
}

function createBricks() {
  bricks.length = 0;
  const gridWidth =
    CONFIG.brickColumns * CONFIG.brickWidth +
    (CONFIG.brickColumns - 1) * CONFIG.brickGap;
  const left = (CONFIG.canvasWidth - gridWidth) / 2;

  for (let row = 0; row < CONFIG.brickRows; row += 1) {
    for (let column = 0; column < CONFIG.brickColumns; column += 1) {
      const hits = REINFORCED_ROWS_BY_LEVEL[level]?.includes(row) ? 2 : 1;
      const neighborIndexes = [
        column > 0 ? bricks.length - 1 : -1,
        row > 0 && column > 0 ? (row - 1) * CONFIG.brickColumns + column - 1 : -1,
        row > 0 ? (row - 1) * CONFIG.brickColumns + column : -1,
        row > 0 && column < CONFIG.brickColumns - 1
          ? (row - 1) * CONFIG.brickColumns + column + 1
          : -1
      ];
      const neighborSprites = new Set(
        neighborIndexes
          .filter((index) => index >= 0)
          .map((index) => bricks[index].sprite)
      );
      const availableSprites = ASTEROID_SPRITES
        .map((_, index) => index)
        .filter((index) => !neighborSprites.has(index));
      bricks.push({
        x: left + column * (CONFIG.brickWidth + CONFIG.brickGap),
        y: CONFIG.brickTop + row * (CONFIG.brickHeight + CONFIG.brickGap),
        width: CONFIG.brickWidth,
        height: CONFIG.brickHeight,
        active: true,
        color: CONFIG.colors[row],
        sprite: availableSprites[Math.floor(Math.random() * availableSprites.length)],
        hits,
        maxHits: hits
      });
    }
  }
}

function resetBall() {
  const speed = getBallSpeed();
  ball = {
    x: CONFIG.canvasWidth / 2,
    y: paddle.y - CONFIG.ballRadius - 1,
    radius: CONFIG.ballRadius,
    dx: speed * 0.65,
    dy: -speed * 0.76,
    color: "#ffffff"
  };
  balls.length = 0;
  balls.push(ball);
}

function getLevelBaseSpeed() {
  return CONFIG.ballSpeed * Math.pow(1 + CONFIG.levelSpeedIncrease, level - 1);
}

function getBallSpeed() {
  const increases = Math.min(
    Math.floor(levelElapsed / CONFIG.speedIncreaseInterval),
    (CONFIG.maxSpeedMultiplierPerLevel - 1) / CONFIG.speedIncreasePerInterval
  );
  const multiplier = 1 + increases * CONFIG.speedIncreasePerInterval;
  return getLevelBaseSpeed() * multiplier;
}

function getCurrentBallSpeed(currentBall = ball) {
  return Math.hypot(currentBall.dx, currentBall.dy);
}

function setBallSpeed(speed, currentBall = ball) {
  const currentSpeed = getCurrentBallSpeed(currentBall);
  if (currentSpeed === 0) {
    currentBall.dx = speed * 0.65;
    currentBall.dy = -speed * 0.76;
    return;
  }
  const multiplier = speed / currentSpeed;
  currentBall.dx *= multiplier;
  currentBall.dy *= multiplier;
}

function resetGame() {
  score = 0;
  lives = CONFIG.startingLives;
  level = 1;
  levelElapsed = 0;
  paddle.width = CONFIG.paddleWidth;
  paddle.x = (CONFIG.canvasWidth - paddle.width) / 2;
  activeEffects.wide = 0;
  paddleWidthBeforePowerUp = CONFIG.paddleWidth;
  balls.length = 0;
  powerUps.length = 0;
  particles.length = 0;
  bossMeteors.length = 0;
  bossExplosion.active = false;
  bossExplosion.particles.length = 0;
  createBricks();
  resetBall();
  boss.active = false;
  state = "intro";
}

function startAtLevel(selectedLevel) {
  resetGame();
  level = selectedLevel;
  levelElapsed = 0;
  createBricks();
  resetBall();
  if (level === 5) {
    initBoss();
    state = "boss";
  } else {
    state = "playing";
  }
  startAudio();
}

function initBoss() {
  boss.x = (CONFIG.canvasWidth - boss.width) / 2;
  boss.y = 80;
  boss.hp = 20;
  boss.maxHp = 20;
  boss.dx = 3;
  boss.active = true;
  bossMeteors.length = 0;
  bossMeteorElapsed = 0;
  bossExplosion.active = false;
  bossExplosion.particles.length = 0;
  bricks.length = 0;
}

function startBossExplosion() {
  const colors = ["#fff7a1", "#ffd54a", "#ff8c32", "#f34b2b", "#e7f2ff"];
  bossExplosion.active = true;
  bossExplosion.elapsed = 0;
  bossExplosion.startedAt = performance.now();
  bossExplosion.x = boss.x + boss.width / 2;
  bossExplosion.y = boss.y + boss.height / 2;
  bossExplosion.particles = Array.from({ length: 64 }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6;
    return {
      x: bossExplosion.x,
      y: bossExplosion.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      lifetime: BOSS_VICTORY_DELAY_MS / 1000,
      size: 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
  });
}

function updateBossExplosion(deltaTime) {
  if (!bossExplosion.active) {
    return;
  }

  bossExplosion.elapsed += deltaTime;
  for (let index = bossExplosion.particles.length - 1; index >= 0; index -= 1) {
    const particle = bossExplosion.particles[index];
    particle.age += deltaTime;
    particle.x += particle.vx * deltaTime * 60;
    particle.y += particle.vy * deltaTime * 60;
    particle.vy += 0.08 * deltaTime * 60;
    if (particle.age >= particle.lifetime) {
      bossExplosion.particles.splice(index, 1);
    }
  }

  if (bossExplosion.particles.length === 0) {
    bossExplosion.active = false;
  }
}

function movePaddle(deltaTime) {
  const pointerX = input.getPointerX();
  if (pointerX !== null) {
    paddle.x = pointerX - paddle.width / 2;
  } else {
    if (input.keys.has("ArrowLeft")) {
      paddle.x -= paddle.speed * deltaTime * 60;
    }
    if (input.keys.has("ArrowRight")) {
      paddle.x += paddle.speed * deltaTime * 60;
    }
  }
  paddle.x = Math.max(0, Math.min(CONFIG.canvasWidth - paddle.width, paddle.x));
}

function createParticles(brick) {
  for (let index = 0; index < CONFIG.particleCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: brick.color
    });
  }
}

function spawnPowerUp(brick) {
  if (Math.random() >= CONFIG.powerUpChance) {
    return;
  }
  const types = ["wide", "multi"];
  powerUps.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    radius: 11,
    type: types[Math.floor(Math.random() * types.length)]
  });
}

function activatePowerUp(type) {
  const now = performance.now();
  if (type === "wide") {
    if (activeEffects.wide <= now) {
      paddleWidthBeforePowerUp = paddle.width;
    }
    paddle.width = Math.min(CONFIG.paddleWidth * 1.5, CONFIG.canvasWidth);
    paddle.x = Math.min(paddle.x, CONFIG.canvasWidth - paddle.width);
    activeEffects.wide = now + 10000;
  } else if (type === "multi") {
    const duplicates = balls.map((currentBall) => {
      const angle = (Math.random() - 0.5) * 0.8;
      return {
        ...currentBall,
        dx: currentBall.dx * Math.cos(angle) - currentBall.dy * Math.sin(angle),
        dy: currentBall.dx * Math.sin(angle) + currentBall.dy * Math.cos(angle),
        radius: currentBall.radius,
        color: currentBall.color
      };
    });
    balls.push(...duplicates);
  }
}

function updateEffects(now) {
  if (activeEffects.wide && activeEffects.wide <= now) {
    paddle.width = paddleWidthBeforePowerUp;
    paddle.x = Math.min(paddle.x, CONFIG.canvasWidth - paddle.width);
    activeEffects.wide = 0;
  }
}

function collideCircleWithRect(rect, currentBall) {
  const nearestX = Math.max(rect.x, Math.min(currentBall.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(currentBall.y, rect.y + rect.height));
  const dx = currentBall.x - nearestX;
  const dy = currentBall.y - nearestY;
  return dx * dx + dy * dy <= currentBall.radius * currentBall.radius;
}

function collideCircleWithPaddleShield(x, y, radius) {
  const centerX = paddle.x + paddle.width / 2;
  const centerY = paddle.y + paddle.height;
  const arcRadius = paddle.width / 2;
  const relativeX = x - centerX;
  const relativeY = y - centerY;
  let closestX;
  let closestY;

  if (relativeY <= 0 && Math.abs(relativeX) <= arcRadius) {
    const distance = Math.hypot(relativeX, relativeY) || 1;
    closestX = centerX + relativeX / distance * arcRadius;
    closestY = centerY + relativeY / distance * arcRadius;
  } else {
    const endpointX = relativeX < 0 ? centerX - arcRadius : centerX + arcRadius;
    closestX = endpointX;
    closestY = centerY;
  }

  const normalX = x - closestX;
  const normalY = y - closestY;
  const distance = Math.hypot(normalX, normalY);
  const collisionDistance = radius + CONFIG.paddleShieldThickness / 2;
  if (distance > collisionDistance) {
    return null;
  }

  return {
    x: distance ? normalX / distance : 0,
    y: distance ? normalY / distance : -1
  };
}

function resolveBrickCollision(brick, previousX, previousY, currentBall) {
  const wasAbove = previousY + currentBall.radius <= brick.y;
  const wasBelow = previousY - currentBall.radius >= brick.y + brick.height;
  const wasLeft = previousX + currentBall.radius <= brick.x;
  const wasRight = previousX - currentBall.radius >= brick.x + brick.width;

  if ((wasAbove || wasBelow) && !(wasLeft || wasRight)) {
    currentBall.dy = wasAbove ? -Math.abs(currentBall.dy) : Math.abs(currentBall.dy);
    currentBall.y = wasAbove
      ? brick.y - currentBall.radius - 0.5
      : brick.y + brick.height + currentBall.radius + 0.5;
  } else if ((wasLeft || wasRight) && !(wasAbove || wasBelow)) {
    currentBall.dx = wasLeft ? -Math.abs(currentBall.dx) : Math.abs(currentBall.dx);
    currentBall.x = wasLeft
      ? brick.x - currentBall.radius - 0.5
      : brick.x + brick.width + currentBall.radius + 0.5;
  } else {
    const overlapX = currentBall.radius + brick.width / 2 -
      Math.abs(currentBall.x - (brick.x + brick.width / 2));
    const overlapY = currentBall.radius + brick.height / 2 -
      Math.abs(currentBall.y - (brick.y + brick.height / 2));
    if (overlapX < overlapY) {
      currentBall.dx = currentBall.x < brick.x + brick.width / 2
        ? -Math.abs(currentBall.dx)
        : Math.abs(currentBall.dx);
      currentBall.x = currentBall.x < brick.x + brick.width / 2
        ? brick.x - currentBall.radius - 0.5
        : brick.x + brick.width + currentBall.radius + 0.5;
    } else {
      currentBall.dy = currentBall.y < brick.y + brick.height / 2
        ? -Math.abs(currentBall.dy)
        : Math.abs(currentBall.dy);
      currentBall.y = currentBall.y < brick.y + brick.height / 2
        ? brick.y - currentBall.radius - 0.5
        : brick.y + brick.height + currentBall.radius + 0.5;
    }
  }

  if (brick.hits > 1) {
    brick.hits -= 1;
    playSound("wall");
    return false;
  }

  brick.active = false;
  score += 10;
  createParticles(brick);
  spawnPowerUp(brick);
  playSound("break");
  return true;
}

function handlePaddleCollision(currentBall) {
  const normal = collideCircleWithPaddleShield(
    currentBall.x,
    currentBall.y,
    currentBall.radius
  );
  if (!normal || currentBall.dx * normal.x + currentBall.dy * normal.y >= 0) {
    return;
  }

  const speed = getCurrentBallSpeed(currentBall);
  const centerX = paddle.x + paddle.width / 2;
  const hitPosition = Math.max(-1, Math.min(1, (currentBall.x - centerX) / (paddle.width / 2)));
  const angle = hitPosition * CONFIG.maxBounceAngle;
  currentBall.dx = Math.sin(angle) * speed;
  currentBall.dy = -Math.cos(angle) * speed;
  currentBall.x += normal.x * (CONFIG.paddleShieldThickness / 2 + 0.5);
  currentBall.y += normal.y * (CONFIG.paddleShieldThickness / 2 + 0.5);
  playSound("bounce");
}

function updateBall(currentBall, deltaTime) {
  const distance = getCurrentBallSpeed(currentBall) * deltaTime * 60;
  const steps = Math.max(1, Math.ceil(distance / (currentBall.radius * 0.45)));
  const stepX = currentBall.dx * deltaTime * 60 / steps;
  const stepY = currentBall.dy * deltaTime * 60 / steps;

  for (let step = 0; step < steps; step += 1) {
    const previousX = currentBall.x;
    const previousY = currentBall.y;
    currentBall.x += stepX;
    currentBall.y += stepY;

    if (currentBall.x - currentBall.radius <= 0) {
      currentBall.x = currentBall.radius;
      currentBall.dx = Math.abs(currentBall.dx);
      playSound("wall");
    } else if (currentBall.x + currentBall.radius >= CONFIG.canvasWidth) {
      currentBall.x = CONFIG.canvasWidth - currentBall.radius;
      currentBall.dx = -Math.abs(currentBall.dx);
      playSound("wall");
    }
    if (currentBall.y - currentBall.radius <= 0) {
      currentBall.y = currentBall.radius;
      currentBall.dy = Math.abs(currentBall.dy);
      playSound("wall");
    }

    let hitBrick = false;
    for (const brick of bricks) {
      if (brick.active && collideCircleWithRect(brick, currentBall)) {
        resolveBrickCollision(brick, previousX, previousY, currentBall);
        hitBrick = true;
        break;
      }
    }
    if (hitBrick) {
      if (bricks.every((brick) => !brick.active)) {
        state = "victory";
      }
      return false;
    }

    handlePaddleCollision(currentBall);
    if (currentBall.y - currentBall.radius > CONFIG.canvasHeight) {
      return true;
    }
  }
  return false;
}

function updatePowerUps(deltaTime) {
  for (let index = powerUps.length - 1; index >= 0; index -= 1) {
    const powerUp = powerUps[index];
    powerUp.y += CONFIG.powerUpSpeed * deltaTime * 60;
    if (collideCircleWithPaddleShield(powerUp.x, powerUp.y, powerUp.radius)) {
      activatePowerUp(powerUp.type);
      powerUps.splice(index, 1);
    } else if (powerUp.y - powerUp.radius > CONFIG.canvasHeight) {
      powerUps.splice(index, 1);
    }
  }
}

function updateParticles(deltaTime) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx * deltaTime * 60;
    particle.y += particle.vy * deltaTime * 60;
    particle.alpha -= deltaTime * 2;
    if (particle.alpha <= 0) {
      particles.splice(index, 1);
    }
  }
}

function loseLife() {
  lives -= 1;
  playSound("die");
  if (boss.active) {
    bossMeteors.length = 0;
    bossMeteorElapsed = 0;
  }
  if (lives <= 0) {
    state = "gameover";
    return;
  }
  resetBall();
}

function updateBossMeteors(deltaTime) {
  bossMeteorElapsed += deltaTime;
  if (bossMeteorElapsed >= CONFIG.bossMeteorInterval) {
    bossMeteorElapsed -= CONFIG.bossMeteorInterval;
    const startX = boss.x + 15 + Math.random() * (boss.width - 30);
    const targetX = paddle.x + paddle.width / 2;
    bossMeteors.push({
      x: startX,
      y: boss.y + boss.height + 8,
      dx: Math.max(-1.2, Math.min(1.2, (targetX - startX) * 0.006)),
      dy: 2.6 + Math.random() * 0.5,
      radius: 8
    });
  }

  for (let index = bossMeteors.length - 1; index >= 0; index -= 1) {
    const meteor = bossMeteors[index];
    meteor.x += meteor.dx * deltaTime * 60;
    meteor.y += meteor.dy * deltaTime * 60;

    if (collideCircleWithPaddleShield(meteor.x, meteor.y, meteor.radius)) {
      bossMeteors.splice(index, 1);
      loseLife();
      return;
    }
    if (meteor.y - meteor.radius > CONFIG.canvasHeight) {
      bossMeteors.splice(index, 1);
    }
  }
}

function update(deltaTime, now) {
  updateEffects(now);
  updateParticles(deltaTime);
  updateBossExplosion(deltaTime);
  if (state === "boss") {
    updateBoss(deltaTime);
    return;
  }
  if (state !== "playing") {
    return;
  }

  levelElapsed += deltaTime;
  for (const currentBall of balls) {
    setBallSpeed(getBallSpeed(now), currentBall);
  }
  movePaddle(deltaTime);
  for (let index = balls.length - 1; index >= 0 && state === "playing"; index -= 1) {
    if (updateBall(balls[index], deltaTime)) {
      balls.splice(index, 1);
    }
  }
  if (state === "playing" && balls.length === 0) {
    loseLife();
  }
  updatePowerUps(deltaTime);
}

function nextLevel() {
  level += 1;
  levelElapsed = 0;
  powerUps.length = 0;
  createBricks();
  resetBall();
  if (level >= 5) {
    state = "boss";
    initBoss();
  } else {
    state = "transition";
  }
}

function updateBoss(deltaTime) {
  boss.x += boss.dx * deltaTime * 60;
  if (boss.x <= 0) {
    boss.x = 0;
    boss.dx = Math.abs(boss.dx);
  } else if (boss.x + boss.width >= CONFIG.canvasWidth) {
    boss.x = CONFIG.canvasWidth - boss.width;
    boss.dx = -Math.abs(boss.dx);
  }

  levelElapsed += deltaTime;
  for (const currentBall of balls) {
    setBallSpeed(getBallSpeed(), currentBall);
  }
  movePaddle(deltaTime);

  for (let index = balls.length - 1; index >= 0 && state === "boss"; index -= 1) {
    const currentBall = balls[index];
    if (updateBall(currentBall, deltaTime)) {
      balls.splice(index, 1);
      continue;
    }

    if (!boss.active || !collideCircleWithRect(boss, currentBall)) {
      continue;
    }

    boss.hp -= 1;
    playSound("break");
    if (currentBall.dy < 0) {
      currentBall.dy = Math.abs(currentBall.dy);
      currentBall.y = boss.y + boss.height + currentBall.radius + 0.5;
    } else {
      currentBall.dy = -Math.abs(currentBall.dy);
      currentBall.y = boss.y - currentBall.radius - 0.5;
    }

    if (boss.hp > 0 && boss.hp % 5 === 0) {
      const direction = Math.sign(boss.dx) || 1;
      boss.dx = direction * Math.min(Math.abs(boss.dx) + 1, 10);
    }
    if (boss.hp <= 0) {
      boss.active = false;
      state = "bossVictory";
      startBossExplosion();
    }
  }

  if (state === "boss" && balls.length === 0) {
    loseLife();
  }
  if (state === "boss") {
    updateBossMeteors(deltaTime);
  }
  if (state === "boss") {
    updatePowerUps(deltaTime);
  }
}

function gameLoop(timestamp) {
  const deltaTime = lastFrameTime
    ? Math.min((timestamp - lastFrameTime) / 1000, CONFIG.maxFrameDelta)
    : 0;
  lastFrameTime = timestamp;
  update(deltaTime, timestamp);
  updateMusicPlayback();
  drawFrame();
  window.requestAnimationFrame(gameLoop);
}

function initializeInput() {
  input = createInput({
    canvas,
    returnToMenuButton,
    getState: () => ({ state, pausedFromState }),
    config: CONFIG,
    actions: {
      startAudio,
      startAtLevel,
      startGame: () => {
        levelElapsed = 0;
        state = "playing";
      },
      nextLevel,
      continueTransition: () => {
        state = "playing";
      },
      resetGame,
      resetToIntro: () => {
        resetGame();
        state = "intro";
      },
      pause: (previousState) => {
        pausedFromState = previousState;
        state = "paused";
      },
      resume: (previousState) => {
        state = previousState;
      }
    }
  });
}

export function initializeGame() {
  initializeInput();
  createBricks();
  state = "intro";
  canvas.focus();
  window.requestAnimationFrame(gameLoop);
}
