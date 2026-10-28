"use strict";

const CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  paddleWidth: 100,
  paddleHeight: 50,
  paddleSpeed: 6,
  paddleBottomOffset: 38,
  ballRadius: 8,
  ballSpeed: 4.5,
  levelSpeedIncrease: 0.2,
  maxBounceAngle: Math.PI / 3,
  brickColumns: 10,
  brickRows: 5,
  brickWidth: 70,
  brickHeight: 25,
  brickGap: 5,
  brickTop: 82,
  startingLives: 3,
  powerUpChance: 0.2,
  powerUpSpeed: 2,
  particleCount: 8,
  bossMeteorInterval: 3.2,
  maxFrameDelta: 0.05,
  speedIncreaseInterval: 10,
  speedIncreasePerInterval: 0.1,
  maxSpeedMultiplierPerLevel: 2,
  paddleShieldThickness: 10,
  colors: ["#ff5c7a", "#ffad4d", "#ffe66d", "#53e0a1", "#55c7ff"],
  powerUpColors: {
    wide: "#53e0a1",
    multi: "#b28cff"
  }
};
const ASTEROID_SPRITES = [
  ["..######..", ".########.", "###h####d#", ".########."],
  ["...#####..", ".#########", "##d####h##", ".########."],
  ["..#######.", ".####h####", "########d#", "..#######."],
  ["...######.", ".#########", "##h####d##", ".########."],
  ["..#######.", ".##d######", "########h#", ".########."],
  ["...#####..", ".#########", "##h#####d#", "..#######."]
];
const BOSS_METEOR_SPRITE = [
  "..DD.",
  ".DMM.",
  "DMMMM",
  ".DMMM",
  "..DD."
];
const PLAYER_SHIP_SPRITE = [
  "...WWW...",
  "..WWWWW..",
  "..WWWWW..",
  ".WWWWWWW.",
  ".WWGWWWW.",
  "WWWWWWWWW",
  "WWWWWWWWW",
  "WW.W.W.WW"
];
const BOSS_ASTEROID_SPRITE = (() => {
  const edges = [
    [8, 13], [6, 15], [4, 17], [3, 18], [2, 19], [1, 20],
    [1, 20], [0, 21], [0, 21], [0, 21], [0, 21], [1, 20],
    [1, 20], [2, 19], [3, 18], [4, 17], [6, 15], [8, 13]
  ];
  const sprite = edges.map(([left, right]) =>
    Array.from({ length: 22 }, (_, column) => {
      if (column < left || column > right) {
        return ".";
      }
      return column === left || column === right ? "D" : "M";
    })
  );
  const addPattern = (x, y, pattern) => {
    pattern.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell !== ".") {
          sprite[y + rowIndex][x + columnIndex] = cell;
        }
      });
    });
  };

  addPattern(4, 3, ["..dd.", ".dCCc", "dCCCC", ".dCCc", "..dd."]);
  addPattern(13, 4, ["...ddd..", "..dCCCc.", ".dCCCCCc", "dCCCCCCc", ".dCCCCCc", "..dCCCc.", "...ddd.."]);
  addPattern(8, 11, ["..dd.", ".dCCc", "dCCCC", ".dCCc", "..dd."]);
  addPattern(3, 11, [".dd.", "dCCc", ".dCc", "..d."]);
  addPattern(17, 12, ["..dd.", ".dCCc", "dCCCC", ".dCCc", "..dd."]);
  addPattern(7, 2, ["HH.", ".H."]);
  addPattern(3, 7, ["h..", "hh."]);
  addPattern(10, 8, ["..hh", ".h.."]);
  addPattern(15, 14, ["hh.", ".h."]);
  return sprite.map((row) => row.join(""));
})();

const canvas = document.getElementById("game");
const context = canvas.getContext("2d");
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
const keys = new Set();
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
const LEVEL_TEXTS = {
  1: {
    title: "ONDA 1 DESTRUÍDA",
    lines: [
      "Primeira barreira neutralizada.",
      "Você se aproxima de Sentinel-7.",
      "A resistência está aumentando..."
    ]
  },
  2: {
    title: "ONDA 2 DESTRUÍDA",
    lines: [
      "Os núcleos endurecidos foram quebrados.",
      "O planeta está próximo.",
      "Os meteoros ficam mais densos."
    ]
  },
  3: {
    title: "ONDA 3 DESTRUÍDA",
    lines: [
      "Impressionante. Nenhum piloto",
      "chegou tão longe, Comandante.",
      "Sentinel-7 está na sua mira."
    ]
  },
  4: {
    title: "ONDA 4 DESTRUÍDA",
    lines: [
      "Você chegou. Sentinel-7 à vista.",
      "Algo enorme se aproxima no radar...",
      "Prepare-se para o que vem a seguir."
    ]
  }
};
const REINFORCED_ROWS_BY_LEVEL = {
  2: [0],
  3: [0, 1],
  4: [0, 1, 3]
};
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

