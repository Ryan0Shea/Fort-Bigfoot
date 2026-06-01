(() => {
  const BUILD_ID = "2026-06-01b";

  const CONFIG = {
    player: {
      moveSpeed: 7.2,
      sprintMultiplier: 1.45,
      health: 100,
      eyeHeight: 1.65,
      radius: 0.5,
      turnSpeed: 0.0023,
    },
    weapon: {
      clipSize: 1,
      reserveAmmo: 30,
      reloadSeconds: 2.9,
      fireDelay: 0.18,
      cooldown: 0.72,
      spread: 0.018,
      damage: 999,
      range: 90,
      assistAngleDeg: 6,
      crosshairNdcRadius: 0.24,
    },
    wave: {
      startDelay: 3,
      intermission: 8,
      baseCount: 4,
      countGrowth: 2,
      spawnIntervalBase: 1.2,
      spawnIntervalMin: 0.35,
      baseEnemyHealth: 56,
      enemyHealthGrowth: 0.16,
      baseEnemySpeed: 2.1,
      enemySpeedGrowth: 0.08,
      attackDamage: 11,
      attackCooldown: 0.95,
      bruteEvery: 4,
      stragglerTimeout: 18,
    },
    walls: {
      height: 3.8,
      thickness: 1.2,
      segmentHealth: 220,
      gateHealth: 260,
      logRadius: 0.17,
    },
    enemy: {
      radius: 0.75,
      maxDistanceFromFort: 230,
      stuckUnjamSeconds: 2.3,
      cullIfStuckSeconds: 8.5,
    },
    world: {
      boundary: 96,
      groundY: 0,
      riverLevel: -2.4,
      bluffDrop: 7,
    },
    fort: {
      width: 72,
      depth: 36,
      // Normalized from attached footprint reference (clockwise, plan-view).
      footprint: [
        [-0.50, -0.50],
        [-0.41, -0.50],
        [-0.39, -0.43],
        [-0.03, -0.43],
        [-0.03, -0.45],
        [0.00, -0.45],
        [0.00, -0.43],
        [0.39, -0.43],
        [0.41, -0.50],
        [0.50, -0.50],
        [0.46, -0.33],
        [0.40, -0.33],
        [0.19, 0.24],
        [0.23, 0.33],
        [0.23, 0.50],
        [0.14, 0.44],
        [0.12, 0.32],
        [0.04, 0.30],
        [0.04, 0.32],
        [0.00, 0.32],
        [0.00, 0.30],
        [-0.04, 0.30],
        [-0.04, 0.32],
        [-0.12, 0.32],
        [-0.14, 0.44],
        [-0.23, 0.50],
        [-0.23, 0.31],
        [-0.19, 0.24],
        [-0.40, -0.33],
        [-0.46, -0.33],
      ],
    },
    pickups: {
      ammoAmount: 8,
      interactRange: 3.2,
      respawnSeconds: 18,
    },
    repair: {
      amount: 48,
      interactRange: 3.5,
      cooldown: 0.35,
    },
    rebuild: {
      key: "KeyB",
      cooldown: 16,
      scoreCost: 120,
    },
  };

  const DOM = {
    gameContainer: document.getElementById("game-container"),
    wave: document.getElementById("wave"),
    enemies: document.getElementById("enemies"),
    score: document.getElementById("score"),
    highScore: document.getElementById("high-score"),
    kills: document.getElementById("kills"),
    clock: document.getElementById("clock"),
    ammo: document.getElementById("ammo"),
    reload: document.getElementById("reload"),
    fort: document.getElementById("fort"),
    health: document.getElementById("health"),
    rebuildStatus: document.getElementById("rebuild-status"),
    message: document.getElementById("message"),
    breachWarning: document.getElementById("breach-warning"),
    hitMarker: document.getElementById("hit-marker"),
    buildInfo: document.getElementById("build-info"),
    soundtrack: document.getElementById("soundtrack"),
    startOverlay: document.getElementById("start-overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayDescription: document.getElementById("overlay-description"),
    startButton: document.getElementById("start-button"),
    pauseRestartButton: document.getElementById("pause-restart-button"),
    gameOverOverlay: document.getElementById("gameover-overlay"),
    gameOverSummary: document.getElementById("gameover-summary"),
    restartButton: document.getElementById("restart-button"),
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function distXZ(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function polygonArea2D(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i += 1) {
      const j = (i + 1) % points.length;
      sum += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return sum * 0.5;
  }

  function pointInPolygon2D(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      const intersects =
        yi > y !== yj > y &&
        x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-8) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function createWoodTexture(width = 256, height = 256, base = "#7a5632", dark = "#4d341d") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, base);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 72; i += 1) {
      const y = (i / 72) * height + rand(-2, 2);
      ctx.fillStyle = `rgba(35,22,12,${rand(0.08, 0.22)})`;
      ctx.fillRect(0, y, width, rand(1, 3));
    }

    for (let i = 0; i < 160; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${rand(0.02, 0.07)})`;
      ctx.fillRect(rand(0, width), rand(0, height), 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 2;
    return texture;
  }

  function createGroundTexture(type = "grass", width = 512, height = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (type === "grass") {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#5f7648");
      grad.addColorStop(1, "#495f39");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 3600; i += 1) {
        const x = rand(0, width);
        const y = rand(0, height);
        const g = Math.floor(rand(70, 130));
        ctx.fillStyle = `rgba(${g - 20},${g},${Math.floor(g * 0.55)},${rand(0.12, 0.3)})`;
        ctx.fillRect(x, y, rand(1, 2), rand(1, 3));
      }
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#7f6a4d");
      grad.addColorStop(1, "#705b40");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      for (let i = 0; i < 3200; i += 1) {
        const x = rand(0, width);
        const y = rand(0, height);
        const c = Math.floor(rand(90, 150));
        ctx.fillStyle = `rgba(${c},${Math.floor(c * 0.82)},${Math.floor(c * 0.58)},${rand(0.08, 0.22)})`;
        ctx.fillRect(x, y, rand(1, 3), rand(1, 2));
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(type === "grass" ? 20 : 12, type === "grass" ? 20 : 12);
    tex.anisotropy = 2;
    return tex;
  }

  function createTreelineBackdropTexture(width = 2048, height = 512) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(18,34,26,0)");
    grad.addColorStop(0.58, "rgba(24,45,32,0.18)");
    grad.addColorStop(1, "rgba(18,34,24,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    let x = 0;
    while (x < width) {
      const treeW = rand(18, 54);
      const treeH = rand(140, 320);
      const baseY = height - rand(42, 66);
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(20,40,28,0.98)" : "rgba(26,50,33,0.98)";
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x + treeW * 0.5, baseY - treeH);
      ctx.lineTo(x + treeW, baseY);
      ctx.closePath();
      ctx.fill();
      x += rand(10, 24);
    }

    for (let i = 0; i < 220; i += 1) {
      const bx = rand(0, width);
      const by = rand(height * 0.62, height - 12);
      const bw = rand(5, 12);
      const bh = rand(10, 32);
      ctx.fillStyle = `rgba(${Math.floor(rand(18, 34))},${Math.floor(rand(35, 58))},${Math.floor(rand(22, 38))},${rand(0.42, 0.78)})`;
      ctx.fillRect(bx, by, bw, bh);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(2, 1);
    tex.anisotropy = 2;
    tex.needsUpdate = true;
    return tex;
  }

  function createBigfootCutoutTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.08);

    ctx.beginPath();
    ctx.moveTo(-58, 375);
    ctx.lineTo(-84, 302);
    ctx.quadraticCurveTo(-110, 228, -82, 172);
    ctx.quadraticCurveTo(-67, 138, -57, 113);
    ctx.quadraticCurveTo(-22, 16, 42, 35);
    ctx.quadraticCurveTo(84, 47, 93, 93);
    ctx.quadraticCurveTo(125, 161, 98, 224);
    ctx.quadraticCurveTo(85, 251, 73, 302);
    ctx.lineTo(48, 380);
    ctx.lineTo(10, 380);
    ctx.lineTo(0, 330);
    ctx.lineTo(-10, 380);
    ctx.closePath();

    // Fallback texture must still be the required black silhouette cutout.
    ctx.fillStyle = "#060606";
    ctx.fill();

    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 2;
    tex.needsUpdate = true;
    return tex;
  }

  function loadBigfootSilhouetteTexture(onReady) {
    const loader = new THREE.TextureLoader();
    const finalize = (tex) => {
      tex.anisotropy = 2;
      tex.needsUpdate = true;
      onReady(tex);
    };

    const loadTexture = (src, onError) => {
      loader.load(
        src,
        (tex) => {
          finalize(tex);
        },
        undefined,
        () => {
          onError();
        }
      );
    };

    const diskPngSrc = `bigfoot-silhouette.png?v=${BUILD_ID}`;
    const embeddedSrc = window.BIGFOOT_SIL_DATA || null;

    loadTexture(diskPngSrc, () => {
      if (embeddedSrc) {
        loadTexture(embeddedSrc, () => onReady(createBigfootCutoutTexture()));
      } else {
        onReady(createBigfootCutoutTexture());
      }
    });
  }

  class UIManager {
    constructor() {
      this.messageTimer = 0;
      this.breachTimer = 0;
      this.hitTimer = 0;
    }

    setMessage(text, duration = 2.5) {
      DOM.message.textContent = text;
      this.messageTimer = duration;
    }

    setBreachWarning(text, duration = 2.4) {
      DOM.breachWarning.textContent = text;
      this.breachTimer = duration;
    }

    flashHit(duration = 0.1) {
      this.hitTimer = Math.max(this.hitTimer, duration);
    }

    update(game, dt) {
      DOM.wave.textContent = `Wave ${game.waveManager.wave}`;
      DOM.enemies.textContent = `Enemies: ${game.waveManager.getEnemiesRemaining()}`;
      DOM.score.textContent = `Total: ${game.getRoundTotal()}`;
      if (DOM.highScore) {
        DOM.highScore.textContent = `High: ${game.highScoreTotal}`;
      }
      DOM.kills.textContent = `Kills: ${game.kills}`;
      if (DOM.clock) {
        DOM.clock.textContent = `Time: ${formatTime(game.roundTime)}`;
      }
      DOM.health.textContent = `Health: ${Math.max(0, Math.floor(game.player.health))}`;

      const weapon = game.player.weapon;
      DOM.ammo.textContent = `Ammo: ${weapon.loadedAmmo} / ${weapon.reserveAmmo}`;

      DOM.reload.classList.remove("reloading", "empty");
      if (weapon.isReloading) {
        const pct = Math.floor((weapon.reloadProgress / weapon.reloadTime) * 100);
        DOM.reload.textContent = `Reloading ${pct}%`;
        DOM.reload.classList.add("reloading");
      } else if (weapon.loadedAmmo <= 0 && weapon.reserveAmmo <= 0) {
        DOM.reload.textContent = "Out of Powder";
        DOM.reload.classList.add("empty");
      } else if (weapon.loadedAmmo <= 0) {
        DOM.reload.textContent = "Press R to Reload";
        DOM.reload.classList.add("empty");
      } else {
        DOM.reload.textContent = "Ready";
      }

      DOM.fort.textContent = `Fort Integrity: ${Math.floor(game.getFortIntegrity() * 100)}%`;
      if (DOM.rebuildStatus) {
        if (game.rebuildCooldown > 0) {
          DOM.rebuildStatus.textContent = `Rebuild: ${Math.ceil(game.rebuildCooldown)}s`;
        } else if (game.score < CONFIG.rebuild.scoreCost) {
          DOM.rebuildStatus.textContent = `Rebuild: Need ${CONFIG.rebuild.scoreCost} score (B)`;
        } else {
          DOM.rebuildStatus.textContent = "Rebuild: Ready (B)";
        }
      }

      this.messageTimer -= dt;
      if (this.messageTimer <= 0) {
        DOM.message.textContent = "";
      }

      this.breachTimer -= dt;
      if (this.breachTimer <= 0) {
        DOM.breachWarning.textContent = "";
      }

      this.hitTimer = Math.max(0, this.hitTimer - dt);
      if (DOM.hitMarker) {
        DOM.hitMarker.style.opacity = this.hitTimer > 0 ? "1" : "0";
      }
    }

    showStart(show, mode = "start") {
      if (show) {
        if (mode === "pause") {
          if (DOM.overlayTitle) DOM.overlayTitle.textContent = "Paused";
          if (DOM.overlayDescription) DOM.overlayDescription.textContent = "Hold the fort. Resume or restart the round.";
          if (DOM.startButton) DOM.startButton.textContent = "Resume";
          if (DOM.pauseRestartButton) DOM.pauseRestartButton.classList.remove("hidden");
        } else {
          if (DOM.overlayTitle) DOM.overlayTitle.textContent = "Fort McIntosh: Bigfoot Siege";
          if (DOM.overlayDescription) {
            DOM.overlayDescription.textContent =
              "Stylized 1780 frontier-fort survival prototype. Defend the fort from wooden Bigfoot cutout attackers.";
          }
          if (DOM.startButton) DOM.startButton.textContent = "Click To Muster At The Fort";
          if (DOM.pauseRestartButton) DOM.pauseRestartButton.classList.add("hidden");
        }
      }
      DOM.startOverlay.classList.toggle("visible", show);
    }

    showGameOver(game) {
      DOM.gameOverSummary.textContent =
        `Final Wave: ${game.waveManager.wave} | Kills: ${game.kills} | Total: ${game.getRoundTotal()} | ` +
        `High: ${game.highScoreTotal} | Time: ${formatTime(game.roundTime)}`;
      DOM.gameOverOverlay.classList.add("visible");
    }

    hideGameOver() {
      DOM.gameOverOverlay.classList.remove("visible");
    }
  }

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.master = null;
    }

    ensureContext() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.18;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    tone(freq, duration, type = "sine", volume = 0.4, attack = 0.005, decay = 0.2) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now);
      osc.stop(now + duration);
    }

    noise(duration, volume = 0.25) {
      if (!this.ctx) return;
      const sampleCount = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(this.master);
      src.start();
    }

    shot() {
      this.ensureContext();
      this.tone(110, 0.16, "square", 0.22, 0.004, 0.13);
      this.noise(0.18, 0.2);
    }

    reload() {
      this.ensureContext();
      this.tone(360, 0.09, "triangle", 0.12, 0.002, 0.06);
      setTimeout(() => this.tone(250, 0.11, "triangle", 0.1, 0.002, 0.09), 120);
    }

    click() {
      this.ensureContext();
      this.tone(180, 0.05, "square", 0.09, 0.002, 0.04);
    }

    wallHit() {
      this.ensureContext();
      this.tone(90, 0.08, "triangle", 0.08, 0.002, 0.05);
      this.noise(0.06, 0.06);
    }

    breach() {
      this.ensureContext();
      this.noise(0.28, 0.24);
      this.tone(70, 0.28, "sawtooth", 0.14, 0.002, 0.22);
    }

    enemyBreak() {
      this.ensureContext();
      this.noise(0.12, 0.18);
      this.tone(140, 0.08, "square", 0.07, 0.001, 0.05);
    }
  }

  class InputManager {
    constructor(game) {
      this.game = game;
      this.keys = Object.create(null);
      this.locked = false;

      document.addEventListener("keydown", (event) => {
        this.keys[event.code] = true;

        if (event.code === "KeyR") {
          this.game.player.weapon.startReload();
        }

        if (event.code === "KeyE") {
          this.game.tryInteract();
        }
        if (event.code === CONFIG.rebuild.key) {
          this.game.tryRebuildFort();
        }

        if (event.code === "Enter" && this.game.state === "gameover") {
          this.game.restart();
        }
      });

      document.addEventListener("keyup", (event) => {
        this.keys[event.code] = false;
      });

      document.addEventListener("mousemove", (event) => {
        if (!this.locked || this.game.state !== "playing") return;
        this.game.player.rotate(
          -event.movementX * CONFIG.player.turnSpeed,
          -event.movementY * CONFIG.player.turnSpeed
        );
      });

      document.addEventListener("mousedown", (event) => {
        if (event.button !== 0) return;
        if (this.game.state === "playing" && this.locked) {
          this.game.player.weapon.tryFire();
        }
      });

      document.addEventListener("pointerlockchange", () => {
        this.locked = document.pointerLockElement === this.game.renderer.domElement;
        this.game.onPointerLockChanged(this.locked);
      });
    }

    isDown(code) {
      return !!this.keys[code];
    }

    requestLock() {
      this.game.renderer.domElement.requestPointerLock();
    }
  }

  class ParticleManager {
    constructor(scene) {
      this.scene = scene;
      this.particles = [];
    }

    spawnSmoke(position) {
      for (let i = 0; i < 7; i += 1) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(rand(0.08, 0.15), 6, 6),
          new THREE.MeshBasicMaterial({
            color: 0xc7c5bb,
            transparent: true,
            opacity: rand(0.45, 0.7),
          })
        );
        mesh.position.copy(position);
        mesh.position.x += rand(-0.08, 0.08);
        mesh.position.y += rand(-0.08, 0.08);
        mesh.position.z += rand(-0.08, 0.08);
        this.scene.add(mesh);

        this.particles.push({
          mesh,
          velocity: new THREE.Vector3(rand(-0.2, 0.2), rand(0.3, 0.7), rand(-0.2, 0.2)),
          life: rand(0.45, 0.8),
          maxLife: rand(0.45, 0.8),
          growth: rand(1.8, 2.6),
        });
      }
    }

    spawnSplinters(position, count = 10) {
      for (let i = 0; i < count; i += 1) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(rand(0.06, 0.14), rand(0.03, 0.08), rand(0.03, 0.09)),
          new THREE.MeshStandardMaterial({ color: 0x6f4a27, roughness: 0.95, metalness: 0.01 })
        );
        mesh.position.copy(position);
        this.scene.add(mesh);

        this.particles.push({
          mesh,
          velocity: new THREE.Vector3(rand(-2.2, 2.2), rand(0.9, 2.8), rand(-2.2, 2.2)),
          life: rand(0.7, 1.5),
          maxLife: rand(0.7, 1.5),
          growth: 0,
        });
      }
    }

    spawnMuzzleFlash(position) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd077, transparent: true, opacity: 1 })
      );
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(0, 0.4, 0),
        life: 0.08,
        maxLife: 0.08,
        growth: 2.5,
      });
    }

    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i -= 1) {
        const p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.particles.splice(i, 1);
          continue;
        }

        p.velocity.y -= 3.4 * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        if (p.growth > 0) {
          p.mesh.scale.addScalar(p.growth * dt);
        }

        if (p.mesh.material.transparent) {
          p.mesh.material.opacity = clamp(p.life / p.maxLife, 0, 1);
        }
      }
    }

    clear() {
      for (const p of this.particles) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
      this.particles.length = 0;
    }
  }

  class DestructibleWall {
    constructor(game, start, end, options = {}) {
      this.game = game;
      this.start = start.clone();
      this.end = end.clone();
      this.isGate = !!options.isGate;
      this.healthMax = options.health || CONFIG.walls.segmentHealth;
      this.health = this.healthMax;
      this.breached = false;
      this.name = options.name || "Wall";
      this.targetBias = options.targetBias || 1;

      this.group = new THREE.Group();
      this.intactGroup = new THREE.Group();
      this.brokenGroup = new THREE.Group();

      this.length = this.start.distanceTo(this.end);
      this.center = this.start.clone().add(this.end).multiplyScalar(0.5);
      this.angle = Math.atan2(this.end.z - this.start.z, this.end.x - this.start.x);
      this.tangent = this.end.clone().sub(this.start).normalize();

      const logTexture = game.assets.logTexture;
      const timberHeight = 0.34;
      const timberDepth = 0.9;
      const logMaterial = new THREE.MeshStandardMaterial({
        map: logTexture,
        color: this.isGate ? 0x7b5937 : 0x6e4a2a,
        roughness: 0.9,
        metalness: 0.02,
      });
      const braceMaterial = new THREE.MeshStandardMaterial({
        map: logTexture,
        color: 0x5f3f24,
        roughness: 0.95,
      });

      const chinkMaterial = new THREE.MeshStandardMaterial({
        color: 0xa48a63,
        roughness: 1,
        metalness: 0,
      });

      const addCourse = (fromDist, toDist, y, jitter = 0) => {
        const segLen = Math.max(0.6, toDist - fromDist);
        const midDist = (fromDist + toDist) * 0.5;
        const pos = this.start.clone().addScaledVector(this.tangent, midDist);
        const timber = new THREE.Mesh(
          new THREE.BoxGeometry(segLen, timberHeight * 0.86, timberDepth + rand(-0.06, 0.06)),
          logMaterial
        );
        timber.position.set(pos.x, y, pos.z);
        timber.rotation.y = -this.angle;
        timber.rotation.z = jitter;
        timber.castShadow = true;
        timber.receiveShadow = true;
        this.intactGroup.add(timber);

        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(segLen * 0.98, timberHeight * 0.2, timberDepth * 0.88),
          chinkMaterial
        );
        seam.position.set(pos.x, y - timberHeight * 0.53, pos.z);
        seam.rotation.y = -this.angle;
        seam.castShadow = true;
        seam.receiveShadow = true;
        this.intactGroup.add(seam);
      };

      const rowStep = timberHeight;
      const rowCount = Math.floor((CONFIG.walls.height - 0.25) / rowStep);
      for (let row = 0; row <= rowCount; row += 1) {
        const y = 0.34 + row * rowStep;
        const eyeLevel = y > 1.0 && y < 2.2;
        const edgePad = 0.3;
        if (eyeLevel && !this.isGate && this.length > 3.2) {
          // Multiple oversized gun loops for better defensive coverage.
          const slotWidth = clamp(this.length * 0.2, 1.6, 2.4);
          const postWidth = clamp(this.length * 0.08, 0.55, 0.9);
          const maxDist = this.length - edgePad;
          let cursor = edgePad;
          let solidStart = edgePad;
          while (cursor < maxDist - 0.2) {
            const slotStart = cursor;
            const slotEnd = Math.min(slotStart + slotWidth, maxDist);
            if (slotStart - solidStart > 0.22) {
              addCourse(solidStart, slotStart, y, rand(-0.02, 0.02));
            }
            solidStart = Math.min(slotEnd + postWidth, maxDist);
            cursor = solidStart;
          }
          if (maxDist - solidStart > 0.22) {
            addCourse(solidStart, maxDist, y, rand(-0.02, 0.02));
          }
        } else {
          addCourse(edgePad, this.length - edgePad, y, rand(-0.02, 0.02));
        }
      }

      // Upright end braces and periodic block-lock posts.
      const braceCount = Math.max(2, Math.floor(this.length / 4.5));
      for (let i = 0; i <= braceCount; i += 1) {
        const t = i / braceCount;
        const pos = this.start.clone().lerp(this.end, t);
        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, CONFIG.walls.height + 0.2, timberDepth + 0.14),
          braceMaterial
        );
        brace.position.set(pos.x, (CONFIG.walls.height + 0.2) * 0.5, pos.z);
        brace.rotation.y = this.angle + Math.PI * 0.5;
        brace.castShadow = true;
        brace.receiveShadow = true;
        this.intactGroup.add(brace);
      }

      for (let i = 0; i < 9; i += 1) {
        const debris = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.2, rand(0.8, 1.4), 6),
          new THREE.MeshStandardMaterial({
            map: logTexture,
            color: 0x69472a,
            roughness: 0.95,
            metalness: 0.02,
          })
        );
        debris.position.set(
          this.center.x + rand(-1.8, 1.8),
          rand(0.15, 0.6),
          this.center.z + rand(-1.8, 1.8)
        );
        debris.rotation.set(rand(-0.4, 0.4), rand(0, Math.PI), rand(-0.6, 0.6));
        debris.visible = false;
        debris.castShadow = true;
        debris.receiveShadow = true;
        this.brokenGroup.add(debris);
      }

      this.group.add(this.intactGroup);
      this.group.add(this.brokenGroup);

      this.damagePieces = [];
      for (const child of this.intactGroup.children) {
        child.userData.basePos = child.position.clone();
        child.userData.baseRotZ = child.rotation.z;
        child.userData.damageRank = Math.random();
        child.userData.drop = rand(0.02, 0.14);
        child.userData.tilt = (Math.random() < 0.5 ? -1 : 1) * rand(0.02, 0.16);
        child.userData.canHide = !this.isGate && child.geometry && child.geometry.type === "BoxGeometry";
        this.damagePieces.push(child);
      }
      this.damageStage = 0;
      this.collapseTimer = 0;
      for (const child of this.brokenGroup.children) {
        child.userData.basePos = child.position.clone();
        child.userData.baseRot = child.rotation.clone();
        child.userData.vel = new THREE.Vector3();
        child.userData.spin = new THREE.Vector3();
      }

      this.collider = new THREE.Box3();
      this.colliderMinY = -0.1;
      this.colliderMaxY = CONFIG.walls.height + 1;
      this.updateCollider();

      game.scene.add(this.group);
    }

    updateCollider() {
      const thickness = CONFIG.walls.thickness * 0.5;
      const minX = Math.min(this.start.x, this.end.x) - thickness;
      const maxX = Math.max(this.start.x, this.end.x) + thickness;
      const minZ = Math.min(this.start.z, this.end.z) - thickness;
      const maxZ = Math.max(this.start.z, this.end.z) + thickness;
      this.collider.min.set(minX, this.colliderMinY, minZ);
      this.collider.max.set(maxX, this.colliderMaxY, maxZ);
    }

    getMidpoint() {
      return this.center;
    }

    getClosestPoint(point, inset = 0) {
      const seg = new THREE.Vector3().subVectors(this.end, this.start);
      const len2 = seg.lengthSq();
      if (len2 <= 1e-6) return this.center.clone();
      const toPoint = new THREE.Vector3().subVectors(point, this.start);
      const len = Math.sqrt(len2);
      let minT = 0;
      let maxT = 1;
      if (inset > 0 && len > inset * 2) {
        const insetT = inset / len;
        minT = insetT;
        maxT = 1 - insetT;
      }
      const t = clamp(toPoint.dot(seg) / len2, minT, maxT);
      return this.start.clone().addScaledVector(seg, t);
    }

    takeDamage(amount) {
      if (this.breached) return;
      this.health = Math.max(0, this.health - amount);

      const ratio = this.health / this.healthMax;
      const damage = 1 - ratio;
      for (const child of this.damagePieces) {
        if (child.material && child.material.color) {
          child.material.color.setHex(this.isGate ? 0x7b5937 : 0x6e4a2a);
          child.material.color.offsetHSL(0, 0, -damage * 0.34);
        }

        if (child.userData.basePos) {
          child.position.copy(child.userData.basePos);
          child.rotation.z = child.userData.baseRotZ + child.userData.tilt * damage * 1.4;
          child.position.y -= child.userData.drop * damage * 2.2;
        }

        // Keep collision/visual state aligned: no pre-breach holes.
        child.visible = true;
      }

      const nextStage = ratio < 0.2 ? 3 : ratio < 0.45 ? 2 : ratio < 0.7 ? 1 : 0;
      if (nextStage > this.damageStage) {
        this.damageStage = nextStage;
        this.game.particles.spawnSplinters(this.center.clone().setY(1.3), 8 + nextStage * 4);
      }

      if (this.health <= 0) {
        this.breach();
      }
    }

    breach() {
      if (this.breached) return;
      this.breached = true;
      this.health = 0;
      this.intactGroup.visible = false;
      for (const child of this.brokenGroup.children) {
        child.visible = true;
        child.position.copy(child.userData.basePos);
        child.rotation.copy(child.userData.baseRot);
        child.userData.vel.set(rand(-1.8, 1.8), rand(1.6, 2.8), rand(-1.8, 1.8));
        child.userData.spin.set(rand(-3, 3), rand(-3, 3), rand(-3, 3));
      }
      this.collapseTimer = 1.25;

      this.game.particles.spawnSplinters(this.center.clone().setY(1.2), 14);
      this.game.audio.breach();
      this.game.ui.setBreachWarning(`${this.name} breached!`, 3.4);
      this.game.onWallBreached(this);
    }

    restoreFull() {
      this.health = this.healthMax;
      this.breached = false;
      this.damageStage = 0;
      this.collapseTimer = 0;
      this.intactGroup.visible = true;
      for (const child of this.brokenGroup.children) {
        child.visible = false;
        if (child.userData.basePos) {
          child.position.copy(child.userData.basePos);
          child.rotation.copy(child.userData.baseRot);
        }
      }
      for (const child of this.damagePieces) {
        if (child.material && child.material.color) {
          child.material.color.setHex(this.isGate ? 0x7b5937 : 0x6e4a2a);
        }
        if (child.userData.basePos) {
          child.position.copy(child.userData.basePos);
          child.rotation.z = child.userData.baseRotZ;
        }
        child.visible = true;
      }
    }

    update(dt) {
      if (!this.breached || this.collapseTimer <= 0) return;
      this.collapseTimer -= dt;
      for (const child of this.brokenGroup.children) {
        if (!child.visible) continue;
        child.userData.vel.y -= 5.4 * dt;
        child.position.addScaledVector(child.userData.vel, dt);
        child.rotation.x += child.userData.spin.x * dt;
        child.rotation.y += child.userData.spin.y * dt;
        child.rotation.z += child.userData.spin.z * dt;
        if (child.position.y < 0.14) {
          child.position.y = 0.14;
          child.userData.vel.y *= -0.2;
          child.userData.vel.x *= 0.78;
          child.userData.vel.z *= 0.78;
          child.userData.spin.multiplyScalar(0.82);
        }
      }
    }

    repair(amount) {
      if (this.breached) return false;
      if (this.health >= this.healthMax) return false;
      this.health = clamp(this.health + amount, 0, this.healthMax);
      return true;
    }

    isIntact() {
      return !this.breached;
    }
  }

  class AmmoPickup {
    constructor(game, position) {
      this.game = game;
      this.position = position.clone();
      this.available = true;
      this.respawnTimer = 0;

      this.group = new THREE.Group();

      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.8, 1.1),
        new THREE.MeshStandardMaterial({
          map: game.assets.logTexture,
          color: 0x7d5a35,
          roughness: 0.9,
        })
      );
      crate.position.y = 0.4;
      crate.castShadow = true;
      crate.receiveShadow = true;
      this.group.add(crate);

      const strap = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3b2a1b, roughness: 1 })
      );
      strap.position.set(0, 0.82, 0);
      this.group.add(strap);

      this.group.position.copy(this.position);
      game.scene.add(this.group);
    }

    tryCollect(player) {
      if (!this.available) return false;
      const d = distXZ(this.position, player.getPosition());
      if (d > CONFIG.pickups.interactRange) return false;

      const added = player.weapon.addReserveAmmo(CONFIG.pickups.ammoAmount);
      if (!added) return false;

      this.available = false;
      this.respawnTimer = CONFIG.pickups.respawnSeconds;
      this.group.visible = false;
      this.game.ui.setMessage(`Collected ${CONFIG.pickups.ammoAmount} musket cartridges`, 2);
      this.game.audio.reload();
      return true;
    }

    update(dt) {
      if (this.available) return;
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.available = true;
        this.group.visible = true;
      }
    }
  }

  class EnemyCutout {
    constructor(game, position, stats) {
      this.game = game;
      this.position = position.clone();
      this.health = stats.health;
      this.maxHealth = stats.health;
      this.speed = stats.speed;
      this.attackDamage = stats.attackDamage;
      this.attackCooldown = stats.attackCooldown;
      this.scoreValue = stats.scoreValue;
      this.isBrute = !!stats.isBrute;
      this.dead = false;
      this.attackTimer = rand(0, 0.6);
      this.wobbleSeed = Math.random() * Math.PI * 2;
      this.hitFlash = 0;
      this.stuckTimer = 0;

      this.group = new THREE.Group();

      const cutoutMaterial = new THREE.MeshStandardMaterial({
        map: game.assets.bigfootTexture,
        transparent: true,
        alphaTest: 0.45,
        side: THREE.DoubleSide,
        roughness: 0.94,
        metalness: 0.02,
      });

      // Keep silhouette proportions readable (avoid stretched/tall look).
      const h = this.isBrute ? 4.6 : 3.95;
      const w = this.isBrute ? 3.55 : 3.0;

      this.cutoutMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cutoutMaterial);
      this.cutoutMesh.position.y = h * 0.5;
      this.cutoutMesh.castShadow = true;
      this.cutoutMesh.userData.enemy = this;
      this.group.add(this.cutoutMesh);

      this.group.position.copy(this.position);
      this.group.rotation.y = rand(0, Math.PI * 2);
      game.scene.add(this.group);

      this.spawnedAfterBreach = game.hasAnyBreach();
      this.targetWall = this.game.getNearestIntactWall(this.group.position);
    }

    retargetWall(force = false) {
      if (force || this.spawnedAfterBreach || !this.targetWall) {
        this.targetWall = this.game.getNearestIntactWall(this.group.position);
      }
    }

    getCenter() {
      const center = new THREE.Vector3();
      this.cutoutMesh.getWorldPosition(center);
      return center;
    }

    takeDamage(amount) {
      if (this.dead) return;
      this.health -= amount;
      this.hitFlash = 0.12;

      if (this.health <= 0) {
        this.die();
      }
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      this.game.particles.spawnSplinters(this.group.position.clone().setY(1.5), this.isBrute ? 16 : 12);
      this.game.audio.enemyBreak();
      this.game.scene.remove(this.group);
      this.game.onEnemyKilled(this);
    }

    update(dt) {
      if (this.dead) return;

      this.hitFlash -= dt;
      if (this.cutoutMesh.material && this.cutoutMesh.material.color) {
        if (this.hitFlash > 0) {
          this.cutoutMesh.material.color.setHex(0xffc3a6);
        } else {
          this.cutoutMesh.material.color.setHex(0xffffff);
        }
      }

      const wobble = Math.sin(this.game.elapsed * 4.5 + this.wobbleSeed) * 0.08;
      this.cutoutMesh.rotation.z = wobble;

      const playerPos = this.game.player.getPosition();
      const prev = this.group.position.clone();
      let attemptedMove = false;
      let inBreachRoute = false;
      let activeBreachWall = null;

      if (!this.targetWall) {
        this.retargetWall(true);
      }

      const committedWallIntact = !!(this.targetWall && !this.targetWall.breached);
      if (committedWallIntact) {
        const target = this.targetWall.getClosestPoint(this.group.position, 1.3);
        const dir = new THREE.Vector3(target.x - this.group.position.x, 0, target.z - this.group.position.z);
        const distance = dir.length();
        const attackReach = 3.5;
        if (distance > attackReach) {
          dir.normalize();
          const wanted = this.group.position.clone().addScaledVector(dir, this.speed * dt);
          const resolved = this.game.resolveEnemyPosition(this.group.position, wanted, CONFIG.enemy.radius);
          this.group.position.copy(resolved);
          this.group.rotation.y = Math.atan2(dir.x, dir.z);
          attemptedMove = true;
        } else {
          this.attackTimer -= dt;
          if (this.attackTimer <= 0) {
            this.attackTimer = this.attackCooldown * rand(0.9, 1.1);
            this.targetWall.takeDamage(this.attackDamage);
            this.game.audio.wallHit();
            this.game.particles.spawnSplinters(target.clone().setY(1.4), 4);
          }
        }
      } else {
        const outsideFort = !this.game.isInsideFortXZ(this.group.position.x, this.group.position.z);
        let chaseTarget = playerPos;
        let breachPoint = null;
        let breachWall = null;
        if (outsideFort || this.spawnedAfterBreach) {
          breachWall =
            (this.targetWall && this.targetWall.breached ? this.targetWall : null) ||
            this.game.getNearestBreachedWall(this.group.position);
          if (!breachWall && this.spawnedAfterBreach) {
            this.retargetWall(true);
          }
        }
        let handledWallAssault = false;
        if (!breachWall && this.targetWall && !this.targetWall.breached) {
          const target = this.targetWall.getClosestPoint(this.group.position, 1.3);
          const dir = new THREE.Vector3(target.x - this.group.position.x, 0, target.z - this.group.position.z);
          const distance = dir.length();
          const attackReach = 3.5;
          if (distance > attackReach) {
            dir.normalize();
            const wanted = this.group.position.clone().addScaledVector(dir, this.speed * dt);
            const resolved = this.game.resolveEnemyPosition(this.group.position, wanted, CONFIG.enemy.radius);
            this.group.position.copy(resolved);
            this.group.rotation.y = Math.atan2(dir.x, dir.z);
            attemptedMove = true;
          } else {
            this.attackTimer -= dt;
            if (this.attackTimer <= 0) {
              this.attackTimer = this.attackCooldown * rand(0.9, 1.1);
              this.targetWall.takeDamage(this.attackDamage);
              this.game.audio.wallHit();
              this.game.particles.spawnSplinters(target.clone().setY(1.4), 4);
            }
          }
          handledWallAssault = true;
        }
        if (!handledWallAssault) {
          if (outsideFort && breachWall) {
            breachPoint = breachWall.getClosestPoint(this.group.position);
            if (breachPoint) chaseTarget = breachPoint;
          }
          if (breachWall) {
            inBreachRoute = true;
            activeBreachWall = breachWall;
          }

          const dir = new THREE.Vector3(
            chaseTarget.x - this.group.position.x,
            0,
            chaseTarget.z - this.group.position.z
          );
          const distance = dir.length();
          if (distance > 0.01) {
            dir.normalize();
            const wanted = this.group.position.clone().addScaledVector(dir, this.speed * 1.14 * dt);
            const resolved = this.game.resolveEnemyPosition(this.group.position, wanted, CONFIG.enemy.radius, {
              breachPoint,
              breachWall,
            });
            this.group.position.copy(resolved);
            this.group.rotation.y = Math.atan2(dir.x, dir.z);
            attemptedMove = true;
          }

          // If we're right on a breach while still outside, force a clean entry.
          if (outsideFort && breachWall && breachPoint && distXZ(this.group.position, breachPoint) < 3.0) {
            const breachMid = breachWall.getMidpoint();
            const intoFort = this.game.fortCentroid
              ? new THREE.Vector3(
                  this.game.fortCentroid.x - breachMid.x,
                  0,
                  this.game.fortCentroid.z - breachMid.z
                )
              : new THREE.Vector3(
                  playerPos.x - breachPoint.x,
                  0,
                  playerPos.z - breachPoint.z
                );
            if (intoFort.lengthSq() < 0.001) {
              intoFort.set(0, 0, -1);
            } else {
              intoFort.normalize();
            }
            const tangent = new THREE.Vector3().subVectors(breachWall.end, breachWall.start).normalize();
            const offset = rand(-0.9, 0.9);
            this.group.position.set(
              breachMid.x + intoFort.x * 2.4 + tangent.x * offset,
              0,
              breachMid.z + intoFort.z * 2.4 + tangent.z * offset
            );
          }
        }
      }

      // Unjam logic for enemies stuck on geometry after breaches.
      if (attemptedMove) {
        const moved = prev.distanceTo(this.group.position);
        if (moved < 0.02) {
          this.stuckTimer += dt;
          if (this.stuckTimer > CONFIG.enemy.stuckUnjamSeconds) {
            this.stuckTimer = 0;
            if (inBreachRoute) {
              const breachWall = activeBreachWall || this.game.getNearestBreachedWall(this.group.position);
              if (breachWall) {
                const breachMid = breachWall.getMidpoint();
                const nudge = new THREE.Vector3(
                  playerPos.x - breachMid.x,
                  0,
                  playerPos.z - breachMid.z
                );
                if (nudge.lengthSq() < 0.001) {
                  nudge.set(rand(-1, 1), 0, rand(-1, 1));
                }
                nudge.normalize();
                this.group.position.set(
                  breachMid.x + nudge.x * 2.0,
                  0,
                  breachMid.z + nudge.z * 2.0
                );
              } else {
                this.group.position.x += rand(-1.0, 1.0);
                this.group.position.z += rand(-1.0, 1.0);
              }
            } else {
              this.group.position.x += rand(-1.0, 1.0);
              this.group.position.z += rand(-1.0, 1.0);
            }
          }
        } else {
          this.stuckTimer = Math.max(0, this.stuckTimer - dt * 2);
        }
      }

      const dFort = this.group.position.length();
      if (!Number.isFinite(dFort) || dFort > CONFIG.enemy.maxDistanceFromFort || this.group.position.y < -4) {
        const fallback =
          (this.targetWall ? this.targetWall.getClosestPoint(this.group.position, 1.3) : null) ||
          this.game.getNearestBreachPoint(this.group.position) ||
          (this.targetWall ? this.targetWall.getMidpoint() : this.game.getSpawnPoint());
        this.group.position.set(fallback.x + rand(-0.6, 0.6), 0, fallback.z + rand(-0.6, 0.6));
        this.stuckTimer = 0;
        this.retargetWall(true);
      }

      if (distXZ(this.group.position, playerPos) < 1.25) {
        this.game.player.takeDamage(999);
      }
    }
  }

  class WaveManager {
    constructor(game) {
      this.game = game;
      this.wave = 0;
      this.state = "countdown";
      this.countdown = CONFIG.wave.startDelay;
      this.toSpawn = 0;
      this.spawnTimer = 0;
      this.spawnInterval = CONFIG.wave.spawnIntervalBase;
      this.currentStats = null;
      this.postSpawnTimer = 0;
    }

    reset() {
      this.wave = 0;
      this.state = "countdown";
      this.countdown = CONFIG.wave.startDelay;
      this.toSpawn = 0;
      this.spawnTimer = 0;
      this.spawnInterval = CONFIG.wave.spawnIntervalBase;
      this.currentStats = null;
      this.postSpawnTimer = 0;
    }

    startNextWave() {
      this.wave += 1;
      const count = CONFIG.wave.baseCount + (this.wave - 1) * CONFIG.wave.countGrowth + Math.floor(this.wave * 0.9);
      const health = CONFIG.wave.baseEnemyHealth * (1 + CONFIG.wave.enemyHealthGrowth * (this.wave - 1));
      const speed = CONFIG.wave.baseEnemySpeed * (1 + CONFIG.wave.enemySpeedGrowth * (this.wave - 1));
      this.spawnInterval = Math.max(
        CONFIG.wave.spawnIntervalMin,
        CONFIG.wave.spawnIntervalBase - this.wave * 0.06
      );

      this.toSpawn = count;
      this.spawnTimer = 0.4;
      this.state = "spawning";
      this.postSpawnTimer = 0;
      this.currentStats = {
        health,
        speed,
        attackDamage: CONFIG.wave.attackDamage * (1 + (this.wave - 1) * 0.08),
        attackCooldown: Math.max(0.55, CONFIG.wave.attackCooldown - (this.wave - 1) * 0.03),
      };

      this.game.ui.setMessage(`Wave ${this.wave} begins`, 2.6);
    }

    getEnemiesRemaining() {
      return this.toSpawn + this.game.enemies.length;
    }

    update(dt) {
      if (this.game.state !== "playing") return;
      if (this.game.introActive) return;

      if (!this.game.bigfootTextureReady) {
        this.game.ui.setMessage("Preparing Bigfoot cutouts...", 0.3);
        return;
      }

      if (this.state === "countdown") {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.startNextWave();
        }
        return;
      }

      if (this.state === "spawning") {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.toSpawn > 0) {
          this.spawnEnemy();
          this.toSpawn -= 1;
          this.spawnTimer = this.spawnInterval * rand(0.84, 1.2);
        }

        if (this.toSpawn <= 0) {
          if (this.game.enemies.length === 0) {
            this.state = "intermission";
            this.countdown = CONFIG.wave.intermission;
            this.game.ui.setMessage("Wave complete. Repair and rearm.", 3.2);
          } else {
            this.postSpawnTimer += dt;
            // Prevent idle wins: if defenders do nothing, attackers force a breach.
            if (this.postSpawnTimer > 22 && !this.game.hasAnyBreach()) {
              let chosen = null;
              let best = -Infinity;
              for (const wall of this.game.walls) {
                if (wall.breached) continue;
                if (wall.health > best) {
                  best = wall.health;
                  chosen = wall;
                }
              }
              if (chosen) {
                chosen.breach();
                this.game.ui.setBreachWarning("Attackers forced a breach!", 3.1);
              }
              this.postSpawnTimer = 0;
            }
          }
        }
        return;
      }

      if (this.state === "intermission") {
        this.countdown -= dt;
        if (this.countdown <= 0) {
          this.startNextWave();
        }
      }
    }

    spawnEnemy() {
      const spawnPos = this.game.getSpawnPoint();
      const isBrute = this.wave % CONFIG.wave.bruteEvery === 0 && Math.random() < 0.26;
      const stats = {
        health: this.currentStats.health * (isBrute ? 1.9 : 1),
        speed: this.currentStats.speed * (isBrute ? 0.78 : 1),
        attackDamage: this.currentStats.attackDamage * (isBrute ? 1.5 : 1),
        attackCooldown: this.currentStats.attackCooldown * (isBrute ? 0.95 : 1),
        scoreValue: isBrute ? 70 : 35,
        isBrute,
      };
      const enemy = new EnemyCutout(this.game, spawnPos, stats);
      this.game.enemies.push(enemy);
    }
  }

  class FlintlockWeapon {
    constructor(game, player) {
      this.game = game;
      this.player = player;
      this.loadedAmmo = CONFIG.weapon.clipSize;
      this.reserveAmmo = CONFIG.weapon.reserveAmmo;
      this.isReloading = false;
      this.reloadTime = CONFIG.weapon.reloadSeconds;
      this.reloadProgress = 0;
      this.cooldown = 0;
      this.pendingShot = false;
      this.pendingTimer = 0;
      this.queuedReload = false;

      this.model = this.createViewModel();
      this.player.camera.add(this.model);
      this.baseWeaponPos = this.model.position.clone();
      this.baseWeaponRot = this.model.rotation.clone();

      this.raycaster = new THREE.Raycaster();
      this.raycaster.far = CONFIG.weapon.range;
    }

    createViewModel() {
      const group = new THREE.Group();

      const woodMat = new THREE.MeshStandardMaterial({
        map: this.game.assets.logTexture,
        color: 0x7a542f,
        roughness: 0.84,
        metalness: 0.02,
      });
      const metalMat = new THREE.MeshStandardMaterial({
        color: 0x8d9197,
        roughness: 0.35,
        metalness: 0.8,
      });

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.76), woodMat);
      stock.position.set(0.04, -0.08, -0.4);
      group.add(stock);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, 0.72, 10), metalMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0.02, -0.03, -0.65);
      group.add(barrel);

      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.11), metalMat);
      lock.position.set(0.09, -0.045, -0.43);
      group.add(lock);

      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.18), woodMat);
      butt.position.set(0.05, -0.09, -0.18);
      group.add(butt);

      const fore = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.07, 0.35), woodMat);
      fore.position.set(0.03, -0.045, -0.66);
      group.add(fore);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 6, 10), metalMat);
      ring.position.set(0.02, -0.032, -0.32);
      ring.rotation.x = Math.PI * 0.5;
      group.add(ring);

      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.045, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x7f6b50, roughness: 0.98, metalness: 0.01 })
      );
      cloth.position.set(0.075, -0.05, -0.48);
      group.add(cloth);

      this.ramrod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6), metalMat);
      this.ramrod.rotation.x = Math.PI * 0.5;
      this.ramrod.position.set(0.03, -0.02, -0.88);
      group.add(this.ramrod);

      group.position.set(0.34, -0.34, -0.55);
      group.rotation.y = -0.15;
      return group;
    }

    reset() {
      this.loadedAmmo = CONFIG.weapon.clipSize;
      this.reserveAmmo = CONFIG.weapon.reserveAmmo;
      this.isReloading = false;
      this.reloadProgress = 0;
      this.cooldown = 0;
      this.pendingShot = false;
      this.pendingTimer = 0;
      this.queuedReload = false;
      this.model.position.copy(this.baseWeaponPos);
      this.model.rotation.copy(this.baseWeaponRot);
      if (this.ramrod) {
        this.ramrod.visible = false;
      }
    }

    addReserveAmmo(amount) {
      if (this.reserveAmmo >= 96) return false;
      this.reserveAmmo += amount;
      return true;
    }

    startReload() {
      if (this.isReloading) return;
      if (this.loadedAmmo >= CONFIG.weapon.clipSize) return;
      if (this.pendingShot) {
        this.queuedReload = true;
        return;
      }
      if (this.reserveAmmo <= 0) {
        this.game.audio.click();
        return;
      }
      this.isReloading = true;
      this.reloadProgress = 0;
      this.game.audio.reload();
      this.game.ui.setMessage("Reloading flintlock...", 1.3);
    }

    tryFire() {
      if (this.game.state !== "playing") return;
      if (this.pendingShot || this.cooldown > 0 || this.isReloading) return;

      if (this.loadedAmmo <= 0) {
        if (this.reserveAmmo <= 0) {
          this.game.audio.click();
          this.game.ui.setMessage("Musket empty", 1.1);
        } else {
          this.game.audio.click();
          this.game.ui.setMessage("Press R to reload", 1.1);
        }
        return;
      }

      this.pendingShot = true;
      this.pendingTimer = CONFIG.weapon.fireDelay;
      this.model.rotation.z = 0.06;
    }

    update(dt) {
      this.cooldown = Math.max(0, this.cooldown - dt);

      if (this.isReloading) {
        this.reloadProgress += dt;
        const t = clamp(this.reloadProgress / this.reloadTime, 0, 1);
        // Keep musket visible while showing a hand-loading rhythm.
        this.model.rotation.x = this.baseWeaponRot.x - 0.22 + Math.sin(t * Math.PI * 2.6) * 0.08;
        this.model.rotation.y = this.baseWeaponRot.y + 0.1;
        this.model.rotation.z = this.baseWeaponRot.z + Math.sin(t * Math.PI * 4.2) * 0.035;
        this.model.position.y = this.baseWeaponPos.y - 0.02;
        this.model.position.x = this.baseWeaponPos.x - 0.035;
        this.model.position.z = this.baseWeaponPos.z + 0.025;
        if (this.ramrod) {
          this.ramrod.visible = true;
          this.ramrod.position.z = -0.83 + Math.sin(t * Math.PI * 4) * 0.12;
        }
        if (this.reloadProgress >= this.reloadTime) {
          this.isReloading = false;
          this.model.position.copy(this.baseWeaponPos);
          this.model.rotation.copy(this.baseWeaponRot);
          if (this.ramrod) {
            this.ramrod.visible = false;
          }
          const needed = CONFIG.weapon.clipSize - this.loadedAmmo;
          const loaded = Math.min(needed, this.reserveAmmo);
          this.loadedAmmo += loaded;
          this.reserveAmmo -= loaded;
        }
      } else {
        this.model.position.lerp(this.baseWeaponPos, clamp(dt * 12, 0, 1));
        this.model.rotation.x = lerp(this.model.rotation.x, this.baseWeaponRot.x, clamp(dt * 12, 0, 1));
        this.model.rotation.y = lerp(this.model.rotation.y, this.baseWeaponRot.y, clamp(dt * 12, 0, 1));
        if (this.ramrod) {
          this.ramrod.visible = false;
        }
      }

      if (this.pendingShot) {
        this.pendingTimer -= dt;
        if (this.pendingTimer <= 0) {
          this.pendingShot = false;
          this.fireNow();
          if (this.queuedReload) {
            this.queuedReload = false;
            this.startReload();
          }
        }
      }

      this.model.rotation.z *= 0.85;
    }

    fireNow() {
      this.loadedAmmo -= 1;
      this.cooldown = CONFIG.weapon.cooldown;

      this.model.position.z += 0.06;

      const origin = new THREE.Vector3();
      this.player.camera.updateMatrixWorld(true);
      origin.setFromMatrixPosition(this.player.camera.matrixWorld);

      const aimDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion).normalize();
      const dir = aimDir.clone();
      dir.x += rand(-CONFIG.weapon.spread, CONFIG.weapon.spread);
      dir.y += rand(-CONFIG.weapon.spread * 0.75, CONFIG.weapon.spread * 0.75);
      dir.z += rand(-CONFIG.weapon.spread, CONFIG.weapon.spread);
      dir.normalize();

      this.raycaster.set(origin, dir);

      // Primary lock: nearest enemy to exact screen-center crosshair.
      let bestEnemy = null;
      let bestNdc = Infinity;
      let bestDist = Infinity;
      for (const enemy of this.game.enemies) {
        if (enemy.dead) continue;
        const center = enemy.getCenter();
        const ndc = center.clone().project(this.player.camera);
        if (ndc.z < -1 || ndc.z > 1) continue;
        const ndcDist = Math.hypot(ndc.x, ndc.y);

        const toEnemy = center.sub(origin);
        const dist = toEnemy.length();
        if (dist > CONFIG.weapon.range || dist < 0.001) continue;

        if (
          ndcDist <= CONFIG.weapon.crosshairNdcRadius &&
          (ndcDist < bestNdc || (ndcDist === bestNdc && dist < bestDist))
        ) {
          bestNdc = ndcDist;
          bestDist = dist;
          bestEnemy = enemy;
        }
      }

      // Fallback lock: generous forward cone in world space.
      if (!bestEnemy) {
        const assistCos = Math.cos(THREE.Math.degToRad(14));
        let bestDot = assistCos;
        for (const enemy of this.game.enemies) {
          if (enemy.dead) continue;
          const toEnemy = enemy.getCenter().sub(origin);
          const dist = toEnemy.length();
          if (dist > CONFIG.weapon.range || dist < 0.001) continue;
          toEnemy.normalize();
          const dot = aimDir.dot(toEnemy);
          if (dot > bestDot || (dot === bestDot && dist < bestDist)) {
            bestDot = dot;
            bestDist = dist;
            bestEnemy = enemy;
          }
        }
      }

      if (bestEnemy) {
        bestEnemy.takeDamage(CONFIG.weapon.damage);
        this.game.ui.flashHit();
      }

      this.game.audio.shot();

      const muzzleWorld = new THREE.Vector3(0.12, -0.06, -0.95).applyMatrix4(this.player.camera.matrixWorld);
      this.game.particles.spawnMuzzleFlash(muzzleWorld);
      this.game.particles.spawnSmoke(muzzleWorld);

      setTimeout(() => {
        this.model.position.z -= 0.06;
      }, 55);
    }
  }

  class Player {
    constructor(game) {
      this.game = game;
      this.health = CONFIG.player.health;
      this.repairCooldown = 0;

      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 350);
      this.yaw = 0;
      this.pitch = 0;

      this.yawObject = new THREE.Object3D();
      this.pitchObject = new THREE.Object3D();
      this.yawObject.add(this.pitchObject);
      this.pitchObject.add(this.camera);

      this.yawObject.position.set(0, CONFIG.player.eyeHeight, 0);
      game.scene.add(this.yawObject);

      this.weapon = new FlintlockWeapon(game, this);
    }

    reset() {
      this.health = CONFIG.player.health;
      this.yaw = Math.PI;
      this.pitch = 0;
      this.yawObject.position.set(0, CONFIG.player.eyeHeight, 0);
      this.yawObject.rotation.y = this.yaw;
      this.pitchObject.rotation.x = this.pitch;
      this.weapon.reset();
      this.repairCooldown = 0;
    }

    rotate(yawDelta, pitchDelta) {
      this.yaw += yawDelta;
      this.pitch = clamp(this.pitch + pitchDelta, -1.3, 1.2);
      this.yawObject.rotation.y = this.yaw;
      this.pitchObject.rotation.x = this.pitch;
    }

    getPosition() {
      return this.yawObject.position;
    }

    takeDamage(amount) {
      if (this.game.state !== "playing") return;
      this.health -= amount;
      if (this.health <= 0) {
        this.health = 0;
        this.game.gameOver("The fort line collapsed around you.");
      }
    }

    update(dt, input) {
      if (this.game.state !== "playing") return;

      const moveForward = (input.isDown("KeyW") ? 1 : 0) + (input.isDown("KeyS") ? -1 : 0);
      const moveRight = (input.isDown("KeyD") ? 1 : 0) + (input.isDown("KeyA") ? -1 : 0);

      const intent = new THREE.Vector3(moveRight, 0, moveForward);
      if (intent.lengthSq() > 0) {
        intent.normalize();

        const sprint = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
        const speed = CONFIG.player.moveSpeed * (sprint ? CONFIG.player.sprintMultiplier : 1);

        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 0.0001) {
          forward.set(0, 0, -1);
        } else {
          forward.normalize();
        }
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const worldMove = new THREE.Vector3();
        worldMove.addScaledVector(forward, intent.z);
        worldMove.addScaledVector(right, intent.x);
        worldMove.normalize();
        const next = this.yawObject.position.clone().addScaledVector(worldMove, speed * dt);
        const resolved = this.game.resolvePlayerPosition(next, CONFIG.player.radius);
        this.yawObject.position.copy(resolved);
      }

      this.repairCooldown = Math.max(0, this.repairCooldown - dt);

      this.weapon.update(dt);
    }
  }

  class Game {
    constructor() {
      this.state = "menu";
      this.elapsed = 0;
      this.score = 0;
      this.kills = 0;
      this.breachCount = 0;
      this.rebuildCooldown = 0;
      this.highScoreTotal = 0;
      this.roundTime = 0;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x1d2731);
      this.scene.fog = new THREE.Fog(0x25303a, 35, 190);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      DOM.gameContainer.appendChild(this.renderer.domElement);

      this.assets = {
        logTexture: createWoodTexture(),
        bigfootTexture: createBigfootCutoutTexture(),
        grassTexture: createGroundTexture("grass"),
        dirtTexture: createGroundTexture("dirt"),
      };
      this.bigfootTextureReady = false;

      this.ui = new UIManager();
      this.audio = new AudioManager();
      this.particles = new ParticleManager(this.scene);

      this.enemies = [];
      this.walls = [];
      this.spawnPoints = [];
      this.pickups = [];
      this.staticObstacles = [];

      this.clock = new THREE.Clock();
      this.soundtrackPrimed = false;
      this.introActive = false;
      this.introTimeouts = [];
      this.setupSoundtrack();

      this.setupLights();
      this.buildEnvironment();
      this.loadBigfootReferenceTexture();

      this.player = new Player(this);
      this.input = new InputManager(this);
      this.waveManager = new WaveManager(this);

      DOM.startButton.addEventListener("click", () => {
        this.primeSoundtrackFromGesture();
        this.input.requestLock();
        this.audio.ensureContext();
      });
      if (DOM.pauseRestartButton) {
        DOM.pauseRestartButton.addEventListener("click", () => {
          this.restart();
        });
      }

      DOM.restartButton.addEventListener("click", () => {
        this.restart();
      });

      window.addEventListener("resize", () => this.onResize());

      this.ui.showStart(true, "start");
      this.ui.hideGameOver();
      if (DOM.buildInfo) {
        DOM.buildInfo.textContent = `Build ${BUILD_ID}`;
      }
      this.animate();
    }

    setupLights() {
      const hemi = new THREE.HemisphereLight(0x8aa0bf, 0x2c271f, 0.55);
      this.scene.add(hemi);

      const moon = new THREE.DirectionalLight(0xbfcfe5, 0.58);
      moon.position.set(-26, 42, 18);
      moon.castShadow = true;
      moon.shadow.mapSize.set(2048, 2048);
      moon.shadow.camera.left = -120;
      moon.shadow.camera.right = 120;
      moon.shadow.camera.top = 120;
      moon.shadow.camera.bottom = -120;
      moon.shadow.camera.near = 1;
      moon.shadow.camera.far = 160;
      this.scene.add(moon);

      for (const pos of [
        new THREE.Vector3(-6, 3.2, -2),
        new THREE.Vector3(8, 3.2, 6),
        new THREE.Vector3(-12, 3.2, 10),
      ]) {
        const lantern = new THREE.PointLight(0xffb66d, 0.6, 18, 2);
        lantern.position.copy(pos);
        this.scene.add(lantern);
      }
    }

    addSkyDome() {
      const skyGeo = new THREE.SphereGeometry(220, 24, 16);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x7f9bc3) },
          horizonColor: { value: new THREE.Color(0xc8b98f) },
          bottomColor: { value: new THREE.Color(0x24303b) },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorld = worldPos.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 horizonColor;
          uniform vec3 bottomColor;
          varying vec3 vWorld;
          void main() {
            float h = normalize(vWorld).y * 0.5 + 0.5;
            vec3 col = mix(bottomColor, horizonColor, smoothstep(0.05, 0.45, h));
            col = mix(col, topColor, smoothstep(0.45, 0.95, h));
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      const sky = new THREE.Mesh(skyGeo, skyMat);
      sky.position.y = 10;
      this.scene.add(sky);
    }

    loadBigfootReferenceTexture() {
      let fallbackApplied = false;
      const applyTexture = (tex) => {
        this.assets.bigfootTexture = tex;
        this.bigfootTextureReady = true;
        for (const enemy of this.enemies) {
          if (enemy.cutoutMesh && enemy.cutoutMesh.material) {
            enemy.cutoutMesh.material.map = tex;
            enemy.cutoutMesh.material.needsUpdate = true;
          }
        }
      };

      // Fail-safe: allow play to continue with fallback if file load fails.
      setTimeout(() => {
        if (!this.bigfootTextureReady) {
          fallbackApplied = true;
          applyTexture(createBigfootCutoutTexture());
        }
      }, 2500);

      loadBigfootSilhouetteTexture((tex) => {
        // Always prefer the silhouette texture if it eventually loads.
        if (fallbackApplied || !this.bigfootTextureReady) {
          applyTexture(tex);
          fallbackApplied = false;
        }
      });
    }

    clearIntroSequence() {
      for (const id of this.introTimeouts) {
        clearTimeout(id);
      }
      this.introTimeouts.length = 0;
      this.introActive = false;
    }

    runIntroSequence() {
      this.clearIntroSequence();
      this.introActive = true;
      this.waveManager.state = "countdown";
      this.waveManager.countdown = 999;

      const queue = [
        { at: 0, text: "Did you hear that?" },
        { at: 2200, text: "Something in the woods." },
        { at: 4400, text: "Defend the fort!" },
        { at: 6600, text: "Wave 1 begins" },
      ];

      for (const item of queue) {
        const id = setTimeout(() => {
          if (this.state !== "playing") return;
          this.ui.setMessage(item.text, 2.1);
        }, item.at);
        this.introTimeouts.push(id);
      }

      const finishId = setTimeout(() => {
        if (this.state !== "playing") return;
        this.introActive = false;
        this.waveManager.state = "countdown";
        this.waveManager.countdown = 0.2;
      }, 7600);
      this.introTimeouts.push(finishId);
    }

    setupSoundtrack() {
      if (!DOM.soundtrack) return;
      DOM.soundtrack.volume = 0.35;
      DOM.soundtrack.loop = true;
    }

    primeSoundtrackFromGesture() {
      if (!DOM.soundtrack || this.soundtrackPrimed) return;
      const playPromise = DOM.soundtrack.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            DOM.soundtrack.pause();
            DOM.soundtrack.currentTime = 0;
            this.soundtrackPrimed = true;
          })
          .catch(() => {
            this.soundtrackPrimed = false;
          });
      }
    }

    playSoundtrack() {
      if (!DOM.soundtrack) return;
      const playPromise = DOM.soundtrack.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.catch(() => {});
      }
    }

    pauseSoundtrack() {
      if (!DOM.soundtrack) return;
      DOM.soundtrack.pause();
    }

    buildEnvironment() {
      this.addSkyDome();
      this.buildTerrain();
      this.buildFort();
      this.buildBuildingsAndProps();
      this.buildForestBackdrop();
      this.createSpawnPoints();
    }

    buildTerrain() {
      const groundMat = new THREE.MeshStandardMaterial({
        map: this.assets.grassTexture,
        color: 0x9cab93,
        roughness: 1,
        metalness: 0,
      });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240, 20, 20), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      const river = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 120, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x3f5f78,
          roughness: 0.25,
          metalness: 0.15,
          transparent: true,
          opacity: 0.92,
        })
      );
      river.rotation.x = -Math.PI / 2;
      river.position.set(0, CONFIG.world.riverLevel, -110);
      this.scene.add(river);
      this.river = river;

      // Add a farther river shelf on the open side for stronger distance read.
      const farRiver = new THREE.Mesh(
        new THREE.PlaneGeometry(420, 92, 1, 1),
        new THREE.MeshStandardMaterial({
          color: 0x486d84,
          roughness: 0.22,
          metalness: 0.2,
          transparent: true,
          opacity: 0.94,
        })
      );
      farRiver.rotation.x = -Math.PI / 2;
      farRiver.position.set(0, CONFIG.world.riverLevel - 0.15, -182);
      this.scene.add(farRiver);
      this.farRiver = farRiver;

      const bluff = new THREE.Mesh(
        new THREE.BoxGeometry(150, CONFIG.world.bluffDrop, 80),
        new THREE.MeshStandardMaterial({ color: 0x6a5f4b, roughness: 1 })
      );
      bluff.position.set(0, -CONFIG.world.bluffDrop * 0.5, -65);
      bluff.receiveShadow = true;
      this.scene.add(bluff);

      const ditchMat = new THREE.MeshStandardMaterial({ color: 0x66563f, roughness: 1 });
      const ditchNorth = new THREE.Mesh(new THREE.BoxGeometry(82, 2.1, 7), ditchMat);
      ditchNorth.position.set(0, -0.8, 31);
      ditchNorth.receiveShadow = true;
      this.scene.add(ditchNorth);

      const ditchWest = new THREE.Mesh(new THREE.BoxGeometry(7, 2.1, 52), ditchMat);
      ditchWest.position.set(-35, -0.8, 6);
      ditchWest.receiveShadow = true;
      this.scene.add(ditchWest);

      const ditchEast = new THREE.Mesh(new THREE.BoxGeometry(7, 2.1, 52), ditchMat);
      ditchEast.position.set(35, -0.8, 4);
      ditchEast.receiveShadow = true;
      this.scene.add(ditchEast);

      // Dense treeline silhouette behind the far river on the open side.
      const southTreelineTex = createTreelineBackdropTexture(2048, 512);
      const southTreelineMat = new THREE.MeshBasicMaterial({
        map: southTreelineTex,
        transparent: true,
        opacity: 0.99,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const southPanels = [
        { x: 0, z: -230, w: 250, h: 42 },
        { x: -175, z: -206, w: 185, h: 36 },
        { x: 175, z: -206, w: 185, h: 36 },
      ];
      for (const p of southPanels) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), southTreelineMat);
        panel.position.set(p.x, 19, p.z);
        panel.lookAt(0, 18, -120);
        this.scene.add(panel);
      }

      const marker = this.createMarkerSign();
      marker.position.set(20, 0, -12);
      this.scene.add(marker);
    }

    createMarkerSign() {
      const group = new THREE.Group();

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 2.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x604029, roughness: 0.95 })
      );
      pole.position.y = 1.2;
      pole.castShadow = true;
      group.add(pole);

      const boardTexCanvas = document.createElement("canvas");
      boardTexCanvas.width = 512;
      boardTexCanvas.height = 256;
      const ctx = boardTexCanvas.getContext("2d");
      ctx.fillStyle = "#ddc998";
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#3e2d1d";
      ctx.font = "bold 32px Georgia";
      ctx.fillText("Fort McIntosh", 26, 60);
      ctx.font = "22px Georgia";
      ctx.fillText("Stylized 1778-1791 Reconstruction", 26, 98);
      ctx.fillText("Ohio River bluff side to the south", 26, 132);
      ctx.fillText("No definitive original plan survives", 26, 166);
      ctx.fillText("Design based on period descriptions", 26, 200);
      const tex = new THREE.CanvasTexture(boardTexCanvas);

      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 2.2),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 })
      );
      board.position.set(0, 2.3, 0.35);
      group.add(board);

      return group;
    }

    buildFort() {
      const points = this.getFortFootprintPoints();
      this.fortPoints = points;
      const centroid = new THREE.Vector3();
      for (const p of points) centroid.add(p);
      centroid.multiplyScalar(1 / points.length);
      this.fortCentroid = centroid;
      this.createInteriorGround(points);

      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        const edge = new THREE.Vector3().subVectors(b, a);
        const length = edge.length();
        const segments = Math.max(1, Math.round(length / 9));
        const cornerEdge = length < 10.5;
        for (let s = 0; s < segments; s += 1) {
          const t0 = s / segments;
          const t1 = (s + 1) / segments;
          const start = new THREE.Vector3(lerp(a.x, b.x, t0), 0, lerp(a.z, b.z, t0));
          const end = new THREE.Vector3(lerp(a.x, b.x, t1), 0, lerp(a.z, b.z, t1));

          // Gate/breach preference: one central segment on river-facing long curtain, plus two flank options.
          const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          const isGate = mid.z > 8 && Math.abs(mid.x) < 6;
          const isFlankBreach = mid.z > 6 && (Math.abs(mid.x) > 18 && Math.abs(mid.x) < 26);
          const edgeEndSegment = s === 0 || s === segments - 1;
          let targetBias = 1;
          if (cornerEdge) targetBias *= 0.2;
          if (edgeEndSegment && !isGate) targetBias *= 0.62;
          if (isGate) targetBias *= 1.15;
          if (isFlankBreach) targetBias *= 1.06;
          const wall = new DestructibleWall(this, start, end, {
            isGate,
            health: isGate ? CONFIG.walls.gateHealth : CONFIG.walls.segmentHealth,
            name: isGate ? "Main Gate" : isFlankBreach ? "Flank Wall" : "Fort Wall",
            targetBias,
          });
          this.walls.push(wall);
        }
      }

    }

    getFortFootprintPoints() {
      const pts = CONFIG.fort.footprint.map(([nx, nz]) => new THREE.Vector2(nx, nz));
      if (polygonArea2D(pts) > 0) {
        pts.reverse();
      }
      return pts.map(
        (p) => new THREE.Vector3(p.x * CONFIG.fort.width, 0, p.y * CONFIG.fort.depth)
      );
    }

    createInteriorGround(points3) {
      const shape = new THREE.Shape();
      const p0 = points3[0];
      shape.moveTo(p0.x, p0.z);
      for (let i = 1; i < points3.length; i += 1) {
        shape.lineTo(points3[i].x, points3[i].z);
      }
      shape.lineTo(p0.x, p0.z);

      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI * 0.5);
      const dirt = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          map: this.assets.dirtTexture,
          color: 0xb8a689,
          roughness: 1,
          metalness: 0,
        })
      );
      dirt.position.y = 0.03;
      dirt.receiveShadow = true;
      this.scene.add(dirt);
      this.interiorGround = dirt;
    }

    buildBuildingsAndProps() {
      // Intentionally open interior: no buildings or random obstacle props.
      const pickup = new AmmoPickup(this, new THREE.Vector3(0, 0, 0));
      this.pickups.push(pickup);
    }

    createLogBuilding(position, size, name) {
      const group = new THREE.Group();

      const base = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshStandardMaterial({ map: this.assets.logTexture, color: 0x6e4a2a, roughness: 0.92 })
      );
      base.position.y = size.y * 0.5;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(size.x, size.z) * 0.64, 2.3, 4),
        new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 })
      );
      roof.position.y = size.y + 1.2;
      roof.rotation.y = Math.PI * 0.25;
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);

      group.position.copy(position);
      this.scene.add(group);

      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 256;
      labelCanvas.height = 64;
      const ctx = labelCanvas.getContext("2d");
      ctx.fillStyle = "rgba(30,20,10,0.85)";
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = "#e8dcbf";
      ctx.font = "24px Georgia";
      ctx.fillText(name, 12, 40);
      const labelTex = new THREE.CanvasTexture(labelCanvas);

      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true })
      );
      label.position.set(position.x, size.y + 2.35, position.z + size.z * 0.54);
      this.scene.add(label);

      const box = new THREE.Box3(
        new THREE.Vector3(position.x - size.x * 0.5, 0, position.z - size.z * 0.5),
        new THREE.Vector3(position.x + size.x * 0.5, 4.8, position.z + size.z * 0.5)
      );
      this.staticObstacles.push(box);
    }

    addCannon(position, yaw) {
      const group = new THREE.Group();
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.32, 2.4, 12),
        new THREE.MeshStandardMaterial({ color: 0x4c4f52, roughness: 0.5, metalness: 0.7 })
      );
      barrel.rotation.z = Math.PI * 0.5;
      barrel.position.set(0, 0.45, 0);
      group.add(barrel);

      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x604226, roughness: 0.95 });
      for (const z of [-0.58, 0.58]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 8, 14), wheelMat);
        wheel.position.set(-0.45, 0.32, z);
        wheel.rotation.y = Math.PI * 0.5;
        group.add(wheel);
      }

      group.position.copy(position);
      group.rotation.y = yaw;
      this.scene.add(group);
    }

    buildForestBackdrop() {
      const treeMatA = new THREE.MeshStandardMaterial({ color: 0x2a4a2c, roughness: 1 });
      const treeMatB = new THREE.MeshStandardMaterial({ color: 0x315735, roughness: 1 });
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d24, roughness: 1 });

      for (let i = 0; i < 520; i += 1) {
        const angle = rand(0, Math.PI * 2);
        const radius = rand(84, 186);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        if (z < -74) continue;

        const trunkH = rand(2.8, 5.4);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, trunkH, 7), trunkMat);
        trunk.position.set(x, trunkH * 0.5, z);
        trunk.castShadow = true;
        trunk.rotation.z = rand(-0.03, 0.03);

        const crown1 = new THREE.Mesh(new THREE.ConeGeometry(rand(1.6, 2.5), rand(3.8, 5.6), 8), treeMatA);
        crown1.position.set(x, trunk.position.y + trunkH * 0.55 + 1.7, z);
        crown1.castShadow = true;
        const crown2 = new THREE.Mesh(new THREE.ConeGeometry(rand(1.2, 2.1), rand(3.4, 4.9), 8), treeMatB);
        crown2.position.set(x, crown1.position.y + 1.9, z);
        crown2.castShadow = true;

        this.scene.add(trunk);
        this.scene.add(crown1);
        this.scene.add(crown2);
      }

      const treelineTex = createTreelineBackdropTexture(2048, 512);
      const treelineMat = new THREE.MeshBasicMaterial({
        map: treelineTex,
        transparent: true,
        opacity: 0.98,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const panelCount = 24;
      const panelRadius = 204;
      const panelWidth = 64;
      const panelHeight = 34;
      for (let i = 0; i < panelCount; i += 1) {
        const t = (i / panelCount) * Math.PI * 2;
        const px = Math.cos(t) * panelRadius;
        const pz = Math.sin(t) * panelRadius;
        if (pz < -96) continue;
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, panelHeight), treelineMat);
        panel.position.set(px, 14, pz);
        panel.lookAt(0, 14, 0);
        this.scene.add(panel);
      }
    }

    createSpawnPoints() {
      this.spawnPoints = [];
      if (!this.fortPoints || this.fortPoints.length < 3) return;

      const centroid = new THREE.Vector3();
      for (const p of this.fortPoints) centroid.add(p);
      centroid.multiplyScalar(1 / this.fortPoints.length);

      for (let i = 0; i < this.fortPoints.length; i += 1) {
        const a = this.fortPoints[i];
        const b = this.fortPoints[(i + 1) % this.fortPoints.length];
        const rawLen = distXZ(a, b);
        if (rawLen < 10.5) continue;
        const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
        const edge = new THREE.Vector3().subVectors(b, a).normalize();
        const normalA = new THREE.Vector3(-edge.z, 0, edge.x);
        const normalB = normalA.clone().multiplyScalar(-1);
        const toCentroid = new THREE.Vector3().subVectors(centroid, mid).normalize();
        const outward = normalA.dot(toCentroid) < normalB.dot(toCentroid) ? normalA : normalB;

        const pNear = mid.clone().addScaledVector(outward, 46);
        const pFar = mid.clone().addScaledVector(outward, 68);
        if (this.isInsideFortXZ(pNear.x, pNear.z)) {
          pNear.addScaledVector(outward, -56);
        }
        if (this.isInsideFortXZ(pFar.x, pFar.z)) {
          pFar.addScaledVector(outward, -74);
        }
        this.spawnPoints.push(pNear);
        this.spawnPoints.push(pFar);
      }
    }

    isInsideFortXZ(x, z) {
      if (!this.fortPoints || this.fortPoints.length < 3) return false;
      const poly = this.fortPoints.map((p) => ({ x: p.x, y: p.z }));
      return pointInPolygon2D(x, z, poly);
    }

    getSpawnPoint() {
      const candidates = this.spawnPoints.filter((p) => distXZ(p, this.player.getPosition()) > 34);
      const pool = candidates.length ? candidates : this.spawnPoints;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const base = pool[Math.floor(Math.random() * pool.length)];
        const out = base.clone().add(new THREE.Vector3(rand(-3.5, 3.5), 0, rand(-3.5, 3.5)));
        if (!this.isInsideFortXZ(out.x, out.z)) {
          return out;
        }
      }
      return pool[0] ? pool[0].clone() : new THREE.Vector3(0, 0, 28);
    }

    getNearestIntactWall(position) {
      let chosen = null;
      let best = Infinity;
      for (const wall of this.walls) {
        if (!wall.isIntact()) continue;
        const d = distXZ(position, wall.getMidpoint());
        const score = d / Math.max(0.12, wall.targetBias || 1);
        if (score < best) {
          best = score;
          chosen = wall;
        }
      }
      return chosen;
    }

    getNearestBreachedWall(position) {
      let chosen = null;
      let best = Infinity;
      for (const wall of this.walls) {
        if (!wall.breached) continue;
        const p = wall.getClosestPoint(position);
        const d = distXZ(position, p);
        if (d < best) {
          best = d;
          chosen = wall;
        }
      }
      return chosen;
    }

    hasAnyBreach() {
      return this.walls.some((w) => w.breached);
    }

    getNearestBreachPoint(from) {
      const wall = this.getNearestBreachedWall(from);
      return wall ? wall.getClosestPoint(from) : null;
    }

    getFortIntegrity() {
      let sum = 0;
      let max = 0;
      for (const wall of this.walls) {
        sum += wall.health;
        max += wall.healthMax;
      }
      return max > 0 ? sum / max : 0;
    }

    getRoundTotal() {
      return this.waveManager.wave + this.kills;
    }

    onEnemyKilled(enemy) {
      this.removeEnemy(enemy, true, "killed");
    }

    removeEnemy(enemy, countKill = false, reason = "removed") {
      const idx = this.enemies.indexOf(enemy);
      if (idx >= 0) {
        this.enemies.splice(idx, 1);
      }
      if (enemy.group && enemy.group.parent) {
        this.scene.remove(enemy.group);
      }
      enemy.dead = true;

      if (countKill) {
        this.kills += 1;
        this.score += enemy.scoreValue;
      } else if (reason === "straggler") {
        this.ui.setMessage("A stray cutout splintered in the dark.", 1.2);
      }
    }

    onWallBreached(wall) {
      this.breachCount += 1;
      this.score = Math.max(0, this.score - 20);

      if (wall.isGate) {
        this.ui.setBreachWarning("Main gate broken. Fall back!", 4);
      }
    }

    tryInteract() {
      if (this.state !== "playing") return;

      for (const pickup of this.pickups) {
        if (pickup.tryCollect(this.player)) {
          return;
        }
      }

      if (this.player.repairCooldown > 0) return;
      const playerPos = this.player.getPosition();

      let nearestWall = null;
      let best = Infinity;
      for (const wall of this.walls) {
        if (wall.breached) continue;
        const d = distXZ(playerPos, wall.getMidpoint());
        if (d < best) {
          best = d;
          nearestWall = wall;
        }
      }

      if (nearestWall && best <= CONFIG.repair.interactRange && nearestWall.health < nearestWall.healthMax) {
        if (nearestWall.repair(CONFIG.repair.amount)) {
          this.player.repairCooldown = CONFIG.repair.cooldown;
          this.ui.setMessage("Wall repaired", 1.3);
          this.audio.reload();
        }
      }
    }

    tryRebuildFort() {
      if (this.state !== "playing") return;
      if (this.rebuildCooldown > 0) {
        this.ui.setMessage(`Rebuild crews need ${Math.ceil(this.rebuildCooldown)}s`, 1.2);
        return;
      }
      if (this.score < CONFIG.rebuild.scoreCost) {
        this.ui.setMessage(`Need ${CONFIG.rebuild.scoreCost} score to rebuild`, 1.2);
        return;
      }

      let repairedAny = false;
      for (const wall of this.walls) {
        if (wall.breached || wall.health < wall.healthMax) {
          wall.restoreFull();
          repairedAny = true;
        }
      }

      if (repairedAny) {
        for (const enemy of this.enemies) {
          enemy.retargetWall();
        }
        this.score = Math.max(0, this.score - CONFIG.rebuild.scoreCost);
        this.rebuildCooldown = CONFIG.rebuild.cooldown;
        this.ui.setMessage("Fort rebuilt. Breaches sealed.", 2.2);
      } else {
        this.ui.setMessage("Fort is already at full strength.", 1.2);
      }
    }

    resolvePlayerPosition(next, radius) {
      const result = next.clone();

      const limit = CONFIG.world.boundary;
      result.x = clamp(result.x, -limit, limit);
      result.z = clamp(result.z, -limit, limit);

      if (result.z < -33) {
        result.z = -33;
      }

      const colliders = this.getCollisionBoxes(false);

      for (const box of colliders) {
        if (
          result.x > box.min.x - radius &&
          result.x < box.max.x + radius &&
          result.z > box.min.z - radius &&
          result.z < box.max.z + radius
        ) {
          const left = Math.abs(result.x - (box.min.x - radius));
          const right = Math.abs((box.max.x + radius) - result.x);
          const top = Math.abs((box.max.z + radius) - result.z);
          const bottom = Math.abs(result.z - (box.min.z - radius));

          const m = Math.min(left, right, top, bottom);
          if (m === left) result.x = box.min.x - radius;
          else if (m === right) result.x = box.max.x + radius;
          else if (m === top) result.z = box.max.z + radius;
          else result.z = box.min.z - radius;
        }
      }

      // Wall collision as segment distance, avoids oversized AABB barriers near loopholes.
      const p = new THREE.Vector3(result.x, 0, result.z);
      const nearest = new THREE.Vector3();
      const line = new THREE.Line3();
      const minDist = radius + 0.12;
      for (const wall of this.walls) {
        if (wall.breached) continue;
        line.set(wall.start, wall.end);
        line.closestPointToPoint(p, true, nearest);
        const dx = p.x - nearest.x;
        const dz = p.z - nearest.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < minDist) {
          if (d < 1e-4) {
            const tangent = new THREE.Vector3().subVectors(wall.end, wall.start).normalize();
            result.x += -tangent.z * (minDist + 0.01);
            result.z += tangent.x * (minDist + 0.01);
          } else {
            const push = minDist - d + 0.01;
            result.x += (dx / d) * push;
            result.z += (dz / d) * push;
          }
          p.set(result.x, 0, result.z);
        }
      }

      result.y = CONFIG.player.eyeHeight;
      return result;
    }

    resolveEnemyPosition(current, next, radius, options = {}) {
      const result = next.clone();
      const limit = CONFIG.world.boundary;
      result.x = clamp(result.x, -limit, limit);
      result.z = clamp(result.z, -limit, limit);
      if (result.z < -33) {
        result.z = -33;
      }

      // Static solid obstacles only; wall handling uses segment checks for tighter collision.
      const colliders = this.getCollisionBoxes(false);

      for (const box of colliders) {
        if (
          result.x > box.min.x - radius &&
          result.x < box.max.x + radius &&
          result.z > box.min.z - radius &&
          result.z < box.max.z + radius
        ) {
          const currentOutsideX = current.x <= box.min.x - radius || current.x >= box.max.x + radius;
          const currentOutsideZ = current.z <= box.min.z - radius || current.z >= box.max.z + radius;
          if (currentOutsideX || currentOutsideZ) {
            // Slide to nearest non-penetrating edge.
            const left = Math.abs(result.x - (box.min.x - radius));
            const right = Math.abs((box.max.x + radius) - result.x);
            const top = Math.abs((box.max.z + radius) - result.z);
            const bottom = Math.abs(result.z - (box.min.z - radius));
            const m = Math.min(left, right, top, bottom);
            if (m === left) result.x = box.min.x - radius;
            else if (m === right) result.x = box.max.x + radius;
            else if (m === top) result.z = box.max.z + radius;
            else result.z = box.min.z - radius;
          } else {
            result.copy(current);
          }
        }
      }

      // Segment-based wall collision avoids oversized AABB dead-zones around breached sections.
      const breachPoint = options.breachPoint || null;
      const breachWall = options.breachWall || null;
      let skipWallCollision = false;
      if (breachWall) {
        const near = breachWall.getClosestPoint(result);
        skipWallCollision = distXZ(result, near) < 6.6;
      } else if (breachPoint) {
        skipWallCollision = distXZ(result, breachPoint) < 6.0;
      }
      if (!skipWallCollision) {
        const p = new THREE.Vector3(result.x, 0, result.z);
        const nearest = new THREE.Vector3();
        const line = new THREE.Line3();
        const minDist = radius + 0.08;
        for (const wall of this.walls) {
          if (wall.breached) continue;
          line.set(wall.start, wall.end);
          line.closestPointToPoint(p, true, nearest);
          const dx = p.x - nearest.x;
          const dz = p.z - nearest.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < minDist) {
            if (d < 1e-4) {
              const tangent = new THREE.Vector3().subVectors(wall.end, wall.start).normalize();
              result.x += -tangent.z * (minDist + 0.01);
              result.z += tangent.x * (minDist + 0.01);
            } else {
              const push = minDist - d + 0.01;
              result.x += (dx / d) * push;
              result.z += (dz / d) * push;
            }
            p.set(result.x, 0, result.z);
          }
        }
      }

      result.y = 0;
      return result;
    }

    getCollisionBoxes(includeWalls = true) {
      const boxes = [...this.staticObstacles];
      if (includeWalls) {
        for (const wall of this.walls) {
          if (!wall.breached) {
            boxes.push(wall.collider);
          }
        }
      }
      return boxes;
    }

    onPointerLockChanged(locked) {
      if (locked) {
        this.ui.showStart(false, "start");
        if (this.state === "menu") {
          this.startGame();
        } else if (this.state === "paused") {
          this.state = "playing";
          this.playSoundtrack();
          this.ui.setMessage("Back on the wall", 1.1);
        }
      } else if (this.state === "playing") {
        this.state = "paused";
        this.pauseSoundtrack();
        this.ui.showStart(true, "pause");
        this.ui.setMessage("Paused", 1.2);
      }
    }

    startGame() {
      this.state = "playing";
      this.roundTime = 0;
      this.playSoundtrack();
      this.ui.hideGameOver();
      this.runIntroSequence();
      this.audio.ensureContext();
      this.clock.start();
    }

    gameOver(reason) {
      if (this.state === "gameover") return;
      this.state = "gameover";
      this.clearIntroSequence();
      this.pauseSoundtrack();
      document.exitPointerLock();
      this.ui.showGameOver(this);
      this.ui.setBreachWarning(reason, 4);
    }

    restart() {
      for (const enemy of this.enemies) {
        this.scene.remove(enemy.group);
      }
      this.enemies.length = 0;

      for (const wall of this.walls) {
        wall.restoreFull();
      }

      for (const pickup of this.pickups) {
        pickup.available = true;
        pickup.respawnTimer = 0;
        pickup.group.visible = true;
      }

      this.particles.clear();
      this.waveManager.reset();
      this.player.reset();

      this.score = 0;
      this.kills = 0;
      this.breachCount = 0;
      this.rebuildCooldown = 0;
      this.elapsed = 0;
      this.roundTime = 0;

      this.ui.hideGameOver();
      this.ui.showStart(true, "start");
      this.clearIntroSequence();
      this.pauseSoundtrack();
      if (DOM.soundtrack) {
        DOM.soundtrack.currentTime = 0;
      }
      this.state = "menu";
    }

    update(dt) {
      if (dt > 0.05) dt = 0.05;
      const active = this.state === "playing";
      if (active) {
        this.elapsed += dt;
        this.roundTime += dt;
        this.rebuildCooldown = Math.max(0, this.rebuildCooldown - dt);

        if (this.river) {
          const c = 0.86 + Math.sin(this.elapsed * 0.6) * 0.06;
          this.river.material.color.setRGB(0.23, 0.36 * c, 0.49 * c);
          if (this.farRiver) {
            this.farRiver.material.color.setRGB(0.27, 0.42 * c, 0.53 * c);
          }
        }

        for (const pickup of this.pickups) {
          pickup.update(dt);
        }

        this.player.update(dt, this.input);
        this.waveManager.update(dt);
        for (const wall of this.walls) {
          wall.update(dt);
        }

        for (const enemy of [...this.enemies]) {
          enemy.update(dt);
        }

        this.particles.update(dt);
      }
      this.highScoreTotal = Math.max(this.highScoreTotal, this.getRoundTotal());
      this.ui.update(this, active ? dt : 0);
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      const dt = this.clock.getDelta();
      this.update(dt);
      this.renderer.render(this.scene, this.player.camera);
    }

    onResize() {
      this.player.camera.aspect = window.innerWidth / window.innerHeight;
      this.player.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  new Game();
})();
