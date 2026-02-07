import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';

import { SgaAuthService } from '../sga/services/sga-auth.service';
import { SgaStudentService } from '../sga/services/sga-student.service';
import { SeleccionPosgradoService } from '../seleccion-posgrado/seleccion-posgrado.service';
import { MatriculacionService } from '../matriculacion/matriculacion.service';

import { GetStudentDataDto } from './dto/get-student-data.dto';
import { SearchResult } from './interfaces/search-result.interface';
import { CACHE_KEYS } from '../../common/constants/cache-keys.constant';
import {
  decodeJwtPayload,
  extractProfiles,
  JwtProfile,
} from '../../common/utils/jwt-decoder.util';
import {
  splitNombreCompleto,
  formatNombreCompleto,
  toNameCase,
} from '../../common/utils/name-parser.util';
import { chooseBestPublicData } from '../../common/utils/public-data-chooser.util';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function safeStr(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined')
    return null;
  return s;
}

function orNull(val: unknown): any {
  if (val == null) return null;
  if (typeof val === 'string' && !val.trim()) return null;
  if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)
    return null;
  return val;
}

function hasMessage(responses: any[], needle: string): boolean {
  return responses.some((r) => {
    const msg = r?.message;
    if (typeof msg !== 'string') return false;
    return msg.toLowerCase().includes(needle.toLowerCase());
  });
}