let score = 0;
let lives = CONFIG.startingLives;
let level = 1;
let state = "start";
let lastFrameTime = 0;
let audioContext = null;
let pointerX = null;
let paddleWidthBeforePowerUp = CONFIG.paddleWidth;
let levelElapsed = 0;
let pausedFromState = "playing";
let bossMeteorElapsed = 0;
let musicGain = null;
let musicSource = null;
let musicTrackGain = null;
let musicPlaying = false;
let musicTheme = null;
let musicPlaybackRate = 1;

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
  startAudio();
  if (level === 5) {
    initBoss();
    state = "boss";
  } else {
    state = "playing";
  }
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

function initBoss() {
  boss.x = (CONFIG.canvasWidth - boss.width) / 2;
  boss.y = 80;
  boss.hp = 20;
  boss.maxHp = 20;
  boss.dx = 3;
  boss.active = true;
  bossMeteors.length = 0;
  bossMeteorElapsed = 0;
  bricks.length = 0;
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

function startAudio() {
  if (!audioContext) {
    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;
    if (AudioContextConstructor) {
      audioContext = new AudioContextConstructor();
    }
  }
  if (audioContext?.state === "suspended") {
    audioContext.resume();
  }
  if (audioContext && !musicSource) {
    startSpaceMusic();
  }
}

function startSpaceMusic() {
  const sampleRate = audioContext.sampleRate;
  const isBossTheme = level >= 5;
  const duration = 8;
  const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
  const samples = buffer.getChannelData(0);
  const melody = isBossTheme
    ? [220, 233.08, 311.13, 277.18, 415.3, 311.13, 233.08, 207.65, 220, 349.23, 311.13, 466.16, 415.3, 311.13, 277.18, 207.65]
    : [220, 329.63, 392, 329.63, 261.63, 392, 440, 392, 196, 293.66, 349.23, 293.66, 220, 329.63, 392, 329.63];
  const bassNotes = isBossTheme
    ? [55, 55, 65.41, 55, 73.42, 65.41, 55, 49]
    : [55, 82.41, 65.41, 98];
  const chords = isBossTheme
    ? [[110, 164.81, 207.65], [103.83, 155.56, 196], [98, 146.83, 185], [110, 164.81, 207.65]]
    : [[110, 164.81, 220], [130.81, 196, 261.63], [146.83, 220, 293.66], [98, 146.83, 196]];
  const beatDuration = isBossTheme ? 0.3 : 0.48;
  const stepDuration = beatDuration / 2;

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / sampleRate;
    const beat = Math.floor(time / beatDuration);
    const beatTime = time - beat * beatDuration;
    const chord = chords[Math.floor(time / (beatDuration * 8)) % chords.length];
    let sample = 0;

    for (let voice = 0; voice < chord.length; voice += 1) {
      const modulation = 0.75 + 0.25 * Math.sin(time * (isBossTheme ? 2.2 : 0.8) + voice * 1.8);
      sample += Math.sin(2 * Math.PI * chord[voice] * time) * (isBossTheme ? 0.025 : 0.03) * modulation;
    }

    const step = Math.floor(time / stepDuration);
    const noteTime = time - step * stepDuration;
    const note = melody[step % melody.length];
    const noteEnvelope = Math.exp(-noteTime * (isBossTheme ? 5.5 : 4));
    sample += Math.sin(2 * Math.PI * note * noteTime) * (isBossTheme ? 0.12 : 0.11) * noteEnvelope;
    sample += Math.sin(2 * Math.PI * note * 2.01 * noteTime) * 0.025 * noteEnvelope;

    const bass = bassNotes[Math.floor(beat / 2) % bassNotes.length];
    const kickEnvelope = Math.exp(-beatTime * (isBossTheme ? 15 : 12));
    const kickFrequency = (isBossTheme ? 90 : 72) - 30 * Math.min(beatTime / 0.12, 1);
    sample += Math.sin(2 * Math.PI * kickFrequency * beatTime) * (isBossTheme ? 0.22 : 0.16) * kickEnvelope;
    sample += Math.sin(2 * Math.PI * bass * time) * (isBossTheme ? 0.07 : 0.055);

    if (beat % 2 === 1) {
      const tickEnvelope = Math.exp(-beatTime * 45);
      const tick = Math.sin(2 * Math.PI * (isBossTheme ? 1450 : 1100) * beatTime);
      sample += tick * (isBossTheme ? 0.055 : 0.035) * tickEnvelope;
    }

    samples[index] = Math.max(-0.8, Math.min(0.8, sample));
  }

  if (!musicGain) {
    musicGain = audioContext.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(audioContext.destination);
  }

  const previousSource = musicSource;
  const previousTrackGain = musicTrackGain;
  musicSource = audioContext.createBufferSource();
  musicSource.buffer = buffer;
  musicSource.loop = true;
  musicSource.playbackRate.value = musicPlaybackRate;
  musicTrackGain = audioContext.createGain();
  musicTrackGain.gain.value = 0;
  musicSource.connect(musicTrackGain);
  musicTrackGain.connect(musicGain);
  musicSource.start();
  musicTheme = isBossTheme ? "boss" : "space";

  const now = audioContext.currentTime;
  musicTrackGain.gain.setTargetAtTime(musicPlaying ? 1 : 0, now, 0.15);
  if (previousSource && previousTrackGain) {
    previousTrackGain.gain.setTargetAtTime(0, now, 0.1);
    previousSource.stop(now + 0.6);
  }
}

