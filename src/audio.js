export function createAudio(getState) {
  let audioContext = null;
  let musicEnabled = false;
  let currentMusicTrack = null;
  let musicPlaying = false;
  let musicRequestId = 0;

  const musicTracks = {
    dialogue: new Audio("Audios_game/fase_1.mp3"),
    gameplay: new Audio("Audios_game/fase_2.mp3"),
    boss: new Audio("Audios_game/fase_3.mp3")
  };

  Object.values(musicTracks).forEach((track) => {
    track.loop = true;
    track.preload = "auto";
    track.volume = 0.22;
  });

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
    musicEnabled = true;
    updateMusicPlayback();
  }

  function updateMusicPlayback() {
    if (!musicEnabled) {
      return;
    }

    const state = getState();
    let desiredTrack = null;
    if (state === "intro" || state === "transition" || state === "bossVictory") {
      desiredTrack = musicTracks.dialogue;
    } else if (state === "playing" || state === "victory") {
      desiredTrack = musicTracks.gameplay;
    } else if (state === "boss") {
      desiredTrack = musicTracks.boss;
    }

    if (desiredTrack !== currentMusicTrack) {
      musicRequestId += 1;
      currentMusicTrack?.pause();
      currentMusicTrack = desiredTrack;
      musicPlaying = false;
      if (currentMusicTrack) {
        currentMusicTrack.currentTime = 0;
      }
    }

    if (currentMusicTrack && !musicPlaying) {
      musicPlaying = true;
      const track = currentMusicTrack;
      const requestId = ++musicRequestId;
      track.play().catch((error) => {
        if (requestId !== musicRequestId || track !== currentMusicTrack) {
          return;
        }
        musicPlaying = false;
        if (error.name === "NotAllowedError" || error.name === "NotSupportedError") {
          musicEnabled = false;
        }
        if (error.name === "AbortError" || error.name === "NotAllowedError") {
          return;
        }
        console.error("Não foi possível reproduzir a música do jogo.", error);
      });
    } else if (!currentMusicTrack && musicPlaying) {
      musicPlaying = false;
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

  return { startAudio, updateMusicPlayback, playSound };
}