// ────────────────────────────────────────────
// Service
// ────────────────────────────────────────────

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  private readonly defaultPassword: string;

  constructor(
    private readonly sgaAuth: SgaAuthService,
    private readonly sgaStudent: SgaStudentService,
    private readonly posgrado: SeleccionPosgradoService,
    private readonly matriculacion: MatriculacionService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.defaultPassword = this.config.get('passwords.defaultReset', 'Unemi*2025');
  }

  // ══════════════════════════════════════════
  // PUBLIC ENTRY POINT
  // ══════════════════════════════════════════

  async getStudentData(dto: GetStudentDataDto) {
    // 1) Cache check
    const cacheKey = CACHE_KEYS.STUDENT_FULL(dto.documento, dto.public, dto.private);
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    // 2) Search in all 3 systems in parallel
    const search = await this.searchInAllSystems(dto.documento);

    // 3) Check existence
    const username = this.extractUsername(search);
    if (!username) {
      const result = { publicData: this.buildPublicDataNoExiste(dto.documento) };
      await this.cache.set(cacheKey, result, 300_000); // 5 min
      return result;
    }

    // 4) Determine mode
    const wantsPublic = dto.public;
    const wantsPrivate = dto.private;

    // 5) PUBLIC-ONLY mode (no login required)
    if (wantsPublic && !wantsPrivate) {
      const publicData = this.buildPublicDataFromSearch(search, dto);
      const result = { publicData };
      await this.cache.set(cacheKey, result, 3_600_000); // 1 hr
      return result;
    }

    // 6) PUBLIC + PRIVATE mode (login required)
    return this.handleFullFlow(dto, search, username, cacheKey);
  }

  // ══════════════════════════════════════════
  // SEARCH IN ALL SYSTEMS
  // ══════════════════════════════════════════

  private async searchInAllSystems(documento: string): Promise<SearchResult> {
    const [sgaResult, posgradoResult, matriculacionResult] =
      await Promise.allSettled([
        this.sgaAuth.recoveryPassword(documento),
        this.posgrado.recoveryPassword(documento),
        this.matriculacion.searchPersona(documento),
      ]);

    return {
      sga: sgaResult.status === 'fulfilled' ? sgaResult.value : null,
      posgrado: posgradoResult.status === 'fulfilled' ? posgradoResult.value : null,
      matriculacion:
        matriculacionResult.status === 'fulfilled'
          ? matriculacionResult.value
          : null,
    };
  }

  // ══════════════════════════════════════════
  // FULL FLOW (public + private)
  // ══════════════════════════════════════════

  private async handleFullFlow(
    dto: GetStudentDataDto,
    search: SearchResult,
    username: string,
    cacheKey: string,
  ) {
    // 1) Determine password
    const password = safeStr(dto.password) ?? safeStr(dto.documento) ?? '';

    // 2) Login
    const loginResponse = await this.sgaAuth.login(username, password);
    let accessToken = safeStr(loginResponse?.access);
    let refreshToken = safeStr(loginResponse?.refresh);

    // 3) Check if login succeeded
    if (!accessToken) {
      // No access → check reset_password
      if (dto.reset_password) {
        return this.handleResetPasswordFlow(dto, search, username, cacheKey);
      }
      // No access + no reset → return public-only data
      const publicData = this.buildPublicDataFromSearch(search, dto);
      const result = { publicData };
      await this.cache.set(cacheKey, result, 3_600_000);
      return result;
    }

    // 4) Decode JWT and extract profiles
    let decoded: Record<string, any>;
    let profiles: JwtProfile[];
    try {
      decoded = decodeJwtPayload(accessToken);
      profiles = extractProfiles(decoded);
    } catch {
      this.logger.warn('Failed to decode JWT');
      const publicData = this.buildPublicDataFromSearch(search, dto);
      return { publicData };
    }

    // 5) If no profiles → return public data without perfiles
    if (profiles.length === 0) {
      const publicData = this.buildPublicDataSinPerfiles(search, dto);
      return { publicData };
    }

    // 6) If more than 1 profile, change career to the first one
    if (profiles.length > 1) {
      try {
        const careerResponse = await this.sgaAuth.changeCareer(
          refreshToken!,
          String(profiles[0].id),
        );
        accessToken = safeStr(careerResponse?.access) ?? accessToken;
        refreshToken = safeStr(careerResponse?.refresh) ?? refreshToken;
      } catch (e) {
        this.logger.warn(`changeCareer failed: ${(e as Error).message}`);
      }
    }

    // 7) Get student data (series)
    const studentData = await this.sgaStudent.getAllStudentData(accessToken!);

    // 8) Check success (no "cambiar contraseña" / "ficha socioeconomica" messages)
    const responseMessages = [
      studentData.materias,
      studentData.horario,
      studentData.malla,
      studentData.hojaVida,
    ];

    if (hasMessage(responseMessages, 'completar/actualizar ficha socioeconomica')) {
      const publicData = this.buildPublicDataFichaSocioeconomica(search, dto);
      const result = { publicData };
      await this.cache.set(cacheKey, result, 300_000);
      return result;
    }

    if (hasMessage(responseMessages, 'cambiar contraseña')) {
      return this.handleChangePasswordFlow(
        dto, search, username, password, accessToken!, refreshToken!,
        profiles, cacheKey,
      );
    }

    // 9) Build final response
    const publicData = this.buildPublicDataSuccess(
      search, dto, studentData, profiles, accessToken!, refreshToken!,
      null, null,
    );
    const privateData = this.buildPrivateData(
      studentData,
      profiles[0]?.id,
    );

    const publicDataItems = profiles.map((_, idx) =>
      this.buildPublicDataSuccess(
        search, dto, studentData, profiles, accessToken!, refreshToken!,
        null, null,
      ),
    );
    const chosen = chooseBestPublicData(publicDataItems);

    const result = {
      publicData: chosen ?? publicData,
      privateData,
    };

    await this.cache.set(cacheKey, result, 3_600_000);
    return result;
  }

  // ══════════════════════════════════════════
  // RESET PASSWORD FLOW
  // ══════════════════════════════════════════

  private async handleResetPasswordFlow(
    dto: GetStudentDataDto,
    search: SearchResult,
    username: string,
    cacheKey: string,
  ) {
    const tempToken = search.matriculacion?.aData?.temp_token;
    if (tempToken) {
      try {
        await this.matriculacion.resetPassword(
          tempToken, username, this.defaultPassword,
        );
      } catch (e) {
        this.logger.warn(`matriculacion reset failed: ${(e as Error).message}`);
      }
    }

    // Login with default password after reset
    const loginResponse = await this.sgaAuth.login(username, this.defaultPassword);
    const accessToken = safeStr(loginResponse?.access);
    const refreshToken = safeStr(loginResponse?.refresh);

    if (!accessToken) {
      // Reset failed → return public data only
      const publicData = this.buildPublicDataFromSearch(search, dto);
      return { publicData };
    }

    // Login succeeded with reset password → continue normal flow
    let decoded: Record<string, any>;
    let profiles: JwtProfile[];
    try {
      decoded = decodeJwtPayload(accessToken);
      profiles = extractProfiles(decoded);
    } catch {
      const publicData = this.buildPublicDataFromSearch(search, dto);
      return { publicData };
    }

    if (profiles.length === 0) {
      return { publicData: this.buildPublicDataSinPerfiles(search, dto) };
    }

    let currentAccess = accessToken;
    let currentRefresh = refreshToken;

    if (profiles.length > 1) {
      try {
        const careerResp = await this.sgaAuth.changeCareer(
          currentRefresh!, String(profiles[0].id),
        );
        currentAccess = safeStr(careerResp?.access) ?? currentAccess;
        currentRefresh = safeStr(careerResp?.refresh) ?? currentRefresh;
      } catch { }
    }

    const studentData = await this.sgaStudent.getAllStudentData(currentAccess!);

    const publicData = this.buildPublicDataSuccess(
      search, dto, studentData, profiles, currentAccess!, currentRefresh!,
      'sga-login_reset-password', null,
    );
    const privateData = this.buildPrivateData(studentData, profiles[0]?.id);

    const result = { publicData, privateData };
    await this.cache.set(cacheKey, result, 3_600_000);
    return result;
  }

  // ══════════════════════════════════════════
  // CHANGE PASSWORD FLOW
  // ══════════════════════════════════════════

  private async handleChangePasswordFlow(
    dto: GetStudentDataDto,
    search: SearchResult,
    username: string,
    oldPassword: string,
    accessToken: string,
    refreshToken: string,
    profiles: JwtProfile[],
    cacheKey: string,
  ) {
    // Use the perfiles token for changepassword
    const perfilesAccess = accessToken;

    const changeResult = await this.sgaAuth.changePassword(
      perfilesAccess,
      oldPassword,
      this.defaultPassword,
    );

    // Re-login with default password
    const reloginResponse = await this.sgaAuth.login(username, this.defaultPassword);
    const newAccess = safeStr(reloginResponse?.access);
    const newRefresh = safeStr(reloginResponse?.refresh);

    const changeSuccess =
      changeResult?.message === 'Se ha cambiada correctamente la contraseña';

    if (!newAccess || !changeSuccess) {
      // Re-login failed after password change → return public data with changepassword
      const publicData = this.buildPublicDataChangePassword(search, dto);
      const result = { publicData };
      await this.cache.set(cacheKey, result, 300_000);
      return result;
    }

    const publicData = this.buildPublicDataChangePassword(search, dto);
    const result = { publicData };
    await this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  // ══════════════════════════════════════════
  // USERNAME EXTRACTION
  // ══════════════════════════════════════════

  private extractUsername(search: SearchResult): string | null {
    return (
      safeStr(search.sga?.data?.usuario) ??
      safeStr(search.posgrado?.user) ??
      safeStr(search.matriculacion?.aData?.username) ??
      null
    );
  }

  // ══════════════════════════════════════════
  // UNEMI ID EXTRACTION
  // ══════════════════════════════════════════

  private extractUnemiId(search: SearchResult): string | null {
    const a = search.sga?.data?.id;
    if (a != null && String(a).trim() !== '') return String(a);
    const b = search.posgrado?.id;
    if (b != null && String(b).trim() !== '') return String(b);
    return null;
  }

  // ══════════════════════════════════════════
  // EMAIL EXTRACTION
  // ══════════════════════════════════════════

  private extractEmail(search: SearchResult): string | null {
    return (
      safeStr(search.posgrado?.email) ??
      safeStr(search.matriculacion?.aData?.email) ??
      null
    );
  }

  private extractEmailInstitucional(
    search: SearchResult,
    username: string | null,
  ): string | null {
    const emailInst = safeStr(
      search.matriculacion?.aData?.email_institucional,
    );
    if (emailInst) return emailInst;
    if (username) return `${username}@unemi.edu.ec`;
    return null;
  }

  // ══════════════════════════════════════════
  // NOMBRE COMPLETO EXTRACTION
  // ══════════════════════════════════════════

  private extractNombreCompletoRaw(search: SearchResult): string | null {
    return (
      safeStr(search.sga?.data?.nombre_completo) ??
      safeStr(search.matriculacion?.aData?.nombre_completo) ??
      null
    );
  }

  // ══════════════════════════════════════════
  // GENDER EXTRACTION
  // ══════════════════════════════════════════

  private extractGender(
    search: SearchResult,
    materias?: any,
  ): { es_mujer: boolean | null; es_hombre: boolean | null } {
    const persona =
      materias?.data?.eMateriasAsignadas?.[0]?.matricula?.inscripcion?.persona;

    const esMujer = persona?.es_mujer ?? search.sga?.data?.es_mujer;
    const esHombre = persona?.es_hombre ?? search.sga?.data?.es_hombre;

    return {
      es_mujer: esMujer === '' || esMujer === undefined ? null : esMujer ?? null,
      es_hombre: esHombre === '' || esHombre === undefined ? null : esHombre ?? null,
    };
  }

  // ══════════════════════════════════════════
  // PUBLIC DATA BUILDERS
  // ══════════════════════════════════════════

  private buildPublicDataNoExiste(documento: string) {
    return {
      unemi_id: null,
      documento,
      nombre_completo: null,
      nombres: null,
      apellidos: null,
      es_mujer: null,
      es_hombre: null,
      usuario: null,
      email: null,
      email_institucional: null,
      password: null,
      es_admision: null,
      es_pregrado: null,
      perfiles: null,
    };
  }

  private buildPublicDataFromSearch(
    search: SearchResult,
    dto: GetStudentDataDto,
  ) {
    const username = this.extractUsername(search);
    const raw = this.extractNombreCompletoRaw(search);
    const parsed = raw ? splitNombreCompleto(raw) : null;
    const gender = this.extractGender(search);

    return {
      unemi_id: this.extractUnemiId(search),
      documento: dto.documento,
      nombre_completo: formatNombreCompleto(raw),
      nombres: parsed?.nombre?.trim() || null,
      apellidos: parsed?.apellido?.trim() || null,
      es_mujer: gender.es_mujer,
      es_hombre: gender.es_hombre,
      usuario: username,
      email: this.extractEmail(search),
      email_institucional: this.extractEmailInstitucional(search, username),
      password: null,
      es_admision: null,
      es_pregrado: null,
      perfiles: null,
    };
  }

  private buildPublicDataSinPerfiles(
    search: SearchResult,
    dto: GetStudentDataDto,
  ) {
    return this.buildPublicDataFromSearch(search, dto);
  }

  private buildPublicDataFichaSocioeconomica(
    search: SearchResult,
    dto: GetStudentDataDto,
  ) {
    const base = this.buildPublicDataFromSearch(search, dto);
    return { ...base, perfiles: ['ficha socioeconomica'] };
  }

  private buildPublicDataChangePassword(
    search: SearchResult,
    dto: GetStudentDataDto,
  ) {
    const base = this.buildPublicDataFromSearch(search, dto);
    return { ...base, perfiles: ['changepassword'] };
  }

  private buildPublicDataSuccess(
    search: SearchResult,
    dto: GetStudentDataDto,
    studentData: { hojaVida: any; malla: any; horario: any; materias: any },
    profiles: JwtProfile[],
    accessToken: string,
    refreshToken: string,
    loginSource: string | null,
    _changePasswordResult: any,
  ) {
    const username = this.extractUsername(search);
    const gender = this.extractGender(search, studentData.materias);

    // Names: priority → sga-materias > recovery > search
    const persona =
      studentData.materias?.data?.eMateriasAsignadas?.[0]?.matricula
        ?.inscripcion?.persona;

    let nombres: string | null = null;
    let apellidos: string | null = null;
    let nombreCompleto: string | null = null;

    if (persona?.nombres) {
      nombres = toNameCase(String(persona.nombres).trim());
      const ap1 = persona?.apellido1 ? String(persona.apellido1).trim() : '';
      const ap2 = persona?.apellido2 ? String(persona.apellido2).trim() : '';
      apellidos = toNameCase((ap1 + ' ' + ap2).trim());
      nombreCompleto = formatNombreCompleto(
        `${persona.nombres} ${ap1} ${ap2}`,
      );
    } else {
      const raw = this.extractNombreCompletoRaw(search);
      const parsed = raw ? splitNombreCompleto(raw) : null;
      nombres = parsed?.nombre?.trim() || null;
      apellidos = parsed?.apellido?.trim() || null;
      nombreCompleto = formatNombreCompleto(raw);
    }

    // Password logic
    let password: string | null = null;
    if (loginSource === 'sga-login_reset-password' || loginSource === 'sga-login_changepassword') {
      password = this.defaultPassword;
    } else if (accessToken && refreshToken) {
      password = safeStr(dto.password) ?? safeStr(dto.documento) ?? null;
    }

    // Profile IDs
    const perfilIds = profiles.map((p) => p.id).filter((id) => id != null);

    return {
      unemi_id: this.extractUnemiId(search),
      documento: dto.documento,
      nombre_completo: nombreCompleto,
      nombres,
      apellidos,
      es_mujer: gender.es_mujer,
      es_hombre: gender.es_hombre,
      usuario: username,
      email: this.extractEmail(search),
      email_institucional: this.extractEmailInstitucional(search, username),
      password,
      es_admision: studentData.materias?.data?.es_admision ?? null,
      es_pregrado: studentData.materias?.data?.es_pregrado ?? null,
      perfiles: perfilIds.length > 0 ? perfilIds : null,
    };
  }

  // ══════════════════════════════════════════
  // PRIVATE DATA BUILDER
  // ══════════════════════════════════════════

  private buildPrivateData(
    studentData: { hojaVida: any; malla: any; horario: any; materias: any },
    perfilId: string | number | null,
  ) {
    const materias = studentData.materias;
    const malla = studentData.malla;
    const hojaVida = studentData.hojaVida;
    const persona =
      materias?.data?.eMateriasAsignadas?.[0]?.matricula?.inscripcion?.persona;
    const carrera =
      materias?.data?.eMateriasAsignadas?.[0]?.matricula?.inscripcion?.carrera;
    const nivel =
      materias?.data?.eMateriasAsignadas?.[0]?.matricula?.nivel;

    return {
      id_perfil: safeStr(perfilId),
      carrera: safeStr(carrera?.display),
      carrera_alias: safeStr(carrera?.alias),
      periodo: safeStr(nivel?.periodo?.display),
      telefono: safeStr(persona?.telefono),
      telefono2: safeStr(persona?.telefono2),
      nacimiento: safeStr(
        materias?.data?.eMatricula?.inscripcion?.persona?.nacimiento,
      ),
      email: safeStr(persona?.email),
      facultad: safeStr(malla?.data?.eInscripcion?.coordinacion?.nombre),
      facultad_alias: safeStr(malla?.data?.eInscripcion?.coordinacion?.alias),
      foto_documento: safeStr(hojaVida?.data?.ePersona?.download_documento),
      update_at: new Date().toISOString(),
      hoja_vida: orNull(hojaVida),
      malla: orNull(malla),
      materias: orNull(malla), // n8n uses sga-malla for materias field too
    };
  }
}
