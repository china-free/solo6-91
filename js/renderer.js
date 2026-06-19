// 渲染系统

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    this.ctx.fillStyle = CONFIG.canvas.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawBackgroundParticles(particles) {
    this.ctx.save();
    for (const p of particles.particles) {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(100, 180, 255, ${p.alpha * 0.3})`;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawDiffusionField(diffusionField) {
    this.ctx.save();

    const gs = diffusionField.gridSize;

    for (const chemokine of CONFIG.chemokines) {
      const field = diffusionField.fields[chemokine.id];
      const color = Utils.hexToRgb(chemokine.color);

      for (let row = 0; row < diffusionField.rows; row++) {
        for (let col = 0; col < diffusionField.cols; col++) {
          const idx = row * diffusionField.cols + col;
          const value = field[idx];

          if (value > 0.1) {
            const alpha = Math.min(1, value / 30) * 0.6;
            this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
            this.ctx.fillRect(col * gs, row * gs, gs, gs);
          }
        }
      }
    }

    this.ctx.restore();
  }

  drawHealthCells(cells) {
    this.ctx.save();

    for (const cell of cells) {
      if (cell.health <= 0) continue;

      const radius = cell.getDisplayRadius();
      const healthRatio = cell.health / cell.maxHealth;

      const gradient = this.ctx.createRadialGradient(
        cell.x - radius * 0.3,
        cell.y - radius * 0.3,
        0,
        cell.x,
        cell.y,
        radius
      );

      if (cell.infected) {
        gradient.addColorStop(0, 'rgba(255, 100, 100, 0.9)');
        gradient.addColorStop(0.5, 'rgba(200, 50, 50, 0.7)');
        gradient.addColorStop(1, 'rgba(150, 20, 20, 0.5)');

        this.ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
        this.ctx.shadowBlur = 15;
      } else {
        gradient.addColorStop(0, 'rgba(255, 200, 200, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 150, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 120, 120, 0.4)');

        this.ctx.shadowColor = 'rgba(255, 150, 150, 0.3)';
        this.ctx.shadowBlur = 10;
      }

      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.shadowBlur = 0;

      const nucleusRadius = radius * 0.4;
      const nucleusGradient = this.ctx.createRadialGradient(
        cell.x - nucleusRadius * 0.2,
        cell.y - nucleusRadius * 0.2,
        0,
        cell.x,
        cell.y,
        nucleusRadius
      );

      if (cell.infected) {
        nucleusGradient.addColorStop(0, 'rgba(150, 50, 50, 0.8)');
        nucleusGradient.addColorStop(1, 'rgba(80, 20, 20, 0.9)');
      } else {
        nucleusGradient.addColorStop(0, 'rgba(200, 100, 100, 0.8)');
        nucleusGradient.addColorStop(1, 'rgba(150, 70, 70, 0.9)');
      }

      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, nucleusRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = nucleusGradient;
      this.ctx.fill();

      if (cell.infected && cell.virusCount > 0) {
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(cell.virusCount, cell.x, cell.y + radius + 12);
      }
    }

    this.ctx.restore();
  }

  drawViruses(viruses) {
    this.ctx.save();

    for (const virus of viruses) {
      if (virus.health <= 0) continue;

      const radius = virus.getDisplayRadius();

      if (virus.state === 'latent' || virus.state === 'replicating') {
        continue;
      }

      this.ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
      this.ctx.shadowBlur = 8;

      const gradient = this.ctx.createRadialGradient(
        virus.x - radius * 0.3,
        virus.y - radius * 0.3,
        0,
        virus.x,
        virus.y,
        radius
      );
      gradient.addColorStop(0, '#ff6666');
      gradient.addColorStop(0.6, '#ff3333');
      gradient.addColorStop(1, '#cc0000');

      this.ctx.beginPath();
      this.ctx.arc(virus.x, virus.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.shadowBlur = 0;

      const spikes = 8;
      this.ctx.strokeStyle = '#ff4444';
      this.ctx.lineWidth = 1.5;

      for (let i = 0; i < spikes; i++) {
        const angle = (Math.PI * 2 * i) / spikes + virus.wobblePhase * 0.5;
        const innerR = radius;
        const outerR = radius * 1.5;

        this.ctx.beginPath();
        this.ctx.moveTo(
          virus.x + Math.cos(angle) * innerR,
          virus.y + Math.sin(angle) * innerR
        );
        this.ctx.lineTo(
          virus.x + Math.cos(angle) * outerR,
          virus.y + Math.sin(angle) * outerR
        );
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(
          virus.x + Math.cos(angle) * outerR,
          virus.y + Math.sin(angle) * outerR,
          1.5,
          0,
          Math.PI * 2
        );
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  drawWhiteBloodCells(cells) {
    this.ctx.save();

    for (const cell of cells) {
      const radius = cell.getDisplayRadius();

      let glowColor = 'rgba(255, 255, 255, 0.4)';
      if (cell.excitedLevel > 0.1) {
        glowColor = `rgba(255, ${Math.floor(200 - cell.excitedLevel * 100)}, 100, ${0.4 + cell.excitedLevel * 0.3})`;
      }

      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 12 + cell.excitedLevel * 8;

      const gradient = this.ctx.createRadialGradient(
        cell.x - radius * 0.3,
        cell.y - radius * 0.3,
        0,
        cell.x,
        cell.y,
        radius
      );

      if (cell.state === 'attacking') {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#ffeeee');
        gradient.addColorStop(1, '#ffcccc');
      } else if (cell.state === 'chasing') {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#f0f0ff');
        gradient.addColorStop(1, '#ddddff');
      } else {
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#f5f5f5');
        gradient.addColorStop(1, '#e0e0e0');
      }

      this.ctx.beginPath();

      const points = 12;
      for (let i = 0; i <= points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        const wobble =
          Math.sin(angle * 3 + cell.wobblePhase) * (radius * 0.15);
        const r = radius + wobble;

        const x = cell.x + Math.cos(angle) * r;
        const y = cell.y + Math.sin(angle) * r;

        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      this.ctx.closePath();
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.shadowBlur = 0;

      const nucleusRadius = radius * 0.5;
      const nucleusGradient = this.ctx.createRadialGradient(
        cell.x - nucleusRadius * 0.2,
        cell.y - nucleusRadius * 0.2,
        0,
        cell.x,
        cell.y,
        nucleusRadius
      );
      nucleusGradient.addColorStop(0, '#666699');
      nucleusGradient.addColorStop(1, '#444477');

      this.ctx.beginPath();
      this.ctx.arc(cell.x, cell.y, nucleusRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = nucleusGradient;
      this.ctx.fill();

      if (cell.state === 'chasing' && cell.targetVirus) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);
        this.ctx.beginPath();
        this.ctx.moveTo(cell.x, cell.y);
        this.ctx.lineTo(cell.targetVirus.x, cell.targetVirus.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
    }

    this.ctx.restore();
  }

  drawParticles(particles) {
    this.ctx.save();

    for (const p of particles.particles) {
      const alpha = p.alpha;
      const color = Utils.hexToRgb(p.color);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawRipple(x, y, radius, color, alpha) {
    this.ctx.save();

    this.ctx.strokeStyle = Utils.withAlpha(color, alpha);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawCursor(x, y, chemokine) {
    this.ctx.save();

    const radius = 20;
    this.ctx.strokeStyle = chemokine.color;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.fillStyle = chemokine.glowColor;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawGameOver() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('免疫系统崩溃', this.width / 2, this.height / 2 - 30);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px Arial';
    this.ctx.fillText(
      '所有健康细胞都被感染了...',
      this.width / 2,
      this.height / 2 + 20
    );

    this.ctx.fillStyle = '#88ccff';
    this.ctx.font = '18px Arial';
    this.ctx.fillText(
      '按 R 键重新开始',
      this.width / 2,
      this.height / 2 + 60
    );

    this.ctx.restore();
  }

  drawVictory(wave) {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#00ff88';
    this.ctx.font = 'bold 48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('胜利！', this.width / 2, this.height / 2 - 30);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '24px Arial';
    this.ctx.fillText(
      `成功抵御了第 ${wave} 波病毒入侵`,
      this.width / 2,
      this.height / 2 + 20
    );

    this.ctx.fillStyle = '#88ccff';
    this.ctx.font = '18px Arial';
    this.ctx.fillText(
      '按 R 键重新开始',
      this.width / 2,
      this.height / 2 + 60
    );

    this.ctx.restore();
  }

  drawPaused() {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('暂停', this.width / 2, this.height / 2);

    this.ctx.font = '18px Arial';
    this.ctx.fillText(
      '按空格键继续',
      this.width / 2,
      this.height / 2 + 40
    );

    this.ctx.restore();
  }
}
