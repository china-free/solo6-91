// 游戏实体 - 白细胞、病毒、健康细胞

class WhiteBloodCell {
  constructor(x, y, type = 'neutrophil') {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * 0.5;
    this.vy = Math.sin(angle) * 0.5;
    this.radius = CONFIG.whiteBloodCells.radius;
    this.linearDrag = CONFIG.whiteBloodCells.linearDrag;
    this.quadraticDrag = CONFIG.whiteBloodCells.quadraticDrag;
    this.cubicDrag = CONFIG.whiteBloodCells.cubicDrag || 0;
    this.minSpeed = CONFIG.whiteBloodCells.minSpeed;
    this.thrustMultiplier = CONFIG.whiteBloodCells.thrustMultiplier;
    this.wobbleAmount = CONFIG.whiteBloodCells.wobbleAmount;
    this.wobbleFrequency = CONFIG.whiteBloodCells.wobbleFrequency;
    this.type = type;
    this.state = 'wandering';
    this.health = 100;
    this.maxHealth = 100;
    this.attackPower = 10;
    this.attackCooldown = 0;
    this.attackCooldownMax = 30;
    this.diffusionField = null;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.1 + Math.random() * 0.05;
    this.targetVirus = null;
    this.excitedLevel = 0;
    this.baseThrust = this.thrustMultiplier;
    this.baseLinearDrag = this.linearDrag;
    this.baseQuadraticDrag = this.quadraticDrag;
    this.baseCubicDrag = this.cubicDrag;
  }

  setDiffusionField(field) {
    this.diffusionField = field;
  }

  update() {
    this.wobblePhase += this.wobbleSpeed;

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    if (this.excitedLevel > 0) {
      this.excitedLevel *= 0.995;
    }

    if (this.diffusionField) {
      const exciteConc = this.diffusionField.getConcentration(
        'excite',
        this.x,
        this.y
      );
      if (exciteConc > 10) {
        this.excitedLevel = Math.min(1, this.excitedLevel + 0.015);
      }
    }

    this.thrustMultiplier = this.baseThrust * (1 + this.excitedLevel * 0.6);
    this.linearDrag = this.baseLinearDrag * (1 - this.excitedLevel * 0.3);
    this.quadraticDrag = this.baseQuadraticDrag * (1 - this.excitedLevel * 0.2);
    this.cubicDrag = this.baseCubicDrag * (1 - this.excitedLevel * 0.15);
    this.attackPower = 10 * (1 + this.excitedLevel * 1.0);

    this.state = 'wandering';
    if (this.targetVirus && this.targetVirus.health > 0) {
      const dist = Utils.vec.dist(
        { x: this.x, y: this.y },
        { x: this.targetVirus.x, y: this.targetVirus.y }
      );
      if (dist < this.radius + this.targetVirus.radius + 5) {
        this.state = 'attacking';
        if (this.attackCooldown <= 0) {
          this.targetVirus.takeDamage(this.attackPower);
          this.attackCooldown = this.attackCooldownMax;
        }
      } else if (dist < 200) {
        this.state = 'chasing';
        const dir = Utils.vec.norm({
          x: this.targetVirus.x - this.x,
          y: this.targetVirus.y - this.y,
        });
        const chaseForce = 0.12 * this.thrustMultiplier;
        this.vx += dir.x * chaseForce;
        this.vy += dir.y * chaseForce;
      }
    }

    this.x = Utils.clamp(
      this.x,
      this.radius,
      CONFIG.canvas.width - this.radius
    );
    this.y = Utils.clamp(
      this.y,
      this.radius,
      CONFIG.canvas.height - this.radius
    );
  }

  findNearbyVirus(viruses) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const virus of viruses) {
      if (virus.health <= 0) continue;
      if (virus.state === 'latent') continue;

      const dist = Utils.vec.dist(
        { x: this.x, y: this.y },
        { x: virus.x, y: virus.y }
      );

      let effectiveRange = 100;
      if (this.diffusionField) {
        const attractConc = this.diffusionField.getConcentration(
          'attract',
          virus.x,
          virus.y
        );
        effectiveRange += attractConc * 2;
      }

      if (dist < nearestDist && dist < effectiveRange) {
        nearestDist = dist;
        nearest = virus;
      }
    }

    this.targetVirus = nearest;
    return nearest;
  }

  getDisplayRadius() {
    const wobble = Math.sin(this.wobblePhase) * 0.1;
    return this.radius * (1 + wobble);
  }
}

