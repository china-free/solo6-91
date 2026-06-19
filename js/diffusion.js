// 扩散场系统 - 模拟化学趋化因子的扩散与衰减

class DiffusionField {
  constructor(width, height, gridSize) {
    this.width = width;
    this.height = height;
    this.gridSize = gridSize;
    this.cols = Math.ceil(width / gridSize);
    this.rows = Math.ceil(height / gridSize);

    this.diffusionRate = CONFIG.diffusion.diffusionRate;
    this.decayRate = CONFIG.diffusion.decayRate;
    this.maxConcentration = CONFIG.diffusion.maxConcentration;

    this.fields = {};
    this.tempFields = {};

    for (const chemokine of CONFIG.chemokines) {
      this.fields[chemokine.id] = this.createField();
      this.tempFields[chemokine.id] = this.createField();
    }
  }

  createField() {
    return new Float32Array(this.cols * this.rows);
  }

  getIndex(col, row) {
    return row * this.cols + col;
  }

  getValue(fieldId, col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return 0;
    }
    return this.fields[fieldId][this.getIndex(col, row)];
  }

  setValue(fieldId, col, row, value) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return;
    }
    const idx = this.getIndex(col, row);
    this.fields[fieldId][idx] = Utils.clamp(
      value,
      0,
      this.maxConcentration
    );
  }

  addValue(fieldId, col, row, amount) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return;
    }
    const idx = this.getIndex(col, row);
    this.fields[fieldId][idx] = Utils.clamp(
      this.fields[fieldId][idx] + amount,
      0,
      this.maxConcentration
    );
  }

  getConcentration(fieldId, x, y) {
    const col = Math.floor(x / this.gridSize);
    const row = Math.floor(y / this.gridSize);

    if (col < 0 || col >= this.cols - 1 || row < 0 || row >= this.rows - 1) {
      return 0;
    }

    const fx = (x % this.gridSize) / this.gridSize;
    const fy = (y % this.gridSize) / this.gridSize;

    const idx00 = this.getIndex(col, row);
    const idx10 = idx00 + 1;
    const idx01 = idx00 + this.cols;
    const idx11 = idx01 + 1;

    const field = this.fields[fieldId];
    const v00 = field[idx00];
    const v10 = field[idx10];
    const v01 = field[idx01];
    const v11 = field[idx11];

    const vx0 = v00 * (1 - fx) + v10 * fx;
    const vx1 = v01 * (1 - fx) + v11 * fx;

    return vx0 * (1 - fy) + vx1 * fy;
  }

  getGradient(fieldId, x, y) {
    const eps = this.gridSize;
    const dx =
      this.getConcentration(fieldId, x + eps, y) -
      this.getConcentration(fieldId, x - eps, y);
    const dy =
      this.getConcentration(fieldId, x, y + eps) -
      this.getConcentration(fieldId, x, y - eps);

    return { x: dx / (2 * eps), y: dy / (2 * eps) };
  }

  getTotalConcentration(x, y) {
    let total = 0;
    for (const chemokine of CONFIG.chemokines) {
      total += this.getConcentration(chemokine.id, x, y);
    }
    return total;
  }

  getTotalGradient(x, y) {
    const grad = { x: 0, y: 0 };
    for (const chemokine of CONFIG.chemokines) {
      const g = this.getGradient(chemokine.id, x, y);
      grad.x += g.x;
      grad.y += g.y;
    }
    return grad;
  }

  addDroplet(fieldId, x, y, amount, radius) {
    const centerCol = Math.floor(x / this.gridSize);
    const centerRow = Math.floor(y / this.gridSize);
    const gridRadius = Math.ceil(radius / this.gridSize);

    for (let dy = -gridRadius; dy <= gridRadius; dy++) {
      for (let dx = -gridRadius; dx <= gridRadius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= gridRadius) {
          const falloff = 1 - dist / gridRadius;
          const value = amount * falloff * falloff;
          this.addValue(fieldId, centerCol + dx, centerRow + dy, value);
        }
      }
    }
  }

  update() {
    for (const chemokine of CONFIG.chemokines) {
      this.updateField(chemokine.id);
    }
  }

  updateField(fieldId) {
    const src = this.fields[fieldId];
    const dst = this.tempFields[fieldId];
    const D = this.diffusionRate;
    const k = this.decayRate;

    for (let row = 1; row < this.rows - 1; row++) {
      for (let col = 1; col < this.cols - 1; col++) {
        const idx = this.getIndex(col, row);

        const left = src[idx - 1];
        const right = src[idx + 1];
        const up = src[idx - this.cols];
        const down = src[idx + this.cols];
        const center = src[idx];

        const laplacian = left + right + up + down - 4 * center;

        let newValue = center + D * laplacian - k * center;

        newValue = Math.max(0, Math.min(this.maxConcentration, newValue));

        dst[idx] = newValue;
      }
    }

    for (let col = 0; col < this.cols; col++) {
      dst[col] = 0;
      dst[this.getIndex(col, this.rows - 1)] = 0;
    }
    for (let row = 0; row < this.rows; row++) {
      dst[this.getIndex(0, row)] = 0;
      dst[this.getIndex(this.cols - 1, row)] = 0;
    }

    this.tempFields[fieldId] = src;
    this.fields[fieldId] = dst;
  }

  clear() {
    for (const chemokine of CONFIG.chemokines) {
      this.fields[chemokine.id].fill(0);
      this.tempFields[chemokine.id].fill(0);
    }
  }
}
