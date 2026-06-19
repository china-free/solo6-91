// 工具函数

const Utils = {
  // 向量工具
  vec: {
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
    mul: (v, s) => ({ x: v.x * s, y: v.y * s }),
    div: (v, s) => ({ x: v.x / s, y: v.y / s }),
    mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
    norm: (v) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      return m > 0 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
    },
    limit: (v, max) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      if (m > max) {
        return { x: (v.x / m) * max, y: (v.y / m) * max };
      }
      return { ...v };
    },
    setMag: (v, mag) => {
      const m = Math.sqrt(v.x * v.x + v.y * v.y);
      if (m > 0) {
        return { x: (v.x / m) * mag, y: (v.y / m) * mag };
      }
      return { x: 0, y: 0 };
    },
    dist: (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    distSq: (a, b) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    },
    dot: (a, b) => a.x * b.x + a.y * b.y,
    lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
    random2D: () => {
      const angle = Math.random() * Math.PI * 2;
      return { x: Math.cos(angle), y: Math.sin(angle) };
    },
  },

  // 随机数
  random: (min, max) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,

  // 约束
  clamp: (value, min, max) => Math.max(min, Math.min(max, value)),

  // 线性插值
  lerp: (a, b, t) => a + (b - a) * t,

  // 平滑步长
  smoothstep: (edge0, edge1, x) => {
    const t = Utils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  },

  // 颜色工具
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  },

  rgbToHex: (r, g, b) => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(Utils.clamp(x, 0, 255)).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  },

  // 颜色插值
  lerpColor: (color1, color2, t) => {
    const c1 = Utils.hexToRgb(color1);
    const c2 = Utils.hexToRgb(color2);
    return Utils.rgbToHex(
      Utils.lerp(c1.r, c2.r, t),
      Utils.lerp(c1.g, c2.g, t),
      Utils.lerp(c1.b, c2.b, t)
    );
  },

  // 创建带透明度的rgba颜色
  withAlpha: (hex, alpha) => {
    const { r, g, b } = Utils.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  // 角度工具
  radians: (degrees) => (degrees * Math.PI) / 180,
  degrees: (radians) => (radians * 180) / Math.PI,

  // 随机位置在圆内
  randomInCircle: (center, radius) => {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    };
  },

  // 噪声函数 (简化版 Perlin noise)
  noise: (x, y, seed = 0) => {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  },

  // 空间网格索引
  createSpatialGrid: (cellSize, width, height) => {
    const cols = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const grid = new Map();

    const getKey = (col, row) => `${col},${row}`;

    const queryCells = (x, y, radius) => {
      const results = [];
      const minCol = Math.floor((x - radius) / cellSize);
      const maxCol = Math.floor((x + radius) / cellSize);
      const minRow = Math.floor((y - radius) / cellSize);
      const maxRow = Math.floor((y + radius) / cellSize);

      for (let col = minCol; col <= maxCol; col++) {
        for (let row = minRow; row <= maxRow; row++) {
          const key = getKey(col, row);
          const cell = grid.get(key);
          if (cell) {
            results.push(...cell);
          }
        }
      }
      return results;
    };

    return {
      clear: () => grid.clear(),

      insert: (entity) => {
        const col = Math.floor(entity.x / cellSize);
        const row = Math.floor(entity.y / cellSize);
        const key = getKey(col, row);
        if (!grid.has(key)) {
          grid.set(key, []);
        }
        grid.get(key).push(entity);
      },

      query: queryCells,

      queryRadius: (x, y, radius) => {
        const candidates = queryCells(x, y, radius);
        const results = [];
        const radiusSq = radius * radius;

        for (const entity of candidates) {
          const dx = entity.x - x;
          const dy = entity.y - y;
          if (dx * dx + dy * dy <= radiusSq) {
            results.push(entity);
          }
        }
        return results;
      },
    };
  },
};
