// 主游戏入口

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new InputManager(canvas);
    this.particles = new ParticleSystem();
    this.bgParticles = new BackgroundParticleSystem(
      CONFIG.canvas.width,
      CONFIG.canvas.height,
      CONFIG.backgroundParticles.count
    );
    this.diffusionField = new DiffusionField(
      CONFIG.canvas.width,
      CONFIG.canvas.height,
      CONFIG.diffusion.gridSize
    );
    this.boidsSystem = new BoidsSystem();
    this.spatialGrid = Utils.createSpatialGrid(
      50,
      CONFIG.canvas.width,
      CONFIG.canvas.height
    );

    this.whiteBloodCells = [];
    this.viruses = [];
    this.healthCells = [];

    this.wave = 0;
    this.waveTimer = CONFIG.waves.initialDelay;
    this.gameState = 'playing';
    this.score = 0;

    this.rippleEffects = [];

    this.setupInputHandlers();
    this.init();
  }

  setupInputHandlers() {
    this.input.onDroplet = (x, y, chemokine) => this.dropChemokine(x, y, chemokine);
    this.input.onPause = () => this.togglePause();
    this.input.onRestart = () => this.restart();
    this.input.onSelectChemokine = (index) => {
      this.updateChemokineUI(index);
    };
  }

  init() {
    this.createHealthCells();
    this.createWhiteBloodCells();
    this.createInitialViruses();

    this.boidsSystem.setSpatialGrid(this.spatialGrid);
  }

  createHealthCells() {
    this.healthCells = [];
    const count = CONFIG.healthCells.count;

    for (let i = 0; i < count; i++) {
      let x, y;
      let valid = false;
      let attempts = 0;

      while (!valid && attempts < 100) {
        x = Utils.random(100, CONFIG.canvas.width - 100);
        y = Utils.random(100, CONFIG.canvas.height - 100);
        valid = true;

        for (const cell of this.healthCells) {
          const dist = Utils.vec.dist({ x, y }, { x: cell.x, y: cell.y });
          if (dist < cell.radius + CONFIG.healthCells.radius + 20) {
            valid = false;
            break;
          }
        }
        attempts++;
      }

      this.healthCells.push(new HealthCell(x, y));
    }
  }

  createWhiteBloodCells() {
    this.whiteBloodCells = [];
    this.boidsSystem.boids = [];

    const count = CONFIG.whiteBloodCells.count;

    for (let i = 0; i < count; i++) {
      const x = Utils.random(50, CONFIG.canvas.width - 50);
      const y = Utils.random(50, CONFIG.canvas.height - 50);

      const cell = new WhiteBloodCell(x, y);
      cell.setDiffusionField(this.diffusionField);

      this.whiteBloodCells.push(cell);
      this.boidsSystem.addBoid(cell);
    }
  }

  createInitialViruses() {
    this.viruses = [];
    this.wave = 1;
    this.spawnWave();
  }

  spawnWave() {
    const virusCount = CONFIG.waves.virusPerWave + Math.floor(this.wave * 1.5);

    for (let i = 0; i < virusCount; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;

      switch (side) {
        case 0:
          x = Math.random() * CONFIG.canvas.width;
          y = -20;
          break;
        case 1:
          x = CONFIG.canvas.width + 20;
          y = Math.random() * CONFIG.canvas.height;
          break;
        case 2:
          x = Math.random() * CONFIG.canvas.width;
          y = CONFIG.canvas.height + 20;
          break;
        case 3:
          x = -20;
          y = Math.random() * CONFIG.canvas.height;
          break;
      }

      const virus = new Virus(x, y);
      this.viruses.push(virus);
    }
  }

  dropChemokine(x, y, chemokine) {
    if (this.gameState !== 'playing') return;

    let amount = CONFIG.diffusion.dropAmount;
    let radius = CONFIG.diffusion.dropRadius;

    if (chemokine.id === 'alert') {
      amount *= 0.6;
      radius *= 2;
    }

    this.diffusionField.addDroplet(
      chemokine.id,
      x,
      y,
      amount,
      radius * CONFIG.diffusion.gridSize
    );

    this.rippleEffects.push({
      x,
      y,
      radius: 5,
      maxRadius: 50,
      color: chemokine.color,
      alpha: 0.8,
    });

    this.particles.emitRipple(x, y, chemokine.color, 16, 2);
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
    }
  }

  restart() {
    this.diffusionField.clear();
    this.particles.clear();
    this.rippleEffects = [];
    this.waveTimer = CONFIG.waves.initialDelay;
    this.gameState = 'playing';
    this.score = 0;

    this.createHealthCells();
    this.createWhiteBloodCells();
    this.createInitialViruses();
  }

  update() {
    if (this.gameState !== 'playing') return;

    this.bgParticles.update();
    this.diffusionField.update();
    this.particles.update();

    for (const cell of this.healthCells) {
      cell.update();
    }

    this.healthCells = this.healthCells.filter((c) => c.health > 0);

    for (const virus of this.viruses) {
      virus.update(this.healthCells);

      if (virus.state === 'replicating' && virus.hostCell && virus.hostCell.health <= 0) {
        const newViruses = virus.burst();
        if (newViruses) {
          this.viruses.push(...newViruses);
          this.particles.emitBurst(
            virus.hostCell.x,
            virus.hostCell.y,
            '#ff4444',
            20,
            3,
            4
          );
        }
      }
    }

    this.viruses = this.viruses.filter((v) => v.health > 0);

    this.spatialGrid.clear();
    for (const cell of this.whiteBloodCells) {
      this.spatialGrid.insert(cell);
    }

    this.boidsSystem.update();

    for (const cell of this.whiteBloodCells) {
      cell.update();
      cell.findNearbyVirus(this.viruses);
    }

    for (const virus of this.viruses) {
      if (virus.health <= 0) {
        this.particles.emitBurst(virus.x, virus.y, '#ff6666', 10, 2, 3);
        this.score += 10;
      }
    }

    this.updateWave();
    this.updateRippleEffects();
    this.checkGameOver();
  }

  updateWave() {
    const freeViruses = this.viruses.filter(
      (v) => v.state === 'free' || v.state === 'infecting'
    );

    if (freeViruses.length === 0 && this.viruses.length === 0) {
      this.waveTimer--;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.spawnWave();
        this.waveTimer = CONFIG.waves.waveInterval;
      }
    }
  }

  updateRippleEffects() {
    for (let i = this.rippleEffects.length - 1; i >= 0; i--) {
      const ripple = this.rippleEffects[i];
      ripple.radius += 2;
      ripple.alpha -= 0.02;

      if (ripple.alpha <= 0 || ripple.radius >= ripple.maxRadius) {
        this.rippleEffects.splice(i, 1);
      }
    }
  }

  checkGameOver() {
    const aliveCells = this.healthCells.filter((c) => c.health > 0);
    if (aliveCells.length === 0) {
      this.gameState = 'gameover';
    }

    if (this.wave > 10 && this.viruses.length === 0) {
      this.gameState = 'victory';
    }
  }

  render() {
    this.renderer.clear();
    this.renderer.drawBackgroundParticles(this.bgParticles);
    this.renderer.drawDiffusionField(this.diffusionField);

    for (const ripple of this.rippleEffects) {
      this.renderer.drawRipple(
        ripple.x,
        ripple.y,
        ripple.radius,
        ripple.color,
        ripple.alpha
      );
    }

    this.renderer.drawHealthCells(this.healthCells);
    this.renderer.drawViruses(this.viruses);
    this.renderer.drawWhiteBloodCells(this.whiteBloodCells);
    this.renderer.drawParticles(this.particles);

    if (this.input.mouseInside && this.gameState === 'playing') {
      const chemokine = this.input.getSelectedChemokine();
      const mouse = this.input.getMousePosition();
      this.renderer.drawCursor(mouse.x, mouse.y, chemokine);
    }

    if (this.gameState === 'paused') {
      this.renderer.drawPaused();
    }

    if (this.gameState === 'gameover') {
      this.renderer.drawGameOver();
    }

    if (this.gameState === 'victory') {
      this.renderer.drawVictory(this.wave);
    }

    this.updateHUD();
  }

  updateHUD() {
    const aliveCells = this.healthCells.filter((c) => c.health > 0).length;
    const freeViruses = this.viruses.filter(
      (v) => v.state === 'free' || v.state === 'infecting'
    ).length;
    const latentViruses = this.viruses.filter(
      (v) => v.state === 'latent' || v.state === 'replicating'
    ).length;

    document.getElementById('cellCount').textContent = aliveCells;
    document.getElementById('wbccCount').textContent = this.whiteBloodCells.length;
    document.getElementById('virusCount').textContent = freeViruses + latentViruses;
    document.getElementById('waveCount').textContent = this.wave;
    document.getElementById('scoreValue').textContent = this.score;
  }

  updateChemokineUI(index) {
    const buttons = document.querySelectorAll('.chemokine-btn');
    buttons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  start() {
    this.gameLoop();
  }
}

let game;

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');

  canvas.width = CONFIG.canvas.width;
  canvas.height = CONFIG.canvas.height;

  game = new Game(canvas);
  game.start();

  const chemokineBtns = document.querySelectorAll('.chemokine-btn');
  chemokineBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      game.input.selectChemokine(index);
      game.updateChemokineUI(index);
    });
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    game.togglePause();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    game.restart();
  });
});
