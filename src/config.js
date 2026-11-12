export const CONFIG = {
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

export const ASTEROID_SPRITES = [
  ["..######..", ".########.", "###h####d#", ".########."],
  ["...#####..", ".#########", "##d####h##", ".########."],
  ["..#######.", ".####h####", "########d#", "..#######."],
  ["...######.", ".#########", "##h####d##", ".########."],
  ["..#######.", ".##d######", "########h#", ".########."],
  ["...#####..", ".#########", "##h#####d#", "..#######."]
];

export const BOSS_METEOR_SPRITE = [
  "..DD.",
  ".DMM.",
  "DMMMM",
  ".DMMM",
  "..DD."
];

export const PLAYER_SHIP_SPRITE = [
  "...WWW...",
  "..WWWWW..",
  "..WWWWW..",
  ".WWWWWWW.",
  ".WWGWWWW.",
  "WWWWWWWWW",
  "WWWWWWWWW",
  "WW.W.W.WW"
];

export const BOSS_ASTEROID_SPRITE = (() => {
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

export const LEVEL_TEXTS = {
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

export const REINFORCED_ROWS_BY_LEVEL = {
  2: [0],
  3: [0, 1],
  4: [0, 1, 3]
};

export const BOSS_VICTORY_DELAY_MS = 1900;
