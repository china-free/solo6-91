// 粒子特效系统

class Particle {
  constructor(x, y, vx, vy, color, radius, lifetime) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.radius = radius;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alpha = 1;
    this.drag = 0.98;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.lifetime--;
    this.alpha = this.lifetime / this.maxLifetime;
  }

  isDead() {
    return this.lifetime <= 0;
  }
}

class ParticleSystem {
  constructor(maxCount) {
    this.particles = [];
    this.maxCount = maxCount || CONFIG.particles.maxCount;
  }

  addParticle(particle) {
    if (this.particles.length >= this.maxCount) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  emitBurst(x, y, color, count, speed, radius) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const r = (Math.random() * 0.5 + 0.5) * radius;
      const lifetime = 30 + Math.random() * 30;

      this.addParticle(new Particle(x, y, vx, vy, color, r, lifetime));
    }
  }

  emitTrail(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const r = 1 + Math.random() * 2;
      const lifetime = 20 + Math.random() * 20;

      this.addParticle(new Particle(x, y, vx, vy, color, r, lifetime));
    }
  }

  emitRipple(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const r = 2 + Math.random() * 2;
      const lifetime = 40 + Math.random() * 20;

      this.addParticle(new Particle(x, y, vx, vy, color, r, lifetime));
    }
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update();
      if (this.particles[i].isDead()) {
        this.particles.splice(i, 1);
      }
    }
  }

  clear() {
    this.particles = [];
  }
}

class BackgroundParticle {
  constructor(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.radius = CONFIG.backgroundParticles.radius;
    this.speed = CONFIG.backgroundParticles.speed;
    this.angle = Math.random() * Math.PI * 2;
    this.width = width;
    this.height = height;
    this.alpha = 0.3 + Math.random() * 0.4;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.02 + Math.random() * 0.02;
  }

  update() {
    this.wobblePhase += this.wobbleSpeed;
    const wobble = Math.sin(this.wobblePhase) * 0.5;

    this.x += Math.cos(this.angle) * this.speed + wobble * 0.1;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.x < 0) this.x = this.width;
    if (this.x > this.width) this.x = 0;
    if (this.y < 0) this.y = this.height;
    if (this.y > this.height) this.y = 0;

    this.angle += (Math.random() - 0.5) * 0.1;
  }
}

class BackgroundParticleSystem {
  constructor(width, height, count) {
    this.particles = [];
    this.width = width;
    this.height = height;

    for (let i = 0; i < count; i++) {
      this.particles.push(new BackgroundParticle(width, height));
    }
  }

  update() {
    for (const p of this.particles) {
      p.update();
    }
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }
}
