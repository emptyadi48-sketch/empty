/**
 * Infinity Flyer - Game Engine & Logic
 */

// ==========================================
// 1. SAVE MODULE (localStorage)
// ==========================================
const Save = (() => {
  const SAVE_KEY = "infinity_flyer_save_data";

  const defaultData = {
    user: { name: "", avatar: "🐉", platform: "guest", id: "", joinedAt: 0 },
    coins: 0,
    gems: 0,
    bestScore: 0,
    maxLevel: 1,
    totalCoinsEarned: 0,
    totalPlays: 0,
    totalPipes: 0,
    totalStars: 0,
    lastDaily: 0,
    unlockedSkins: ['dragon'],
    equippedSkin: 'dragon',
    ownedPowers: { shield: 0, slow: 0, magnet: 0 },
    achievements: {},
    weeklyCoins: 0,
    soundMuted: false,
  };

  let cachedData = null;

  function load() {
    if (cachedData) return cachedData;
    try {
      const stored = localStorage.getItem(SAVE_KEY);
      if (stored) {
        cachedData = JSON.parse(stored);
        // Deep merge config to handle updates
        cachedData = { ...defaultData, ...cachedData };
        return cachedData;
      }
    } catch (e) {
      console.error("Failed to load save data", e);
    }
    cachedData = JSON.parse(JSON.stringify(defaultData));
    return cachedData;
  }

  function save(data) {
    cachedData = data;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data", e);
    }
  }

  return {
    get: load,
    set: save,
    reset: () => {
      cachedData = JSON.parse(JSON.stringify(defaultData));
      save(cachedData);
    }
  };
})();

// ==========================================
// 2. AUTH MODULE (User profiles & Login state)
// ==========================================
const Auth = (() => {
  const AVATARS = ["🐉", "🦅", "🚀", "bat", "👾", "🦚", "🦄", "🐺", "🐲", "🐱", "🐶", "🦁", "🦊", "🐼", "🐻"];
  // Translate skins name to emoji
  const SKIN_EMOJIS = {
    dragon: "🐉",
    eagle: "🦅",
    rocket: "🚀",
    bat: "🦇",
    alien: "👾",
    phoenix: "🦚",
    unicorn: "🦄",
    wolf: "🐺",
    dragon2: "🐲"
  };

  let pendingPlatform = "guest";

  function init() {
    const data = Save.get();
    if (data.user && data.user.name) {
      UI.showScreen("menu");
      UI.updateMenuProfile();
    } else {
      UI.showScreen("login");
    }
  }

  function loginRequest(platform) {
    pendingPlatform = platform;
    // Show modal
    const modal = document.getElementById("modal-avatar");
    modal.classList.remove("hidden");
    
    // Auto-generate name based on platform
    const nameInput = document.getElementById("username-input");
    const prefixes = {
      google: "G-Flyer", facebook: "F-Pilot", discord: "D-Dragon",
      telegram: "T-Storm", instagram: "I-Sky", snapchat: "S-Ghost", guest: "Pilot"
    };
    const rand = Math.floor(100 + Math.random() * 900);
    nameInput.value = `${prefixes[platform] || "User"}${rand}`;

    // Pop picker
    const container = document.getElementById("avatar-picker-grid");
    container.innerHTML = "";
    
    // Populate standard avatars
    const availEmojis = ["🐉", "🦅", "🚀", "🦇", "👾", "🦚", "🦄", "🐺", "🐲", "🐱", "🐶", "🦁", "🦊", "🐼", "🐻"];
    availEmojis.forEach((emoji, index) => {
      const div = document.createElement("div");
      div.className = "avatar-item" + (index === 0 ? " selected" : "");
      div.innerHTML = emoji;
      div.onclick = () => {
        document.querySelectorAll(".avatar-item").forEach(el => el.classList.remove("selected"));
        div.classList.add("selected");
      };
      container.appendChild(div);
    });
  }

  function confirmProfile() {
    const nameInput = document.getElementById("username-input").value.trim();
    if (!nameInput) {
      alert("Please enter a display name!");
      return;
    }

    const selectedAvatarEl = document.querySelector(".avatar-item.selected");
    const avatar = selectedAvatarEl ? selectedAvatarEl.innerHTML : "🐉";

    const data = Save.get();
    data.user = {
      name: nameInput,
      avatar: avatar,
      platform: pendingPlatform,
      id: "usr_" + Math.random().toString(36).substr(2, 9),
      joinedAt: Date.now()
    };
    
    // Unlock starting skin
    if (!data.unlockedSkins.includes("dragon")) {
      data.unlockedSkins.push("dragon");
    }

    Save.set(data);

    // Hide modal
    document.getElementById("modal-avatar").classList.add("hidden");
    
    // Audio trigger
    Audio.play("click");
    
    // Go to Menu
    UI.showScreen("menu");
    UI.updateMenuProfile();
  }

  function logout() {
    const data = Save.get();
    data.user = { name: "", avatar: "🐉", platform: "guest", id: "", joinedAt: 0 };
    Save.set(data);
    Audio.play("click");
    UI.showScreen("login");
  }

  return {
    init,
    loginRequest,
    confirmProfile,
    logout,
    SKIN_EMOJIS
  };
})();

