// Boids 群体智能系统

class BoidsSystem {
  constructor() {
    this.boids = [];
    this.spatialGrid = null;
  }

  setSpatialGrid(grid) {
    this.spatialGrid = grid;
  }

  addBoid(boid) {
    this.boids.push(boid);
  }

  removeBoid(boid) {
    const index = this.boids.indexOf(boid);
    if (index > -1) {
      this.boids.splice(index, 1);
    }
  }

  update() {
    if (this.spatialGrid) {
      this.spatialGrid.clear();
      for (const boid of this.boids) {
        this.spatialGrid.insert(boid);
      }
    }

    for (const boid of this.boids) {
      this.updateBoid(boid);
    }
  }

  updateBoid(boid) {
    let neighbors;
    if (this.spatialGrid) {
      neighbors = this.spatialGrid.queryRadius(
        boid.x,
        boid.y,
        CONFIG.boids.cohesionRadius
      );
    } else {
      neighbors = this.boids.filter(
        (other) =>
          other !== boid &&
          Utils.vec.dist(
            { x: boid.x, y: boid.y },
            { x: other.x, y: other.y }
          ) <= CONFIG.boids.cohesionRadius
      );
    }

    const separation = this.calculateSeparation(boid, neighbors);
    const alignment = this.calculateAlignment(boid, neighbors);
    const cohesion = this.calculateCohesion(boid, neighbors);
    const chemotaxis = this.calculateChemotaxis(boid);
    const boundary = this.calculateBoundary(boid);

    const acceleration = { x: 0, y: 0 };

    acceleration.x += separation.x * CONFIG.boids.separationWeight;
    acceleration.y += separation.y * CONFIG.boids.separationWeight;

    acceleration.x += alignment.x * CONFIG.boids.alignmentWeight;
    acceleration.y += alignment.y * CONFIG.boids.alignmentWeight;

    acceleration.x += cohesion.x * CONFIG.boids.cohesionWeight;
    acceleration.y += cohesion.y * CONFIG.boids.cohesionWeight;

    acceleration.x += chemotaxis.x * CONFIG.boids.chemotaxisWeight;
    acceleration.y += chemotaxis.y * CONFIG.boids.chemotaxisWeight;

    acceleration.x += boundary.x * CONFIG.boids.boundaryWeight;
    acceleration.y += boundary.y * CONFIG.boids.boundaryWeight;

    const thrustMul = boid.thrustMultiplier || CONFIG.whiteBloodCells.thrustMultiplier;
    boid.vx += acceleration.x * thrustMul;
    boid.vy += acceleration.y * thrustMul;

    const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);

    if (speed > 0.001) {
      const linearDrag = boid.linearDrag || CONFIG.whiteBloodCells.linearDrag;
      const quadraticDrag = boid.quadraticDrag || CONFIG.whiteBloodCells.quadraticDrag;

      const dragAccel = linearDrag + quadraticDrag * speed;
      const dragFactor = Math.max(0, 1 - dragAccel);

      boid.vx *= dragFactor;
      boid.vy *= dragFactor;
    }

    const newSpeed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
    const minSpeed = boid.minSpeed || CONFIG.whiteBloodCells.minSpeed;
    if (newSpeed < minSpeed && newSpeed > 0) {
      const boost = (minSpeed - newSpeed) * 0.1;
      boid.vx += (boid.vx / newSpeed) * boost;
      boid.vy += (boid.vy / newSpeed) * boost;
    } else if (newSpeed === 0) {
      const angle = Math.random() * Math.PI * 2;
      boid.vx = Math.cos(angle) * minSpeed;
      boid.vy = Math.sin(angle) * minSpeed;
    }

    const wobbleAmount = boid.wobbleAmount || CONFIG.whiteBloodCells.wobbleAmount;
    const wobbleFreq = boid.wobbleFrequency || CONFIG.whiteBloodCells.wobbleFrequency;

    if (boid.brownianPhase === undefined) {
      boid.brownianPhase = Math.random() * Math.PI * 2;
      boid.brownianPhase2 = Math.random() * Math.PI * 2;
      boid.brownianSpeed = wobbleFreq * (0.8 + Math.random() * 0.4);
      boid.brownianSpeed2 = wobbleFreq * (0.6 + Math.random() * 0.5);
    }

    boid.brownianPhase += boid.brownianSpeed;
    boid.brownianPhase2 += boid.brownianSpeed2;

    const brownianX = Math.sin(boid.brownianPhase) + Math.sin(boid.brownianPhase2 * 1.7) * 0.5;
    const brownianY = Math.cos(boid.brownianPhase * 0.8) + Math.cos(boid.brownianPhase2 * 1.3) * 0.5;

    const brownianStrength = wobbleAmount * (0.5 + newSpeed * 0.3);
    boid.vx += brownianX * brownianStrength;
    boid.vy += brownianY * brownianStrength;

    if (isNaN(boid.vx) || isNaN(boid.vy) || !isFinite(boid.vx) || !isFinite(boid.vy)) {
      const angle = Math.random() * Math.PI * 2;
      boid.vx = Math.cos(angle) * 0.5;
      boid.vy = Math.sin(angle) * 0.5;
    }

