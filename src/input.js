export function createInput({ canvas, returnToMenuButton, getState, actions, config }) {
  const keys = new Set();
  let pointerX = null;

  function canvasPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return (event.clientX - bounds.left) * (config.canvasWidth / bounds.width);
  }

  canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    actions.startAudio();
  });
  canvas.addEventListener("pointermove", (event) => {
    pointerX = canvasPosition(event);
  });
  canvas.addEventListener("pointerleave", () => {
    pointerX = null;
  });
  returnToMenuButton.addEventListener("click", () => {
    actions.resetGame();
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

    const { state, pausedFromState } = getState();
    if (["2", "3", "4", "5"].includes(event.key) && (state === "start" || state === "intro")) {
      actions.startAtLevel(Number(event.key));
    } else if (event.key === " " && (state === "start" || state === "intro")) {
      actions.startGame();
      actions.startAudio();
    } else if (event.key === " " && state === "victory") {
      actions.nextLevel();
      actions.startAudio();
    } else if (event.key === " " && state === "transition") {
      actions.continueTransition();
      actions.startAudio();
    } else if ((event.key === "r" || event.key === "R") && state === "gameover") {
      actions.resetGame();
    } else if ((event.key === "r" || event.key === "R") && state === "bossVictory") {
      actions.resetToIntro();
    } else if ((event.key === "p" || event.key === "P") && (state === "playing" || state === "boss")) {
      actions.pause(state);
    } else if ((event.key === "p" || event.key === "P") && state === "paused") {
      actions.resume(pausedFromState);
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key);
  });
  window.addEventListener("blur", () => keys.clear());

  return {
    keys,
    getPointerX: () => pointerX
  };
}