// ==========================================
// 3. LEADERBOARD MODULE (Simulated Global Competition)
// ==========================================
const Leaderboard = (() => {
  let activeTab = "global";

  // Pre-seeded players
  const baseSeeded = [
    { name: "DragonKing99", coins: 18540, avatar: "🐲", platform: "discord" },
    { name: "StarFlyer", coins: 14320, avatar: "🚀", platform: "google" },
    { name: "SpeedDemon", coins: 11900, avatar: "⚡", platform: "telegram" },
    { name: "NightHawk", coins: 9870, avatar: "🦅", platform: "facebook" },
    { name: "PhoenixRise", coins: 8200, avatar: "🦚", platform: "instagram" },
    { name: "CelestialFox", coins: 6940, avatar: "🦊", platform: "discord" },
    { name: "AstroRocket", coins: 5780, avatar: "🚀", platform: "google" },
    { name: "TigerClaw", coins: 4950, avatar: "🐯", platform: "snapchat" },
    { name: "UnicornFlap", coins: 4120, avatar: "🦄", platform: "google" },
    { name: "DolphinDash", coins: 3480, avatar: "🐬", platform: "facebook" },
    { name: "LionHeart", coins: 2850, avatar: "🦁", platform: "telegram" },
    { name: "GalaxyWolf", coins: 2200, avatar: "🐺", platform: "discord" },
    { name: "ButterflyX", coins: 1680, avatar: "🦋", platform: "instagram" },
    { name: "AlienPilot", coins: 1240, avatar: "👾", platform: "guest" },
    { name: "FrogKnight", coins: 880, avatar: "🐸", platform: "snapchat" },
    { name: "DragonLearner", coins: 560, avatar: "🐉", platform: "discord" },
    { name: "NewFlyer22", coins: 320, avatar: "🐥", platform: "google" },
    { name: "WingBuddy", coins: 140, avatar: "🦇", platform: "guest" },
    { name: "GuestPilot", coins: 80, avatar: "👤", platform: "guest" },
    { name: "JustStarted", coins: 20, avatar: "🥚", platform: "guest" }
  ];

  function getSortedList() {
    const data = Save.get();
    const list = [...baseSeeded];
    
    // Add player to the list if named
    if (data.user && data.user.name) {
      list.push({
        name: data.user.name,
        coins: data.totalCoinsEarned,
        avatar: data.user.avatar,
        platform: data.user.platform,
        isPlayer: true
      });
    }

    // Sort descending by earned coins
    list.sort((a, b) => b.coins - a.coins);
    return list;
  }

  function getPlayerRank() {
    const list = getSortedList();
    const data = Save.get();
    if (!data.user || !data.user.name) return "#21";
    const index = list.findIndex(p => p.isPlayer);
    return index !== -1 ? `#${index + 1}` : "#21";
  }

  function selectTab(tab) {
    activeTab = tab;
    // Highlight tabs
    const buttons = document.querySelectorAll("#screen-leaderboard .tab-button");
    buttons.forEach((btn, idx) => {
      if ((tab === 'global' && idx === 0) || (tab === 'weekly' && idx === 1) || (tab === 'nearby' && idx === 2)) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    render();
  }

  function render() {
    const list = getSortedList();
    const container = document.getElementById("leaderboard-list");
    container.innerHTML = "";

    // Vary scores slightly for weekly/nearby tabs to simulate variety
    const listToRender = list.map((item, idx) => {
      let coins = item.coins;
      if (activeTab === "weekly") {
        coins = Math.floor(item.coins * 0.4);
      } else if (activeTab === "nearby") {
        // nearby is centered around the player's rank + / - 5
        coins = item.coins;
      }
      return { ...item, coins };
    });

    if (activeTab === "weekly") {
      listToRender.sort((a,b) => b.coins - a.coins);
    }

    listToRender.forEach((item, index) => {
      const tr = document.createElement("tr");
      if (item.isPlayer) {
        tr.className = "highlight";
      }

      const rankStr = index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`;
      
      tr.innerHTML = `
        <td style="font-weight: 700; text-align: center;">${rankStr}</td>
        <td>
          <div class="leaderboard-player-cell">
            <span class="leaderboard-emoji">${item.avatar}</span>
            <span>${item.name}</span>
            <span class="leaderboard-platform-tag">${item.platform}</span>
          </div>
        </td>
        <td style="text-align:right; font-family: 'Fredoka', sans-serif;">🪙 ${item.coins.toLocaleString()}</td>
      `;
      container.appendChild(tr);
    });
  }

  return {
    selectTab,
    render,
    getPlayerRank
  };
})();

// ==========================================
// 4. AUDIO MODULE (Procedural synthesis)
// ==========================================
const Audio = (() => {
  let ctx = null;
  let bgmGainNode = null;
  let isMuted = false;
  let bgmActive = false;
  let bgmTimeoutId = null;

  function init() {
    const data = Save.get();
    isMuted = data.soundMuted;
    
    // Web Audio requires user interaction to starts
    window.addEventListener('click', ensureContext, { once: true });
    window.addEventListener('touchstart', ensureContext, { once: true });
    window.addEventListener('keydown', ensureContext, { once: true });

    // Handle visibility changes to pause/resume AudioContext automatically to prevent background sound
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (ctx && ctx.state === 'running') {
          ctx.suspend().catch(e => console.warn(e));
        }
      } else {
        if (ctx && ctx.state === 'suspended' && !isMuted) {
          ctx.resume().catch(e => console.warn(e));
        }
      }
    });
  }

  function ensureContext() {
    if (!ctx) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContextClass();
        if (!isMuted) {
          startBGM();
        }
      } catch (e) {
        console.error("Web Audio API not supported", e);
      }
    }
  }

  function startBGM() {
    if (!ctx || isMuted || bgmActive) return;
    bgmActive = true;
    
    if (bgmTimeoutId) {
      clearTimeout(bgmTimeoutId);
      bgmTimeoutId = null;
    }

    try {
      // Gentle Pentatonic Ambient Loop
      bgmGainNode = ctx.createGain();
      bgmGainNode.gain.setValueAtTime(0.015, ctx.currentTime); // VERY subtle 1.5% - 3.5%
      bgmGainNode.connect(ctx.destination);

      // Create sequence of notes (simple synth arpeggio)
      const pentatonic = [196, 220, 261, 293, 329, 392, 440, 523]; // G3 to C5
      let noteIndex = 0;

      function playBgmNote() {
        if (!bgmGainNode || isMuted || !bgmActive) {
          bgmActive = false;
          return;
        }

        try {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          
          osc.type = "sine";
          // Simple ambient progression melody
          noteIndex = (noteIndex + Math.floor(Math.random() * 3) + 1) % pentatonic.length;
          osc.frequency.setValueAtTime(pentatonic[noteIndex], ctx.currentTime);
          
          noteGain.gain.setValueAtTime(0.0, ctx.currentTime);
          noteGain.gain.linearRampToValueAtTime(0.015, ctx.currentTime + 0.5);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 4.0);
          
          osc.connect(noteGain);
          noteGain.connect(bgmGainNode);
          
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 4.1);
        } catch (e) {
          console.warn("Bgm note node creation error", e);
        }
        
        // Loop note schedule
        bgmTimeoutId = setTimeout(playBgmNote, 2000);
      }

      playBgmNote();
    } catch (e) {
      console.warn("BGM initialization failed", e);
    }
  }

  function stopBGM() {
    bgmActive = false;
    if (bgmTimeoutId) {
      clearTimeout(bgmTimeoutId);
      bgmTimeoutId = null;
    }
    if (bgmGainNode) {
      try {
        bgmGainNode.disconnect();
      } catch (e) {
        // Safe disconnect
      }
      bgmGainNode = null;
    }
  }

  function toggleMute() {
    ensureContext();
    isMuted = !isMuted;
    
    const data = Save.get();
    data.soundMuted = isMuted;
    Save.set(data);

    const btn = document.getElementById("mute-icon");
    const txt = document.getElementById("btn-mute");
    if (isMuted) {
      btn.innerText = "🔇";
      txt.innerHTML = `<span class="icon-sub" id="mute-icon">🔇</span> Music Off`;
      stopBGM();
    } else {
      btn.innerText = "🔊";
      txt.innerHTML = `<span class="icon-sub" id="mute-icon">🔊</span> Music On`;
      startBGM();
    }
  }

  function play(type) {
    ensureContext();
    if (isMuted || !ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    try {
      const t = ctx.currentTime;
      switch (type) {
        case "flap": {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(280, t);
          osc1.frequency.exponentialRampToValueAtTime(180, t + 0.15);
          
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(140, t);
          osc2.frequency.exponentialRampToValueAtTime(90, t + 0.15);

          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.16);
          osc2.stop(t + 0.16);
          break;
        }
        case "score": {
          const notes = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + idx * 0.08);
            
            gain.gain.setValueAtTime(0.0, t + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.05, t + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.18);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(t + idx * 0.08);
            osc.stop(t + idx * 0.08 + 0.2);
          });
          break;
        }
        case "star": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = "triangle";
          osc.frequency.setValueAtTime(880, t);
          osc.frequency.linearRampToValueAtTime(1320, t + 0.12);
          
          gain.gain.setValueAtTime(0.07, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(t);
          osc.stop(t + 0.26);
          break;
        }
        case "levelup": {
          // Rising fanfare + held note
          const melody = [523, 587, 659, 698, 784, 880, 988, 1047];
          melody.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, t + idx * 0.07);
            
            gain.gain.setValueAtTime(0.0, t + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.05, t + idx * 0.07 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + idx * 0.07);
            osc.stop(t + idx * 0.07 + 0.25);
          });
          break;
        }
        case "die": {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc1.type = "sawtooth";
          osc1.frequency.setValueAtTime(250, t);
          osc1.frequency.exponentialRampToValueAtTime(60, t + 0.5);
          
          osc2.type = "square";
          osc2.frequency.setValueAtTime(120, t);
          osc2.frequency.exponentialRampToValueAtTime(30, t + 0.5);

          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          
          osc1.start(t);
          osc2.start(t);
          osc1.stop(t + 0.65);
          osc2.stop(t + 0.65);
          break;
        }
        case "combo": {
          const notes = [261.63, 329.63, 392.00, 523.25];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + idx * 0.05);
            gain.gain.setValueAtTime(0.05, t + idx * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + idx * 0.05);
            osc.stop(t + idx * 0.05 + 0.2);
          });
          break;
        }
        case "shield": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(300, t);
          osc.frequency.linearRampToValueAtTime(800, t + 0.2);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.31);
          break;
        }
        case "coin": {
          const notes = [880, 1046, 1318];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + idx * 0.06);
            gain.gain.setValueAtTime(0.04, t + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + idx * 0.06);
            osc.stop(t + idx * 0.06 + 0.15);
          });
          break;
        }
        case "click": {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, t);
          osc.frequency.setValueAtTime(400, t + 0.03);
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.09);
          break;
        }
        case "daily": {
          const melody = [523, 587, 659, 784, 880, 1047]; // pentatonic run
          melody.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + idx * 0.12);
            gain.gain.setValueAtTime(0.06, t + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t + idx * 0.12);
            osc.stop(t + idx * 0.12 + 0.4);
          });
          break;
        }
      }
    } catch (e) {
      console.warn("Sound play error", e);
    }
  }

  return {
    init,
    toggleMute,
    play
  };
})();

// ==========================================
// 5. GAME ENGINE MODULE (Canvas, Physics, Loops)
// ==========================================
const Game = (() => {
  let canvas = null;
  let ctx = null;
  let dpr = 1;
  let animId = null;
  let activeCountTimer = null;

  // Sizes class helper to calculate relative layouts
  let width = 360;
  let height = 640;

  // Game States: idle, ready, playing, paused, levelup, dead, gameover
  let state = "idle"; 

  // Player Physics
  let player = {
    x: 80,
    y: 300,
    velocity: 0,
    radius: 20,
    visualWidth: 42,
    angle: 0,
    pulse: 0
  };

  // Particles
  let particles = [];
  // Trail dots
  let trail = [];

  // Pillars / Columns
  let pillars = [];
  let pipesPassed = 0;
  let totalLevelPipesNeeded = 10;
  let scoreOfCurrentRun = 0;
  let coinsOfCurrentRun = 0;
  let comboOfCurrentRun = 0;
  let comboResetTimer = 0; // 100 frames timer
  let distanceScrolledSinceLastPipe = 0;

  // Powerups active during current run
  let runPowers = {
    shield: false,
    slow: 0, // frame duration
    magnet: 0 // frame duration
  };

  // Asteroids (Lvl 9+)
  let asteroids = [];
  let asteroidSpawnTimer = 0;

  // Wind state (Lvl 6+)
  let wind = {
    force: 0,
    timer: 0,
    direction: 1 // 1=right, -1=left
  };

  // Developer Modes (Cheats)
  let isGodMode = false;
  let isAutoplay = false;

  // Level Constants Formula Map
  let level = 1;
  let physics = {
    gapSize: 240,
    pipeSpeed: 1.2,
    gravity: 0.32,
    jumpForce: -8.5,
    pipeDistanceApart: 380
  };

  function _engineInit() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    
    _resizeCanvas();
    window.addEventListener("resize", _resizeCanvas);

    // Event listeners for flap
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        triggerFlap();
      }
    });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      triggerFlap();
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
      e.preventDefault();
      triggerFlap();
    });

    document.getElementById("btn-play").addEventListener("click", () => {
      startRun();
    });

    document.getElementById("btn-retry").addEventListener("click", () => {
      startRun();
    });
  }

  function _resizeCanvas() {
    const container = document.getElementById("app-container");
    width = container.clientWidth;
    height = container.clientHeight;

    dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  // Calculate Level specs based on required progression formulas
  function calculateLevelSpecs(lvl) {
    // Level 1 starts at a crisp and exciting 3.1 speed, scaling extremely smoothly up to Level 1,000.
    // This provides a professional arcade runner pace that gets progressively more challenging very gradually.
    const gapSize = Math.max(110, 225 - (lvl - 1) * 0.115);
    const pipeSpeed = Math.min(6.5, 3.1 + (lvl - 1) * 0.0035);
    const gravity = Math.min(0.50, 0.38 + (lvl - 1) * 0.00012);
    const jumpForce = Math.max(-10.8, -9.2 - (lvl - 1) * 0.00016);
    const pipeDistanceApart = Math.max(240, 340 - (lvl - 1) * 0.1);
    const pipesNeeded = Math.min(25, 6 + Math.floor((lvl - 1) * 0.02));

    // Increase asteroid frequency exponentially alongside pipe speed starting from level 20
    let asteroidFrequency = 1.0;
    if (lvl >= 20) {
      const pipeSpeedRatio = pipeSpeed / 3.1665;
      const exponentialMultiplier = Math.pow(1.025, lvl - 20);
      // Cap at 15.0 so that the engine doesn't stutter and is playable, but extremely intense.
      asteroidFrequency = Math.min(15.0, pipeSpeedRatio * exponentialMultiplier);
    }

    return { gapSize, pipeSpeed, gravity, jumpForce, pipeDistanceApart, pipesNeeded, asteroidFrequency };
  }

  function startRun() {
    Audio.play("click");
    const data = Save.get();
    // Continue from player's highest unlocked level, capped at 1000
    level = Math.min(1000, data.maxLevel || 1);
    scoreOfCurrentRun = 0;
    coinsOfCurrentRun = 0;
    comboOfCurrentRun = 0;
    comboResetTimer = 0;
    pipesPassed = 0;

    runPowers = {
      shield: data.ownedPowers.shield > 0,
      slow: 0,
      magnet: 0
    };

    // Deduct one shield from stock if equipped
    if (runPowers.shield) {
      data.ownedPowers.shield--;
      Save.set(data);
    }

    _loadLevel(level);
  }

  function _loadLevel(lvl) {
    level = lvl;
    const specs = calculateLevelSpecs(level);
    physics = specs;
    totalLevelPipesNeeded = specs.pipesNeeded;
    pipesPassed = 0;

    // Reset layout
    player.y = height * 0.45;
    player.velocity = 0;
    player.angle = 0;
    
    pillars = [];
    asteroids = [];
    particles = [];
    trail = [];
    distanceScrolledSinceLastPipe = specs.pipeDistanceApart; // trigger immediate spawn
    
    // Wind Reset
    wind.force = 0;
    wind.timer = 0;

    // Set countdown State
    state = "ready";
    UI.showScreen("ready");
    UI.updateReadyScreen(level, specs);

    let count = 3;
    const readyCountdownEl = document.getElementById("ready-countdown");
    readyCountdownEl.innerText = count;
    
    if (activeCountTimer) {
      clearInterval(activeCountTimer);
    }
    
    activeCountTimer = setInterval(() => {
      count--;
      if (count <= 0) {
        if (activeCountTimer) {
          clearInterval(activeCountTimer);
          activeCountTimer = null;
        }
        // Start game playing!
        state = "playing";
        UI.showScreen("hud");
        UI.updateHUDState();
      } else {
        readyCountdownEl.innerText = count;
        readyCountdownEl.className = "ready-countdown anim";
        // play tick
        Audio.play("click");
      }
    }, 900);

    // Cancel loop if already running
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(_loop);
  }

  function triggerFlap() {
    if (state !== "playing") return;
    
    player.velocity = physics.jumpForce;
    Audio.play("flap");

    // Spawn dust particles
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: player.x,
        y: player.y + 10,
        vx: -2 - Math.random() * 3,
        vy: -1 + Math.random() * 2,
        color: "rgba(255, 107, 53, 0.8)",
        size: 3 + Math.random() * 5,
        alpha: 1,
        life: 1
      });
    }
  }

  function drawThemeBackground() {
    // Elegant theme gradients based on level theme cycles (every 5 levels)
    let grad = ctx.createLinearGradient(0, 0, 0, height);
    const themeIdx = Math.floor((level - 1) / 5) % 5;
    
    if (themeIdx === 0) {
      // Dawn: soft purple/orange sky
      grad.addColorStop(0, "#19082B");
      grad.addColorStop(0.5, "#3D123F");
      grad.addColorStop(1, "#501A31");
    } else if (themeIdx === 1) {
      // Day: dark deep space blue
      grad.addColorStop(0, "#080C1F");
      grad.addColorStop(0.5, "#141C42");
      grad.addColorStop(1, "#180A2E");
    } else if (themeIdx === 2) {
      // Night: indigo black
      grad.addColorStop(0, "#02040D");
      grad.addColorStop(0.5, "#090F21");
      grad.addColorStop(1, "#12071F");
    } else if (themeIdx === 3) {
      // Space: complete deep void with nebula accent
      grad.addColorStop(0, "#010105");
      grad.addColorStop(0.6, "#080314");
      grad.addColorStop(1, "#100010");
    } else {
      // Hell: dark red fire sky
      grad.addColorStop(0, "#1F0404");
      grad.addColorStop(0.5, "#3D0303");
      grad.addColorStop(1, "#180202");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Draw background particles like Stars, Nebulae, or lava bubbles based on cycled themes
    if (themeIdx <= 1) {
      // Soft clouds or tiny sparkles
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let i = 0; i < 15; i++) {
        let x = (Math.sin(i + Date.now() * 0.0002) * 0.5 + 0.5) * width;
        let y = (Math.cos(i) * 0.5 + 0.5) * height * 0.4;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (themeIdx <= 3) {
      // Space nebula and distant high-density stars
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      for (let i = 0; i < 30; i++) {
        let starX = (Math.cos(i * 37) * 0.5 + 0.5) * width;
        let starY = (Math.sin(i * 12) * 0.5 + 0.5) * height;
        ctx.fillRect(starX, starY, 1.2, 1.2);
      }
    } else {
      // Fire ambient sparks
      ctx.fillStyle = "rgba(255, 107, 53, 0.25)";
      for (let i = 0; i < 20; i++) {
        let sparkX = (Math.sin(i * 14 + Date.now() * 0.001) * 0.5 + 0.5) * width;
        let sparkY = (height - (Date.now() * 0.05 + i * 40) % height);
        ctx.fillRect(sparkX, sparkY, 3, 3);
      }
    }
  }

  function _spawnPillar() {
    const spaceYBoundary = 100; // minimum padding from top/bottom
    const pipeHeight = height - physics.gapSize - spaceYBoundary * 2;
    const gapTop = spaceYBoundary + Math.random() * pipeHeight;

    // Movement params for moving pipes (Level 4+)
    let isMoving = level >= 4;
    let dy = 0;
    let range = 40 + Math.min(60, (level - 4) * 0.1);
    let movingSpeed = 0.5 + Math.min(2.0, (level - 4) * 0.002);

    // Color definitions based on level theme cycles
    const themeIdx = Math.floor((level - 1) / 5) % 5;
    let colorStart = "#06ffa5"; // default green
    let colorEnd = "#029252";
    if (themeIdx === 1) {
      colorStart = "#7c3aed"; // purple
      colorEnd = "#4c058a";
    } else if (themeIdx === 2) {
      colorStart = "#0ea5e9"; // blue
      colorEnd = "#034988";
    } else if (themeIdx === 3) {
      colorStart = "#ff6b35"; // space gold/red
      colorEnd = "#9a2902";
    } else if (themeIdx === 4) {
      colorStart = "#ef4444"; // hell fire crimson
      colorEnd = "#7f1d1d";
    }

    pillars.push({
      x: width + 60,
      width: 52,
      gapTop: gapTop,
      gapHeight: physics.gapSize,
      passed: false,
      colorStart,
      colorEnd,
      
      // Motion properties
      isMoving,
      initialGapTop: gapTop,
      moveDir: Math.random() > 0.5 ? 1 : -1,
      moveRange: range,
      moveSpeed: movingSpeed,
      
      // Star token
      starCollected: false,
      hasStar: Math.random() < 0.7, // 70% star chance
      starX: width + 60 + 52 / 2,
      starY: gapTop + physics.gapSize / 2
    });
  }

  function _spawnAsteroid() {
    if (level < 9) return;
    
    // Spawns mid screen between pipes
    let r = 14 + Math.random() * 12;
    asteroids.push({
      x: width + 50,
      y: 120 + Math.random() * (height - 240),
      radius: r,
      speed: physics.pipeSpeed * (1.1 + Math.random() * 0.5),
      angle: 0,
      rotSpeed: 0.01 + Math.random() * 0.03
    });
  }

  let screenShakeIntensity = 0;

  function triggerScreenShake(amt) {
    screenShakeIntensity = amt;
  }

  function handleAutoplay() {
    if (!isAutoplay || state !== "playing") return;
    
    // Find next oncoming pillar
    let nextPillar = null;
    for (let i = 0; i < pillars.length; i++) {
      if (pillars[i].x + pillars[i].width > player.x - 15) {
        nextPillar = pillars[i];
        break;
      }
    }
    
    let targetY = height / 2;
    if (nextPillar) {
      targetY = nextPillar.gapTop + nextPillar.gapHeight / 2;
      // If the pillar is moving, anticipate its direction slightly
      if (nextPillar.isMoving) {
        targetY += nextPillar.moveDir * nextPillar.moveSpeed * 3;
      }
    }
    
    // If there is an oncoming asteroid, dodge it if possible!
    for (let ast of asteroids) {
      if (ast.x > player.x - 35 && ast.x < player.x + 100) {
        if (Math.abs(ast.y - targetY) < 65) {
          if (player.y < ast.y) {
            targetY = ast.y - 48; // adjust target upwards
          } else {
            targetY = ast.y + 48; // adjust target downwards
          }
        }
      }
    }
    
    targetY = Math.max(55, Math.min(height - 55, targetY));
    
    // Autoplay flap triggers
    const isBelow = player.y > targetY;
    const shouldJump = isBelow && (player.velocity >= 0.5 || player.y > targetY + 12);
    if (shouldJump) {
      player.velocity = physics.jumpForce;
      Audio.play("flap");
    }
  }

  function _loop() {
    if (state === "paused") return;

    // Apply Screen Shake logic
    if (screenShakeIntensity > 0.1) {
      ctx.save();
      let dx = (Math.random() - 0.5) * screenShakeIntensity;
      let dy = (Math.random() - 0.5) * screenShakeIntensity;
      ctx.translate(dx, dy);
      screenShakeIntensity *= 0.9; // decay
    }

    // 1. Render beautiful scene
    drawThemeBackground();

    const slowFactor = runPowers.slow > 0 ? 0.6 : 1.0;
    const currentSpeed = physics.pipeSpeed * slowFactor;

    // Update timers
    if (runPowers.slow > 0) runPowers.slow--;
    if (runPowers.magnet > 0) runPowers.magnet--;

    if (state === "playing") {
      // AI Autoplay Routine
      if (isAutoplay) {
        handleAutoplay();
      }

      // Wind dynamics (Level 6+)
      if (level >= 6) {
        wind.timer--;
        if (wind.timer <= 0) {
          wind.timer = 50 + Math.floor(Math.random() * 80);
          wind.direction = Math.random() > 0.5 ? 1 : -1;
          // Cap wind force at a challenging but playable 0.12 magnitude per frame
          const rawForce = 0.01 + (level - 6) * 0.0035;
          wind.force = Math.min(0.12, rawForce) * wind.direction;
        }
        player.velocity += wind.force; // apply sideways force in vertical speed simulation slightly or visually
        player.x += wind.force * 50; // shift slightly horizontal within margin
        // Cap player horizontal displacement
        if (player.x < 50) player.x = 50;
        if (player.x > 110) player.x = 110;
        
        UI.updateWindDisplay(true, wind.direction > 0 ? "&rarr;" : "&larr;");
      } else {
        UI.updateWindDisplay(false);
      }

      // Physics math on avatar
      player.velocity += physics.gravity;
      player.y += player.velocity;

      // Rotate based on velocity
      player.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 7, player.velocity * 0.06));

      // Ceiling constraints
      if (player.y - player.radius < 0) {
        player.y = player.radius;
        player.velocity = 0.5; // bounce slightly
      }

      // Ground hits death (bypassed if God Mode active)
      if (player.y + player.radius > height - 12) {
        if (isGodMode) {
          player.y = height - 12 - player.radius;
          player.velocity = -2; // bounce Up
        } else {
          handleDeath();
        }
      }

      // Combo management
      if (comboOfCurrentRun >= 3) {
        comboResetTimer--;
        if (comboResetTimer <= 0) {
          comboOfCurrentRun = 0;
          UI.updateHUDState();
        }
      }

      // Trail particle engine
      player.pulse += 0.15;
      if (animId % 4 === 0) {
        trail.push({
          x: player.x,
          y: player.y,
          size: 4 + Math.sin(player.pulse) * 2,
          alpha: 0.9
        });
      }

      // Move powerups and obstacles
      distanceScrolledSinceLastPipe += currentSpeed;
      if (distanceScrolledSinceLastPipe >= physics.pipeDistanceApart) {
        _spawnPillar();
        distanceScrolledSinceLastPipe = 0;
      }

      // Spawn Asteroids
      if (level >= 9) {
        asteroidSpawnTimer += slowFactor;
        const currentAsteroidFrequency = physics.asteroidFrequency || 1.0;
        if (asteroidSpawnTimer > (180 + Math.random() * 140) / currentAsteroidFrequency) {
          _spawnAsteroid();
          asteroidSpawnTimer = 0;
        }
      }
    }

    // 2. Render Trail Glowing Behind
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      p.alpha -= 0.03;
      p.x -= currentSpeed;
      if (p.alpha <= 0) {
        trail.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(255, 107, 53, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render Columns/Pillars
    for (let i = pillars.length - 1; i >= 0; i--) {
      const pipe = pillars[i];
      if (state === "playing") {
        pipe.x -= currentSpeed;
        
        // Custom vertical moving animation Bounce bounded
        if (pipe.isMoving) {
          pipe.gapTop += pipe.moveDir * pipe.moveSpeed;
          if (Math.abs(pipe.gapTop - pipe.initialGapTop) > pipe.moveRange) {
            pipe.moveDir *= -1;
          }
          // Clamp gapTop so it never goes off-screen (minimum 35px padding from top/bottom)
          pipe.gapTop = Math.max(35, Math.min(height - pipe.gapHeight - 35, pipe.gapTop));
        }
      }

      if (pipe.x + pipe.width < 0) {
        pillars.splice(i, 1);
        continue;
      }

      // Draw Top Pipe body
      const gradientTop = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
      gradientTop.addColorStop(0, pipe.colorStart);
      gradientTop.addColorStop(1, pipe.colorEnd);
      ctx.fillStyle = gradientTop;
      ctx.fillRect(pipe.x, 0, pipe.width, pipe.gapTop);

      // Draw Top Cap (6px wider)
      ctx.fillStyle = pipe.colorStart;
      ctx.fillRect(pipe.x - 3, pipe.gapTop - 20, pipe.width + 6, 20);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
      ctx.strokeRect(pipe.x - 3, pipe.gapTop - 20, pipe.width + 6, 20);

      // Draw Bottom Pipe body
      const bottomHeight = height - (pipe.gapTop + pipe.gapHeight);
      const gradientBottom = ctx.createLinearGradient(pipe.x, height - bottomHeight, pipe.x + pipe.width, height);
      gradientBottom.addColorStop(0, pipe.colorStart);
      gradientBottom.addColorStop(1, pipe.colorEnd);
      ctx.fillStyle = gradientBottom;
      ctx.fillRect(pipe.x, pipe.gapTop + pipe.gapHeight, pipe.width, bottomHeight);

      // Draw Bottom Cap (6px wider)
      ctx.fillStyle = pipe.colorStart;
      ctx.fillRect(pipe.x - 3, pipe.gapTop + pipe.gapHeight, pipe.width + 6, 20);
      ctx.strokeRect(pipe.x - 3, pipe.gapTop + pipe.gapHeight, pipe.width + 6, 20);

      // Render Star Tokens inside Gap center
      if (pipe.hasStar && !pipe.starCollected) {
        // Fallback initialization
        if (pipe.starX === undefined || pipe.starY === undefined) {
          pipe.starX = pipe.x + pipe.width / 2;
          pipe.starY = pipe.gapTop + pipe.gapHeight / 2;
        }

        // Scroll the star with the screen
        if (state === "playing") {
          pipe.starX -= currentSpeed;

          // If pipe is moving vertically and we are NOT pulling the star, keep star inside gap center
          if (pipe.isMoving && runPowers.magnet <= 0) {
            pipe.starY = pipe.gapTop + pipe.gapHeight / 2;
          }
          
          // Magnet mechanics auto-pulling
          if (runPowers.magnet > 0) {
            const dx = player.x - pipe.starX;
            const dy = player.y - pipe.starY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < 185) { // increased range for children & adults play
              // Responsively float star towards player!
              pipe.starX += (player.x - pipe.starX) * 0.16;
              pipe.starY += (player.y - pipe.starY) * 0.16;
            }
          }
        }

        // Star drawing (Yellow Glowing Core)
        ctx.save();
        ctx.translate(pipe.starX, pipe.starY);
        const pulse = Math.sin(Date.now() * 0.008) * 2;
        ctx.font = `${18 + pulse}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(255, 210, 63, 0.8)";
        ctx.shadowBlur = 10;
        ctx.fillText("⭐", 0, 0);
        ctx.restore();

        // Detect Star collection
        const sDist = Math.hypot(player.x - pipe.starX, player.y - pipe.starY);
        if (sDist < player.radius + 15) { // slightly larger grab hitbox for fun play
          pipe.starCollected = true;
          coinsOfCurrentRun += 2;
          Audio.play("star");
          // Spawn sparks
          for (let s = 0; s < 10; s++) {
            particles.push({
              x: pipe.starX,
              y: pipe.starY,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: "#ffd23f",
              size: 2 + Math.random() * 4,
              alpha: 1,
              life: 1
            });
          }
          UI.updateHUDState();
        }
      }

      // Obstacle Scoring Pass Checks
      if (!pipe.passed && pipe.x + pipe.width / 2 < player.x) {
        pipe.passed = true;
        pipesPassed++;
        
        // Increment continuous combo
        comboOfCurrentRun++;
        comboResetTimer = 100; // Reset 100 frames window

        const currentComboMultiplier = comboOfCurrentRun >= 3 ? Math.min(15, comboOfCurrentRun) : 1;
        scoreOfCurrentRun += currentComboMultiplier;
        coinsOfCurrentRun += currentComboMultiplier * 1;

        Audio.play(comboOfCurrentRun >= 3 ? "combo" : "score");
        UI.updateHUDState();

        // Level completed!
        if (pipesPassed >= totalLevelPipesNeeded) {
          handleLevelComplete();
        }
      }

      // Core collision verification
      if (state === "playing") {
        // Highly Generous Collision Hitbox: 42% smaller than visual scale.
        const hitboxPadding = 0.58; 
        const hRadius = player.radius * hitboxPadding;

        // Box boundaries checks
        const pLeft = player.x - hRadius;
        const pRight = player.x + hRadius;
        const pTop = player.y - hRadius;
        const pBottom = player.y + hRadius;

        // Bottom/Top Pipe colliding blocks
        const withinHorizontal = pRight > pipe.x && pLeft < pipe.x + pipe.width;
        const colTopHit = pTop < pipe.gapTop;
        const colBottomHit = pBottom > pipe.gapTop + pipe.gapHeight;

        if (withinHorizontal && (colTopHit || colBottomHit)) {
          triggerCrash();
        }
      }
    }

    // 4. Render Spawning Asteroids
    for (let a = asteroids.length - 1; a >= 0; a--) {
      const ast = asteroids[a];
      if (state === "playing") {
        ast.x -= ast.speed;
        ast.angle += ast.rotSpeed;
      }

      if (ast.x + 30 < 0) {
        asteroids.splice(a, 1);
        continue;
      }

      // Draw beautiful flaming asteroid
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.angle);
      
      // Outer glow fire
      let radialGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, ast.radius + 8);
      radialGlow.addColorStop(0, "#ff6b35");
      radialGlow.addColorStop(0.6, "rgba(255, 107, 53, 0.3)");
      radialGlow.addColorStop(1, "rgba(255, 107, 53, 0)");
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(0, 0, ast.radius + 8, 0, Math.PI * 2);
      ctx.fill();

      // Rock core
      ctx.fillStyle = "#4a354f";
      ctx.strokeStyle = "#ff6b35";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ast.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Craters details
      ctx.fillStyle = "#271b2d";
      ctx.beginPath();
      ctx.arc(-ast.radius*0.3, -ast.radius*0.2, ast.radius * 0.25, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // Asteroid collision
      if (state === "playing") {
        const hRadius = player.radius * 0.58;
        const aDist = Math.hypot(player.x - ast.x, player.y - ast.y);
        if (aDist < hRadius + ast.radius - 2) {
          triggerCrash();
        }
      }
    }

    // 5. Render active Particles
    for (let pIdx = particles.length - 1; pIdx >= 0; pIdx--) {
      const prt = particles[pIdx];
      prt.x += prt.vx;
      prt.y += prt.vy;
      prt.alpha -= 0.02;
      if (prt.alpha <= 0) {
        particles.splice(pIdx, 1);
        continue;
      }
      ctx.fillStyle = prt.color;
      ctx.globalAlpha = prt.alpha;
      ctx.beginPath();
      ctx.arc(prt.x, prt.y, prt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // 6. Drawing Client Character Avatar (and skin rendering)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    // Render active shield visual halo
    if (runPowers.shield) {
      ctx.strokeStyle = "rgba(6, 255, 165, 0.8)";
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#06ffa5";
      ctx.beginPath();
      ctx.arc(0, 0, player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // Load visual skin emoji from data storage
    const activeData = Save.get();
    const skinEmoji = Auth.SKIN_EMOJIS[activeData.equippedSkin] || "🐉";
    
    // Draw character emoji
    ctx.font = `${player.radius * 2}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(skinEmoji, 0, 0);

    // Wing Pulse animation if playing
    if (state === "playing") {
      ctx.font = `${player.radius * 1.1}px Arial`;
      const pulseWing = Math.cos(Date.now() * 0.02) * 5;
      ctx.fillText("🪶", -14, -8 + pulseWing);
    }
    ctx.restore();

    // Loop callback
    if (state === "playing" && animId % 10 === 0) {
      UI.updateHUDState();
    }

    if (state === "playing" || state === "ready" || state === "dead") {
      if (screenShakeIntensity > 0.1) {
        ctx.restore();
      }
      animId = requestAnimationFrame(_loop);
    }
  }

  function triggerCrash() {
    // If God Mode is active, bypass crash completely!
    if (isGodMode) return;

    // Shield protects one hit
    if (runPowers.shield) {
      runPowers.shield = false;
      Audio.play("shield");
      triggerScreenShake(12);
      
      // Spawn magic green particles
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: player.x,
          y: player.y,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          color: "#06ffa5",
          size: 3 + Math.random() * 5,
          alpha: 1,
          life: 1
        });
      }
      // Brief flashing
      return;
    }

    handleDeath();
  }

  function handleDeath() {
    state = "dead";
    Audio.play("die");
    triggerScreenShake(24);

    // Explode red fragments
    for (let i = 0; i < 25; i++) {
      particles.push({
        x: player.x,
        y: player.y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        color: "#ff453a",
        size: 3 + Math.random() * 6,
        alpha: 1,
        life: 1
      });
    }

    // Fall to ground loop is active, but we show gameover screen after 950ms delay
    setTimeout(() => {
      if (animId) cancelAnimationFrame(animId);
      
      // Save stats
      _triggerGameoverDisplay();
    }, 950);
  }

  function handleLevelComplete() {
    state = "levelup";
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    Audio.play("levelup");
    
    // Animate stars or details
    const totalEarnings = 10 + level * 5 + Math.floor(scoreOfCurrentRun * 0.4) + Math.floor(coinsOfCurrentRun * 0.2);
    const data = Save.get();
    data.coins += totalEarnings;
    data.totalCoinsEarned += totalEarnings;
    
    // Earn gem rewards
    const gemAward = level % 2 === 0 ? 1 : 0;
    data.gems += gemAward;

    if (level >= data.maxLevel) {
      data.maxLevel = level + 1;
    }
    
    // Set Achievements Progresses
    Achievements.checkUnlocks(data, scoreOfCurrentRun);
    Save.set(data);

    // Show panel
    UI.showScreen("complete");
    UI.updateLevelCompleteScreen(totalEarnings, gemAward);
  }

  function advanceToNextLevel() {
    _loadLevel(level + 1);
  }

  function _triggerGameoverDisplay() {
    const data = Save.get();
    
    // Save state statistics
    data.totalPlays++;
    data.totalCoinsEarned += coinsOfCurrentRun;
    data.coins += coinsOfCurrentRun;
    
    let isNewRecord = false;
    if (scoreOfCurrentRun > data.bestScore) {
      data.bestScore = scoreOfCurrentRun;
      isNewRecord = true;
    }

    Achievements.checkUnlocks(data, scoreOfCurrentRun);
    Save.set(data);

    // Stop animation frame loop completely to release rendering threads and CPU resources
    state = "idle";
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }

    UI.showScreen("gameover");
    UI.updateGameoverScreen(isNewRecord);
  }

  function pauseGame() {
    if (state !== "playing") return;
    state = "paused";
    Audio.play("click");
    UI.showScreen("pause");
  }

  function resumeGame() {
    state = "playing";
    Audio.play("click");
    UI.showScreen("hud");
    
    // Resume render
    animId = requestAnimationFrame(_loop);
  }

  function quitToMenu() {
    Audio.play("click");
    state = "idle";
    if (animId) cancelAnimationFrame(animId);
    if (activeCountTimer) {
      clearInterval(activeCountTimer);
      activeCountTimer = null;
    }
    UI.showScreen("menu");
    UI.updateMenuProfile();
  }

  function watchAdShield() {
    // Simulated video 2s
    Audio.play("click");
    const adBtn = document.getElementById("btn-watch-ad");
    adBtn.disabled = true;
    adBtn.innerText = "📺 Loading Ad (2s)...";

    setTimeout(() => {
      runPowers.shield = true;
      adBtn.innerText = "🛡️ Shield Granted!";
      Audio.play("shield");
      
      // Apply visually immediately in HUD if playing but this is for next run or if we're dead we can restart with shield
      const data = Save.get();
      data.ownedPowers.shield++;
      Save.set(data);
      
      adBtn.innerText = "Shield Added To Stock!";
      setTimeout(() => {
        adBtn.disabled = false;
        adBtn.innerText = "Watch Ad -> Get Shield!";
      }, 1500);
    }, 2000);
  }

  function triggerPowerup(pKey) {
    if (state !== "playing") return;
    const data = Save.get();
    
    if (pKey === "slow") {
      if (runPowers.slow > 0) return; // already active
      const owned = data.ownedPowers.slow || 0;
      if (owned > 0) {
        data.ownedPowers.slow = owned - 1;
        Save.set(data);
        runPowers.slow = 360; // 6 seconds at 60fps
        Audio.play("shield");
        UI.updateHUDState();
      }
    } else if (pKey === "magnet") {
      if (runPowers.magnet > 0) return; // already active
      const owned = data.ownedPowers.magnet || 0;
      if (owned > 0) {
        data.ownedPowers.magnet = owned - 1;
        Save.set(data);
        runPowers.magnet = 360; // 6 seconds at 60fps
        Audio.play("shield");
        UI.updateHUDState();
      }
    }
  }

  function claimDailyBonus() {
    const data = Save.get();
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    if (now - data.lastDaily < cooldown) {
      alert("Daily bonus already claimed! Check back tomorrow.");
      return;
    }

    const reward = 60 + Math.floor(Math.random() * 61); // 60 to 120
    data.coins += reward;
    data.totalCoinsEarned += reward;
    data.lastDaily = now;
    Save.set(data);

    Audio.play("daily");
    alert(`🎁 Daily Bonus! You received: 🪙 ${reward} coins!`);
    
    UI.updateMenuProfile();
  }

  return {
    _engineInit,
    startRun,
    advanceToNextLevel,
    pauseGame,
    resumeGame,
    quitToMenu,
    watchAdShield,
    claimDailyBonus,
    triggerPowerup,
    
    // Core states
    getState: () => state,
    getPlayer: () => player,
    getScore: () => scoreOfCurrentRun,
    getCoinsEarned: () => coinsOfCurrentRun,
    getCombo: () => comboOfCurrentRun,
    getPipesPassed: () => pipesPassed,
    getPipesNeeded: () => totalLevelPipesNeeded,
    getLevel: () => level,
    getRunPowers: () => runPowers,
    toggleDevMenu: () => {
      const modal = document.getElementById("modal-dev");
      if (modal) {
        if (modal.classList.contains("hidden")) {
          modal.classList.remove("hidden");
          const specs = calculateLevelSpecs(level);
          document.getElementById("dev-spec-gap").innerText = specs.gapSize.toFixed(1) + "px";
          document.getElementById("dev-spec-speed").innerText = specs.pipeSpeed.toFixed(1) + "px/f";
          document.getElementById("dev-spec-grav").innerText = specs.gravity.toFixed(4);
          document.getElementById("dev-spec-jump").innerText = specs.jumpForce.toFixed(2);
          document.getElementById("dev-spec-dist").innerText = specs.pipeDistanceApart.toFixed(0) + "px";
          document.getElementById("dev-spec-pipes").innerText = specs.pipesNeeded;
          
          const levelInput = document.getElementById("dev-level-input");
          if (levelInput) levelInput.value = level;
          
          document.getElementById("dev-god-toggle").checked = isGodMode;
          document.getElementById("dev-auto-toggle").checked = isAutoplay;
        } else {
          modal.classList.add("hidden");
        }
      }
    },
    toggleGodMode: (enabled) => {
      isGodMode = !!enabled;
      const chk = document.getElementById("dev-god-toggle");
      if (chk) chk.checked = isGodMode;
    },
    toggleAutoplay: (enabled) => {
      isAutoplay = !!enabled;
      const chk = document.getElementById("dev-auto-toggle");
      if (chk) chk.checked = isAutoplay;
    },
    devSetLevel: (lvl) => {
      lvl = parseInt(lvl);
      if (!lvl || lvl < 1 || lvl > 1000) {
        alert("Please enter a valid level between 1 and 1000!");
        return;
      }
      level = lvl;
      const data = Save.get();
      if (lvl > data.maxLevel) {
        data.maxLevel = lvl + 1;
        Save.set(data);
      }
      
      Achievements.checkUnlocks(data, scoreOfCurrentRun);
      Save.set(data);

      if (state === "playing" || state === "ready") {
        _loadLevel(lvl);
        if (state === "ready") {
          const specs = calculateLevelSpecs(lvl);
          UI.updateReadyScreen(lvl, specs);
        }
      } else {
        _loadLevel(lvl);
      }

      const specs = calculateLevelSpecs(level);
      document.getElementById("dev-spec-gap").innerText = specs.gapSize.toFixed(1) + "px";
      document.getElementById("dev-spec-speed").innerText = specs.pipeSpeed.toFixed(1) + "px/f";
      document.getElementById("dev-spec-grav").innerText = specs.gravity.toFixed(4);
      document.getElementById("dev-spec-jump").innerText = specs.jumpForce.toFixed(2);
      document.getElementById("dev-spec-dist").innerText = specs.pipeDistanceApart.toFixed(0) + "px";
      document.getElementById("dev-spec-pipes").innerText = specs.pipesNeeded;

      UI.updateMenuProfile();
      UI.updateHUDState();
      Audio.play("levelup");
    },
    devAddCoins: (amt) => {
      const data = Save.get();
      data.coins += amt;
      data.totalCoinsEarned += amt;
      Save.set(data);
      UI.updateMenuProfile();
      Audio.play("coin");
      
      const shopCoins = document.getElementById("shop-coins");
      if (shopCoins) shopCoins.innerText = data.coins;
    },
    devAddGems: (amt) => {
      const data = Save.get();
      data.gems += amt;
      Save.set(data);
      UI.updateMenuProfile();
      Audio.play("levelup");
      
      const shopGems = document.getElementById("shop-gems");
      if (shopGems) shopGems.innerText = data.gems;
    },
    devCompleteLevel: () => {
      if (state !== "playing") {
        alert("Please start the run first (Click Play)!");
        return;
      }
      handleLevelComplete();
      const modal = document.getElementById("modal-dev");
      if (modal) modal.classList.add("hidden");
    },
    buyPower: (pKey, cost) => {
      const data = Save.get();
      if (data.coins >= cost) {
        data.coins -= cost;
        data.ownedPowers[pKey]++;
        Save.set(data);
        Audio.play("coin");
        return true;
      }
      return false;
    }
  };
})();

// ==========================================
// 6. ACHIEVEMENTS ENGINE MODULE (14 Total)
// ==========================================
const Achievements = (() => {
  const ITEMS = [
    { id: "flight", name: "First Flight", desc: "Play your first game", rewardText: "🪙 +10 coins", check: (data) => data.totalPlays >= 1, reward: (data) => data.coins += 10 },
    { id: "star10", name: "Rising Star", desc: "Score 10 points in a single run", rewardText: "🪙 +20 coins", check: (data, score) => score >= 10, reward: (data) => data.coins += 20 },
    { id: "chaser30", name: "Sky Chaser", desc: "Score 30 points in a single run", rewardText: "🪙 +50 coins", check: (data, score) => score >= 30, reward: (data) => data.coins += 50 },
    { id: "master75", name: "Sky Master", desc: "Score 75 points in a single run", rewardText: "🪙 +100 coins, 💎 +1 gem", check: (data, score) => score >= 75, reward: (data) => { data.coins += 100; data.gems += 1; } },
    { id: "god150", name: "Dragon God", desc: "Score 150 points in a single run", rewardText: "🪙 +250 coins, 💎 +3 gems", check: (data, score) => score >= 150, reward: (data) => { data.coins += 250; data.gems += 3; } },
    { id: "surv5", name: "Survivor", desc: "Reach Level 5 in progression", rewardText: "🪙 +60 coins", check: (data) => data.maxLevel >= 5, reward: (data) => data.coins += 60 },
    { id: "decade10", name: "Decade Flier", desc: "Reach Level 10 in progression", rewardText: "🪙 +120 coins, 💎 +2 gems", check: (data) => data.maxLevel >= 10, reward: (data) => { data.coins += 120; data.gems += 2; } },
    { id: "infinite20", name: "Infinite Soarer", desc: "Reach Level 20", rewardText: "🪙 +300 coins, 💎 +5 gems", check: (data) => data.maxLevel >= 20, reward: (data) => { data.coins += 300; data.gems += 5; } },
    { id: "century100", name: "Centurion Flier", desc: "Reach Level 100 in progression", rewardText: "🪙 +1000 coins, 💎 +15 gems", check: (data) => data.maxLevel >= 100, reward: (data) => { data.coins += 1000; data.gems += 15; } },
    { id: "orbit500", name: "Orbit Escape", desc: "Reach Level 500 in progression", rewardText: "🪙 +5000 coins, 💎 +50 gems", check: (data) => data.maxLevel >= 500, reward: (data) => { data.coins += 5000; data.gems += 50; } },
    { id: "legend1000", name: "Cosmic Immortal", desc: "Reach Level 1,000 in progression", rewardText: "🪙 +20000 coins, 💎 +100 gems", check: (data) => data.maxLevel >= 1000, reward: (data) => { data.coins += 20000; data.gems += 100; } },
    { id: "pipes100", name: "Pipe Dodger", desc: "Pass 100 total pipes", rewardText: "🪙 +50 coins", check: (data) => (data.totalPipes || 0) >= 100, reward: (data) => data.coins += 50 },
    { id: "matrix500", name: "Matrix Mode", desc: "Pass 500 total pipes", rewardText: "🪙 +150 coins, 💎 +2 gems", check: (data) => (data.totalPipes || 0) >= 500, reward: (data) => { data.coins += 150; data.gems += 2; } },
    { id: "stars50", name: "Star Collector", desc: "Collect 50 stars in total", rewardText: "🪙 +60 coins", check: (data) => (data.totalStars || 0) >= 50, reward: (data) => data.coins += 60 },
    { id: "hoarder1000", name: "Coin Hoarder", desc: "Earn 1000 total career coins", rewardText: "🪙 +100 coins", check: (data) => data.totalCoinsEarned >= 1000, reward: (data) => data.coins += 100 },
    { id: "addict25", name: "Addicted", desc: "Play 25 total flight games", rewardText: "🪙 +50 coins", check: (data) => data.totalPlays >= 25, reward: (data) => data.coins += 50 },
    { id: "truedragon", name: "True Dragon", desc: "Play 100 total flight games", rewardText: "🪙 +200 coins, 💎 +3 gems", check: (data) => data.totalPlays >= 100, reward: (data) => { data.coins += 200; data.gems += 3; } }
  ];

  function checkUnlocks(data, lastScore) {
    if (!data.achievements) data.achievements = {};
    
    ITEMS.forEach(item => {
      if (!data.achievements[item.id]) {
        if (item.check(data, lastScore)) {
          data.achievements[item.id] = true;
          item.reward(data);
          // Highlight notify or alert
          console.log(`Unlocked achievement: ${item.name}!`);
        }
      }
    });
  }

  function renderList() {
    const data = Save.get();
    const container = document.getElementById("achievements-list");
    container.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "achievements-grid";

    ITEMS.forEach(item => {
      const unlocked = !!data.achievements[item.id];
      const card = document.createElement("div");
      card.className = "achievement-card glass";
      
      card.innerHTML = `
        <div class="ach-left">
          <div class="ach-icon-box">
            ${unlocked ? "🏅" : "🔒"}
          </div>
          <div class="ach-info">
            <span class="ach-title">${unlocked ? item.name : "???"}</span>
            <span class="ach-desc">${unlocked ? item.desc : "Locked — Continue your flights to unlock!"}</span>
            <span class="ach-reward">Reward: ${item.rewardText}</span>
          </div>
        </div>
        <div>
          <span class="ach-check">${unlocked ? "✅" : "❌"}</span>
        </div>
      `;
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  return {
    ITEMS,
    checkUnlocks,
    renderList
  };
})();

// ==========================================
// 7. UI CONTROLLER MODULE (Screen management)
// ==========================================
const UI = (() => {
  let shopTab = "skins";

  // Shop skins definition (9 skins as requested)
  const skins = [
    { key: "dragon", name: "Dragon (Default)", desc: "A classic green reptile", emoji: "🐉", price: 0 },
    { key: "eagle", name: "Eagle", desc: "American bird of freedom", emoji: "🦅", price: 100, type: "coins" },
    { key: "rocket", name: "Rocket", desc: "Sonic flyer ready to launch", emoji: "🚀", price: 200, type: "coins" },
    { key: "bat", name: "Bat", desc: "Bloodsucking twilight shadow", emoji: "🦇", price: 280, type: "coins" },
    { key: "alien", name: "Alien", desc: "Visitors seeking stellar core", emoji: "👾", price: 450, type: "coins" },
    { key: "phoenix", name: "Phoenix", desc: "Rare bird reborn from embers", emoji: "🦚", price: 5, type: "gems" },
    { key: "unicorn", name: "Unicorn", desc: "Magical horn shining pure", emoji: "🦄", price: 8, type: "gems" },
    { key: "wolf", name: "Wolf", desc: "Midnight beast racing skyward", emoji: "🐺", price: 320, type: "coins" },
    { key: "dragon2", name: "Dragon II", desc: "Legendary red dragon avatar", emoji: "🐲", price: 600, type: "coins" }
  ];

  // Shop consumable powerups
  const powers = [
    { key: "shield", name: "Shield (Consumable)", desc: "Absorbs one fatal crash", emoji: "🛡️", price: 30 },
    { key: "slow", name: "Slow-Mo (Consumable)", desc: "Slows down pillars scrolling for 6s", emoji: "⏱️", price: 50 },
    { key: "magnet", name: "Magnet (Consumable)", desc: "Attracts star tokens automatically for 6s", emoji: "🧲", price: 40 }
  ];

  function showScreen(screenId) {
    // Hide screens
    const screens = ["screen-login", "screen-menu", "screen-ready", "screen-hud", "screen-pause", "screen-complete", "screen-gameover", "screen-leaderboard", "screen-shop", "screen-achievements", "screen-howto"];
    screens.forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.add("hidden");
    });

    // Make target active
    const activeScreen = document.getElementById(`screen-${screenId}`);
    if (activeScreen) {
      activeScreen.classList.remove("hidden");
    }

    // Module-specific initializations
    if (screenId === "leaderboard") {
      Leaderboard.render();
    } else if (screenId === "shop") {
      renderShop();
    } else if (screenId === "achievements") {
      Achievements.renderList();
    }
  }

  function updateMenuProfile() {
    const data = Save.get();
    
    document.getElementById("menu-avatar").innerText = data.user.avatar || "🐉";
    document.getElementById("menu-name").innerText = data.user.name || "Pilot";
    document.getElementById("menu-platform").innerText = data.user.platform || "Guest";
    document.getElementById("menu-coins").innerText = data.coins || 0;
    
    // Dynamic global ranking calculation
    const rank = Leaderboard.getPlayerRank();
    document.getElementById("menu-rank").innerText = rank;

    // Center avatar display
    const brandSkinEmoji = Auth.SKIN_EMOJIS[data.equippedSkin] || "🐉";
    document.getElementById("menu-brand-skin").innerText = brandSkinEmoji;

    // Detailed stats
    document.getElementById("stat-best").innerText = data.bestScore || 0;
    document.getElementById("stat-level").innerText = (data.maxLevel - 1) || 1;
    document.getElementById("stat-total-coins").innerText = data.totalCoinsEarned || 0;

    // Claimed states or buttons
    const lastTime = data.lastDaily || 0;
    const claimedState = Date.now() - lastTime < 24 * 60 * 60 * 1000;
    const claimBtn = document.getElementById("btn-daily-bonus");
    if (claimedState) {
      claimBtn.className = "btn btn-daily claimed";
      claimBtn.innerHTML = "🎁 Daily Bonus Claimed!";
    } else {
      claimBtn.className = "btn btn-daily btn-primary";
      claimBtn.innerHTML = "🎁 Claim Daily Bonus!";
    }
  }

  function updateReadyScreen(lvl, specs) {
    document.getElementById("ready-level-badge").innerText = `LEVEL ${lvl}`;
    
    // Select dynamic tip based on theme or stage
    let tip = "Avoid hitting the glowing borders!";
    if (lvl === 1) tip = "Level 1 — Very easy! Just get used to tapping.";
    else if (lvl === 2) tip = "Level 2 — Same pace, collect those stars!";
    else if (lvl === 3) tip = "Level 3 — Slightly faster! Keep your rhythm.";
    else if (lvl === 4) tip = "Level 4 — ⚠️ Pipes start moving! Watch closely.";
    else if (lvl === 6) tip = "Level 6 — ⚠️ Sideways wind active! Compensate carefully.";
    else if (lvl === 9) tip = "Level 9 — ⚠️ Asteroids will drift across! Fly to dodge.";
    else if (lvl >= 13) tip = "Level 13 — Extreme Hell pace! May the dragon protect you.";
    
    document.getElementById("ready-tip-text").innerText = tip;

    // Powerup status check
    const data = Save.get();
    const readyPowersEl = document.getElementById("ready-powerups");
    readyPowersEl.innerHTML = "";

    if (data.ownedPowers.shield > 0) {
      readyPowersEl.innerHTML += `<span class="active-pw-pill">🛡️ Shield Active (+${data.ownedPowers.shield})</span>`;
    }
  }

  function updateHUDState() {
    document.getElementById("hud-score").innerText = Game.getScore();
    document.getElementById("hud-level").innerText = Game.getLevel();
    document.getElementById("hud-coins").innerText = Game.getCoinsEarned();

    // Progress percentage
    const progress = (Game.getPipesPassed() / Game.getPipesNeeded()) * 100;
    document.getElementById("hud-progress").style.width = `${progress}%`;

    // Handle combo badge
    const combo = Game.getCombo();
    const comboBadge = document.getElementById("hud-combo-badge");
    if (combo >= 3) {
      comboBadge.classList.remove("hidden");
      document.getElementById("hud-combo").innerText = combo;
    } else {
      comboBadge.classList.add("hidden");
    }

    // Powerups ticks active symbols
    const activePWPipe = document.getElementById("hud-powerups-active");
    activePWPipe.innerHTML = "";
    
    const runPw = Game.getRunPowers();
    if (runPw.slow > 0) {
      activePWPipe.innerHTML += `<span class="active-pw-pill pulse">⏱️ ${Math.round(runPw.slow / 60)}s</span>`;
    }
    if (runPw.magnet > 0) {
      activePWPipe.innerHTML += `<span class="active-pw-pill pulse">🧲 ${Math.round(runPw.magnet / 60)}s</span>`;
    }

    // Render power-up triggers
    const data = Save.get();
    const triggerContainer = document.getElementById("hud-powerup-triggers");
    if (triggerContainer) {
      triggerContainer.innerHTML = "";

      // Slow Mo Trigger
      const slowCount = data.ownedPowers.slow || 0;
      const slowActive = runPw.slow > 0;
      const slowBtn = document.createElement("button");
      slowBtn.className = "powerup-trigger-btn" + (slowCount <= 0 || slowActive ? " disabled" : "");
      slowBtn.innerHTML = `⏱️<span class="powerup-trigger-badge">${slowCount}</span>`;
      slowBtn.onclick = (e) => {
        e.stopPropagation();
        Game.triggerPowerup("slow");
      };
      
      // Magnet Trigger
      const magnetCount = data.ownedPowers.magnet || 0;
      const magnetActive = runPw.magnet > 0;
      const magnetBtn = document.createElement("button");
      magnetBtn.className = "powerup-trigger-btn" + (magnetCount <= 0 || magnetActive ? " disabled" : "");
      magnetBtn.innerHTML = `🧲<span class="powerup-trigger-badge">${magnetCount}</span>`;
      magnetBtn.onclick = (e) => {
        e.stopPropagation();
        Game.triggerPowerup("magnet");
      };

      triggerContainer.appendChild(slowBtn);
      triggerContainer.appendChild(magnetBtn);
    }
  }

  function updateWindDisplay(active, arrow = "") {
    const el = document.getElementById("hud-wind-indicator");
    if (active) {
      el.classList.remove("hidden");
      document.getElementById("wind-arrow").innerHTML = arrow;
    } else {
      el.classList.add("hidden");
    }
  }

  function updateLevelCompleteScreen(coinsReward, gemsReward) {
    document.getElementById("complete-reward-coins").innerText = coinsReward;
    document.getElementById("complete-reward-gems").innerText = gemsReward;

    // Next level mode caption
    const nextLvl = Game.getLevel() + 1;
    let desc = "Faster Obstacles";
    if (nextLvl === 4) desc = "Moving Columns Unlocked!";
    else if (nextLvl === 6) desc = "Dynamic Sideways Wind Added!";
    else if (nextLvl === 9) desc = "Asteroid Drifts Spawn Active!";
    else {
      const modes = [
        "Hyper Speed Shift",
        "Celestial Gravitational Sway",
        "Stellar Dust Overlap",
        "Nebula Navigation Elite",
        "Vortex Drift Challenge"
      ];
      desc = modes[nextLvl % modes.length] + " (Level " + nextLvl + ")";
    }
    
    document.getElementById("complete-next-mode").innerText = desc;
  }

  function updateGameoverScreen(isNewRecord) {
    if (isNewRecord) {
      document.getElementById("gameover-record-banner").classList.remove("hidden");
    } else {
      document.getElementById("gameover-record-banner").classList.add("hidden");
    }

    const data = Save.get();
    const lastScore = Game.getScore();
    
    document.getElementById("gameover-score").innerText = lastScore;
    document.getElementById("gameover-best").innerText = data.bestScore;
    document.getElementById("gameover-level").innerText = `Level ${Game.getLevel()}`;
    document.getElementById("gameover-run-coins").innerText = `🪙 ${Game.getCoinsEarned()}`;

    // Medal assignments as requested: 🪨🥉🥈🥇💎👑
    let medal = "🪨";
    if (lastScore >= 120) medal = "👑";
    else if (lastScore >= 80) medal = "💎";
    else if (lastScore >= 50) medal = "🥇";
    else if (lastScore >= 25) medal = "🥈";
    else if (lastScore >= 10) medal = "🥉";
    
    document.getElementById("gameover-medal").innerText = medal;
    document.getElementById("gameover-avatar").innerText = Auth.SKIN_EMOJIS[data.equippedSkin] || "🐉";
  }

  function selectShopTab(tab) {
    shopTab = tab;
    document.getElementById("shop-tab-skins").className = tab === "skins" ? "tab-button active" : "tab-button";
    document.getElementById("shop-tab-powers").className = tab === "powers" ? "tab-button active" : "tab-button";
    renderShop();
  }

  function renderShop() {
    const data = Save.get();
    
    // Sync header currency info
    document.getElementById("shop-coins").innerText = data.coins;
    document.getElementById("shop-gems").innerText = data.gems;

    const container = document.getElementById("shop-shelf");
    container.innerHTML = "";

    if (shopTab === "skins") {
      const grid = document.createElement("div");
      grid.className = "shop-grid";

      skins.forEach(skin => {
        const hasUnlocked = data.unlockedSkins.includes(skin.key);
        const isActive = data.equippedSkin === skin.key;
        
        const card = document.createElement("div");
        card.className = "shop-item-card glass";

        let priceTag = `🪙 ${skin.price}`;
        if (skin.type === "gems") {
          priceTag = `💎 ${skin.price}`;
        }
        
        let buyActionHTML = "";
        if (isActive) {
          buyActionHTML = `<button class="btn-shop-buy btn-equipped">Equipped</button>`;
        } else if (hasUnlocked) {
          buyActionHTML = `<button class="btn-shop-buy" onclick="UI.equipSkin('${skin.key}')">Equip</button>`;
        } else {
          buyActionHTML = `<button class="btn-shop-buy" onclick="UI.buySkin('${skin.key}', ${skin.price}, '${skin.type}')">Buy (${priceTag})</button>`;
        }

        card.innerHTML = `
          <div class="shop-item-emoji">${skin.emoji}</div>
          <p class="shop-item-name">${skin.name}</p>
          <p class="shop-item-desc">${skin.desc}</p>
          ${buyActionHTML}
        `;
        grid.appendChild(card);
      });
      container.appendChild(grid);
    } else {
      // Consumable Powerups List
      const wrapper = document.createElement("div");
      wrapper.className = "shop-powers-list";

      powers.forEach(p => {
        const ownedCount = data.ownedPowers[p.key] || 0;
        const card = document.createElement("div");
        card.className = "power-card glass";

        card.innerHTML = `
          <div class="power-card-left">
            <span class="power-emoji">${p.emoji}</span>
            <div class="power-details">
              <span class="power-name">${p.name}</span>
              <span class="power-desc-sub">${p.desc}</span>
              <span class="power-owned-qty">Owned: ${ownedCount}</span>
            </div>
          </div>
          <div>
            <button class="btn-shop-buy" style="width: auto; padding: 10px 18px;" onclick="UI.buyPowerItem('${p.key}', ${p.price})">Buy (🪙${p.price})</button>
          </div>
        `;
        wrapper.appendChild(card);
      });
      container.appendChild(wrapper);
    }
  }

  function buySkin(sKey, cost, cType) {
    const data = Save.get();
    
    if (cType === "gems") {
      if (data.gems >= cost) {
        data.gems -= cost;
        data.unlockedSkins.push(sKey);
        Save.set(data);
        Audio.play("coin");
        renderShop();
      } else {
        alert("Not enough Premium Gems! Unlock Achievements to gather gems!");
      }
    } else {
      if (data.coins >= cost) {
        data.coins -= cost;
        data.unlockedSkins.push(sKey);
        Save.set(data);
        Audio.play("coin");
        renderShop();
      } else {
        alert("Not enough Gold Coins!");
      }
    }
  }

  function equipSkin(sKey) {
    const data = Save.get();
    data.equippedSkin = sKey;
    Save.set(data);
    Audio.play("click");
    renderShop();
    updateMenuProfile();
  }

  function buyPowerItem(pKey, cost) {
    const success = Game.buyPower(pKey, cost);
    if (success) {
      renderShop();
    } else {
      alert("Not enough Gold Coins to purchase consumable!");
    }
  }

  return {
    showScreen,
    updateMenuProfile,
    updateReadyScreen,
    updateHUDState,
    updateWindDisplay,
    updateLevelCompleteScreen,
    updateGameoverScreen,
    selectShopTab,
    buySkin,
    equipSkin,
    buyPowerItem
  };
})();

// ==========================================
// 8. SERVICE WORKER REGISTER & ENTRY SYSTEM
// ==========================================
(function init() {
  Audio.init();
  Game._engineInit();
  Auth.init();
})();