    const finalSpeed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
    const maxAllowedSpeed = 5.0;
    if (finalSpeed > maxAllowedSpeed) {
      boid.vx = (boid.vx / finalSpeed) * maxAllowedSpeed;
      boid.vy = (boid.vy / finalSpeed) * maxAllowedSpeed;
    }

    boid.x += boid.vx;
    boid.y += boid.vy;

    if (isNaN(boid.x) || isNaN(boid.y)) {
      boid.x = CONFIG.canvas.width / 2;
      boid.y = CONFIG.canvas.height / 2;
    }
  }

  calculateSeparation(boid, neighbors) {
    const steer = { x: 0, y: 0 };
    let count = 0;
    const radius = CONFIG.boids.separationRadius;

    for (const other of neighbors) {
      if (other === boid) continue;
      const d = Utils.vec.dist(
        { x: boid.x, y: boid.y },
        { x: other.x, y: other.y }
      );
      if (d > 0 && d < radius) {
        const diff = {
          x: boid.x - other.x,
          y: boid.y - other.y,
        };
        const normalized = Utils.vec.norm(diff);
        const weighted = {
          x: normalized.x / d,
          y: normalized.y / d,
        };
        steer.x += weighted.x;
        steer.y += weighted.y;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;
    }

    return steer;
  }

  calculateAlignment(boid, neighbors) {
    const steer = { x: 0, y: 0 };
    let count = 0;
    const radius = CONFIG.boids.alignmentRadius;

    for (const other of neighbors) {
      if (other === boid) continue;
      const d = Utils.vec.dist(
        { x: boid.x, y: boid.y },
        { x: other.x, y: other.y }
      );
      if (d > 0 && d < radius) {
        steer.x += other.vx;
        steer.y += other.vy;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;

      const desiredSpeed = 1.0;
      const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (mag > 0) {
        steer.x = (steer.x / mag) * desiredSpeed - boid.vx;
        steer.y = (steer.y / mag) * desiredSpeed - boid.vy;
      }

      const maxForce = CONFIG.boids.maxForce * 0.6;
      const m = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (m > maxForce) {
        steer.x = (steer.x / m) * maxForce;
        steer.y = (steer.y / m) * maxForce;
      }
    }

    return steer;
  }

  calculateCohesion(boid, neighbors) {
    const steer = { x: 0, y: 0 };
    let count = 0;
    const radius = CONFIG.boids.cohesionRadius;

    for (const other of neighbors) {
      if (other === boid) continue;
      const d = Utils.vec.dist(
        { x: boid.x, y: boid.y },
        { x: other.x, y: other.y }
      );
      if (d > 0 && d < radius) {
        steer.x += other.x;
        steer.y += other.y;
        count++;
      }
    }

    if (count > 0) {
      steer.x /= count;
      steer.y /= count;

      const desired = {
        x: steer.x - boid.x,
        y: steer.y - boid.y,
      };

      const mag = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
      if (mag > 0) {
        const desiredSpeed = 1.2;
        desired.x = (desired.x / mag) * desiredSpeed;
        desired.y = (desired.y / mag) * desiredSpeed;

        steer.x = desired.x - boid.vx;
        steer.y = desired.y - boid.vy;
      }

      const maxForce = CONFIG.boids.maxForce * 0.5;
      const m = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
      if (m > maxForce) {
        steer.x = (steer.x / m) * maxForce;
        steer.y = (steer.y / m) * maxForce;
      }
    }

    return steer;
  }

  calculateChemotaxis(boid) {
    if (!boid.diffusionField) {
      return { x: 0, y: 0 };
    }

    let totalGradient = { x: 0, y: 0 };
    let maxConc = 0;

    for (const chemokine of CONFIG.chemokines) {
      const grad = boid.diffusionField.getGradient(chemokine.id, boid.x, boid.y);
      const conc = boid.diffusionField.getConcentration(
        chemokine.id,
        boid.x,
        boid.y
      );

      const weight = conc / 100;
      totalGradient.x += grad.x * weight;
      totalGradient.y += grad.y * weight;

      if (conc > maxConc) maxConc = conc;
    }

    const strength = Utils.smoothstep(0, 50, maxConc);
    totalGradient.x *= strength;
    totalGradient.y *= strength;

    return totalGradient;
  }

  calculateBoundary(boid) {
    const steer = { x: 0, y: 0 };
    const margin = 50;
    const width = CONFIG.canvas.width;
    const height = CONFIG.canvas.height;

    if (boid.x < margin) {
      steer.x = (margin - boid.x) / margin;
    } else if (boid.x > width - margin) {
      steer.x = -(boid.x - (width - margin)) / margin;
    }

    if (boid.y < margin) {
      steer.y = (margin - boid.y) / margin;
    } else if (boid.y > height - margin) {
      steer.y = -(boid.y - (height - margin)) / margin;
    }

    return steer;
  }
}