class Virus {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * CONFIG.virus.speed;
    this.vy = Math.sin(angle) * CONFIG.virus.speed;
    this.radius = CONFIG.virus.radius;
    this.health = CONFIG.virus.health;
    this.maxHealth = CONFIG.virus.health;
    this.state = 'free';
    this.hostCell = null;
    this.latencyTimer = 0;
    this.replicationProgress = 0;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.15;
    this.targetCell = null;
  }

  update(healthCells) {
    this.wobblePhase += this.wobbleSpeed;

    switch (this.state) {
      case 'free':
        this.updateFree(healthCells);
        break;
      case 'infecting':
        this.updateInfecting();
        break;
      case 'latent':
        this.updateLatent();
        break;
      case 'replicating':
        this.updateReplicating();
        break;
    }
  }

  updateFree(healthCells) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < this.radius || this.x > CONFIG.canvas.width - this.radius) {
      this.vx *= -1;
      this.x = Utils.clamp(
        this.x,
        this.radius,
        CONFIG.canvas.width - this.radius
      );
    }
    if (this.y < this.radius || this.y > CONFIG.canvas.height - this.radius) {
      this.vy *= -1;
      this.y = Utils.clamp(
        this.y,
        this.radius,
        CONFIG.canvas.height - this.radius
      );
    }

    if (!this.targetCell || this.targetCell.health <= 0 || this.targetCell.infected) {
      this.targetCell = this.findNearestCell(healthCells);
    }

    if (this.targetCell) {
      const dist = Utils.vec.dist(
        { x: this.x, y: this.y },
        { x: this.targetCell.x, y: this.targetCell.y }
      );

      if (dist < this.targetCell.radius + this.radius) {
        this.startInfection(this.targetCell);
      } else {
        const dir = Utils.vec.norm({
          x: this.targetCell.x - this.x,
          y: this.targetCell.y - this.y,
        });
        this.vx += dir.x * 0.02;
        this.vy += dir.y * 0.02;

        const speed = Math.sqrt(
          this.vx * this.vx + this.vy * this.vy
        );
        if (speed > CONFIG.virus.speed) {
          this.vx = (this.vx / speed) * CONFIG.virus.speed;
          this.vy = (this.vy / speed) * CONFIG.virus.speed;
        }
      }
    }
  }

  findNearestCell(healthCells) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const cell of healthCells) {
      if (cell.health <= 0) continue;
      if (cell.infected) continue;

      const dist = Utils.vec.dist(
        { x: this.x, y: this.y },
        { x: cell.x, y: cell.y }
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = cell;
      }
    }

    return nearest;
  }

  startInfection(cell) {
    this.state = 'infecting';
    this.hostCell = cell;
    this.latencyTimer = 60;
  }

  updateInfecting() {
    if (this.hostCell) {
      this.x = this.hostCell.x;
      this.y = this.hostCell.y;
    }

    this.latencyTimer--;
    if (this.latencyTimer <= 0) {
      this.state = 'latent';
      this.latencyTimer = CONFIG.virus.latencyPeriod;
      if (this.hostCell) {
        this.hostCell.infected = true;
        this.hostCell.virusCount = (this.hostCell.virusCount || 0) + 1;
      }
    }
  }

  updateLatent() {
    if (this.hostCell) {
      this.x = this.hostCell.x;
      this.y = this.hostCell.y;
    }

    this.latencyTimer--;
    if (this.latencyTimer <= 0) {
      this.state = 'replicating';
    }
  }

  updateReplicating() {
    if (this.hostCell && this.hostCell.virusCount < CONFIG.virus.maxVirusesPerCell) {
      this.replicationProgress += CONFIG.virus.replicationRate;

      if (this.replicationProgress >= 1) {
        this.replicationProgress = 0;
        this.hostCell.virusCount++;
      }

      this.hostCell.health -= 0.1;

      if (this.hostCell.health <= 0) {
        this.burst();
      }
    }
  }

  burst() {
    const burstViruses = [];
    const count = this.hostCell ? this.hostCell.virusCount : CONFIG.virus.burstCount;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const newVirus = new Virus(
        this.hostCell ? this.hostCell.x : this.x,
        this.hostCell ? this.hostCell.y : this.y
      );
      newVirus.vx = Math.cos(angle) * CONFIG.virus.speed * 2;
      newVirus.vy = Math.sin(angle) * CONFIG.virus.speed * 2;
      newVirus.health = this.maxHealth;
      burstViruses.push(newVirus);
    }

    if (this.hostCell) {
      this.hostCell.health = 0;
      this.hostCell.infected = false;
      this.hostCell.virusCount = 0;
    }

    this.health = 0;
    return burstViruses;
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
    }
  }

  getDisplayRadius() {
    const wobble = Math.sin(this.wobblePhase * 2) * 0.15;
    return this.radius * (1 + wobble);
  }
}

class HealthCell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.healthCells.radius;
    this.health = CONFIG.healthCells.maxHealth;
    this.maxHealth = CONFIG.healthCells.maxHealth;
    this.infected = false;
    this.virusCount = 0;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = CONFIG.healthCells.pulseSpeed;
    this.driftVX = (Math.random() - 0.5) * 0.1;
    this.driftVY = (Math.random() - 0.5) * 0.1;
  }

  update() {
    this.pulsePhase += this.pulseSpeed;

    this.x += this.driftVX;
    this.y += this.driftVY;

    if (this.x < this.radius || this.x > CONFIG.canvas.width - this.radius) {
      this.driftVX *= -1;
      this.x = Utils.clamp(
        this.x,
        this.radius,
        CONFIG.canvas.width - this.radius
      );
    }
    if (this.y < this.radius || this.y > CONFIG.canvas.height - this.radius) {
      this.driftVY *= -1;
      this.y = Utils.clamp(
        this.y,
        this.radius,
        CONFIG.canvas.height - this.radius
      );
    }

    if (!this.infected && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + 0.05);
    }
  }

  getDisplayRadius() {
    const pulse = Math.sin(this.pulsePhase) * CONFIG.healthCells.pulseAmount;
    return this.radius * (1 + pulse);
  }

  getHealthColor() {
    const healthRatio = this.health / this.maxHealth;
    if (this.infected) {
      return Utils.lerpColor('#ff4444', '#880000', 1 - healthRatio);
    }
    return Utils.lerpColor('#ffaaaa', '#ffcccc', healthRatio);
  }
}
