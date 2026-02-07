export const ERROR_MESSAGES = {
  STUDENT_NOT_FOUND: 'Estudiante no encontrado en ningún sistema',
  AUTHENTICATION_FAILED: 'Error de autenticación en SGA',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  EXTERNAL_API_ERROR: (service: string) =>
    `Error al conectar con ${service}`,
  INVALID_JWT: 'Token JWT inválido',
  PASSWORD_CHANGE_REQUIRED: 'Se requiere cambio de contraseña',
  FICHA_SOCIOECONOMICA_REQUIRED:
    'Se requiere completar ficha socioeconómica',
} as const;
