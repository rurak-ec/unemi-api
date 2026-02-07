import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../http-client/http-client.service';
import { API_ENDPOINTS } from '../../../common/constants/api-endpoints.constant';

const SGA_STUDENT_HEADERS = {
  origin: 'https://sgaestudiante.unemi.edu.ec',
};

@Injectable()
export class SgaStudentService {
  private readonly logger = new Logger(SgaStudentService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClientService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'sga.baseUrl',
      'https://sga.unemi.edu.ec/api/1.0/jwt',
    );
  }

  async getHojaVida(accessToken: string): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.HOJA_VIDA;
    return this.http.get(url, {
      bearerToken: accessToken,
      params: { action: 'loadDatosPersonales' },
      headers: {
        ...SGA_STUDENT_HEADERS,
        referer: 'https://sgaestudiante.unemi.edu.ec/th_hojavida',
      },
    });
  }

  async getMalla(accessToken: string): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.MALLA;
    return this.http.get(url, {
      bearerToken: accessToken,
      headers: {
        ...SGA_STUDENT_HEADERS,
        referer: 'https://sgaestudiante.unemi.edu.ec/alu_malla',
      },
    });
  }

  async getHorario(accessToken: string): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.HORARIO;
    return this.http.get(url, {
      bearerToken: accessToken,
      headers: {
        ...SGA_STUDENT_HEADERS,
        referer: 'https://sgaestudiante.unemi.edu.ec/alu_horarios',
      },
    });
  }

  async getMaterias(accessToken: string): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.MATERIAS;
    return this.http.get(url, {
      bearerToken: accessToken,
      headers: {
        ...SGA_STUDENT_HEADERS,
        referer: 'https://sgaestudiante.unemi.edu.ec/alu_materias',
      },
    });
  }

  /** Executes all 4 calls IN PARALLEL for better performance */
  async getAllStudentData(accessToken: string): Promise<{
    hojaVida: any;
    malla: any;
    horario: any;
    materias: any;
  }> {
    const [hojaVida, malla, horario, materias] = await Promise.all([
      this.getHojaVida(accessToken),
      this.getMalla(accessToken),
      this.getHorario(accessToken),
      this.getMaterias(accessToken),
    ]);
    return { hojaVida, malla, horario, materias };
  }
}