function updateMusicPlayback() {
  if (!audioContext || !musicGain || audioContext.state !== "running") {
    return;
  }

  const shouldPlay = state === "playing" || state === "boss" || state === "transition";
  const desiredTheme = level >= 5 ? "boss" : "space";
  if (desiredTheme !== musicTheme) {
    startSpaceMusic();
  }

  const now = audioContext.currentTime;
  const targetPlaybackRate = Math.min(2.4, Math.sqrt(getBallSpeed() / CONFIG.ballSpeed));
  if (Math.abs(targetPlaybackRate - musicPlaybackRate) >= 0.02) {
    musicPlaybackRate = targetPlaybackRate;
    musicSource.playbackRate.setTargetAtTime(musicPlaybackRate, now, 0.4);
  }

  if (shouldPlay !== musicPlaying) {
    musicPlaying = shouldPlay;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(shouldPlay ? 0.22 : 0, now + 0.6);
    musicTrackGain.gain.setTargetAtTime(shouldPlay ? 1 : 0, now, 0.15);
  }
}

function playSound(type) {
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const sounds = {
    bounce: { frequency: 420, endFrequency: 260, duration: 0.09, volume: 0.12 },
    break: { frequency: 680, endFrequency: 380, duration: 0.12, volume: 0.1 },
    wall: { frequency: 300, endFrequency: 210, duration: 0.055, volume: 0.07 },
    die: { frequency: 260, endFrequency: 90, duration: 0.38, volume: 0.14 }
  };
  const sound = sounds[type];
  if (!sound) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(sound.frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(sound.endFrequency, now + sound.duration);
  gain.gain.setValueAtTime(sound.volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + sound.duration);
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
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

function draw() {
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
}

function movePaddle(deltaTime) {
  if (pointerX !== null) {
    paddle.x = pointerX - paddle.width / 2;
  } else {
    if (keys.has("ArrowLeft")) {
      paddle.x -= paddle.speed * deltaTime * 60;
    }
    if (keys.has("ArrowRight")) {
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
  draw();
  window.requestAnimationFrame(gameLoop);
}

function canvasPosition(event) {
  const bounds = canvas.getBoundingClientRect();
  return (event.clientX - bounds.left) * (CONFIG.canvasWidth / bounds.width);
}

canvas.addEventListener("pointerdown", () => canvas.focus());
canvas.addEventListener("pointermove", (event) => {
  pointerX = canvasPosition(event);
});
canvas.addEventListener("pointerleave", () => {
  pointerX = null;
});
returnToMenuButton.addEventListener("click", () => {
  resetGame();
  canvas.focus();
});

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }

  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    keys.add(event.key);
    pointerX = null;
  }
  if (event.repeat) {
    return;
  }

  if (["2", "3", "4", "5"].includes(event.key) && (state === "start" || state === "intro")) {
    startAtLevel(Number(event.key));
  } else if (event.key === " " && (state === "start" || state === "intro")) {
    startAudio();
    levelElapsed = 0;
    state = "playing";
  } else if (event.key === " " && state === "victory") {
    startAudio();
    nextLevel();
  } else if (event.key === " " && state === "transition") {
    startAudio();
    state = "playing";
  } else if ((event.key === "r" || event.key === "R") && state === "gameover") {
    resetGame();
  } else if ((event.key === "r" || event.key === "R") && state === "bossVictory") {
    resetGame();
    state = "intro";
  } else if ((event.key === "p" || event.key === "P") && (state === "playing" || state === "boss")) {
    pausedFromState = state;
    state = "paused";
  } else if ((event.key === "p" || event.key === "P") && state === "paused") {
    state = pausedFromState;
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});
window.addEventListener("blur", () => keys.clear());

createBricks();
state = "intro";
canvas.focus();
window.requestAnimationFrame(gameLoop);
