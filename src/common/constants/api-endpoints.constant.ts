export const API_ENDPOINTS = {
  SGA: {
    RECOVERY_PASSWORD: '/token/recoverypassword',
    LOGIN: '/token/login',
    CHANGE_PASSWORD: '/changepassword',
    CHANGE_CAREER: '/token/change/career',
    HOJA_VIDA: '/alumno/hoja_vida',
    MALLA: '/alumno/malla',
    HORARIO: '/alumno/horario',
    MATERIAS: '/alumno/materias',
  },
  POSGRADO: {
    RECOVERY_PASSWORD: '/recoverypassword',
  },
  MATRICULACION: {
    SEARCH_PERSONA: '/reset_password/reset/otp/search_persona/',
    RESET_PASSWORD: '/reset_password/reset/otp/reset_password/',
  },
} as const;
