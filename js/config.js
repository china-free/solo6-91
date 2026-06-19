// 游戏配置参数
const CONFIG = {
  // 画布设置
  canvas: {
    width: 1200,
    height: 800,
    backgroundColor: '#0a1628',
  },

  // 扩散场设置
  diffusion: {
    gridSize: 8,
    diffusionRate: 0.15,
    decayRate: 0.02,
    maxConcentration: 100,
    dropAmount: 80,
    dropRadius: 3,
  },

  // 白细胞设置
  whiteBloodCells: {
    count: 80,
    radius: 6,
    maxSpeed: 1.5,
    maxForce: 0.08,
    drag: 0.02,
    wobbleAmount: 0.3,
  },

  // Boids 参数
  boids: {
    separationRadius: 25,
    alignmentRadius: 40,
    cohesionRadius: 50,
    separationWeight: 1.5,
    alignmentWeight: 1.0,
    cohesionWeight: 1.0,
    chemotaxisWeight: 2.5,
  },

  // 健康细胞设置
  healthCells: {
    count: 25,
    radius: 18,
    maxHealth: 100,
    pulseSpeed: 0.02,
    pulseAmount: 0.1,
  },

  // 病毒设置
  virus: {
    initialCount: 5,
    radius: 4,
    speed: 0.8,
    health: 30,
    latencyPeriod: 180,
    replicationRate: 0.02,
    maxVirusesPerCell: 8,
    infectionRange: 20,
    burstCount: 5,
  },

  // 波次设置
  waves: {
    initialDelay: 300,
    virusPerWave: 3,
    waveInterval: 600,
  },

  // 趋化因子类型
  chemokines: [
    {
      id: 'attract',
      name: '吸引因子',
      color: '#00ff88',
      glowColor: 'rgba(0, 255, 136, 0.4)',
      description: '吸引白细胞聚集',
      key: '1',
    },
    {
      id: 'excite',
      name: '激活因子',
      color: '#ff6600',
      glowColor: 'rgba(255, 102, 0, 0.4)',
      description: '提升白细胞攻击力和速度',
      key: '2',
    },
    {
      id: 'alert',
      name: '警报因子',
      color: '#cc44ff',
      glowColor: 'rgba(204, 68, 255, 0.4)',
      description: '大范围吸引但效果较弱',
      key: '3',
    },
  ],

  // 粒子效果
  particles: {
    maxCount: 200,
    lifetime: 60,
  },

  // 背景粒子
  backgroundParticles: {
    count: 100,
    radius: 1,
    speed: 0.2,
  },
};
