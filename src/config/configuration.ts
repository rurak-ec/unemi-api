export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  corsOrigin: process.env.CORS_ORIGIN || '*',
  verboseLogs: process.env.VERBOSE_LOGS === 'true',

  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  cacheTtlMs: parseInt(process.env.CACHE_TTL_MS || '86400000', 10),

  sga: {
    baseUrl:
      process.env.SGA_BASE_URL ||
      'https://sga.unemi.edu.ec/api/1.0/jwt',
    timeoutMs: parseInt(process.env.SGA_TIMEOUT_MS || '30000', 10),
  },

  posgrado: {
    baseUrl:
      process.env.POSGRADO_BASE_URL ||
      'https://seleccionposgrado.unemi.edu.ec',
    timeoutMs: parseInt(process.env.POSGRADO_TIMEOUT_MS || '30000', 10),
  },

  matriculacion: {
    baseUrl:
      process.env.MATRICULACION_BASE_URL ||
      'https://matriculacion-api.unemi.edu.ec/api/matricula/v1.0.0',
    timeoutMs: parseInt(process.env.MATRICULACION_TIMEOUT_MS || '30000', 10),
  },

  passwords: {
    defaultReset: process.env.DEFAULT_RESET_PASSWORD || 'Unemi*2025',
  },
});
