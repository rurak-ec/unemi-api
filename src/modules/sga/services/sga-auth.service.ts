import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../../http-client/http-client.service';
import { API_ENDPOINTS } from '../../../common/constants/api-endpoints.constant';
import { SgaRecoveryResult } from '../../student/interfaces/search-result.interface';

const SGA_HEADERS = {
  origin: 'https://sgaestudiante.unemi.edu.ec',
  referer: 'https://sgaestudiante.unemi.edu.ec/login',
};

@Injectable()
export class SgaAuthService {
  private readonly logger = new Logger(SgaAuthService.name);
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

  async recoveryPassword(documento: string): Promise<SgaRecoveryResult> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.RECOVERY_PASSWORD;
    return this.http.post(url, {
      action: 'searchPerson',
      documento,
    }, {
      headers: {
        'Accept': '*/*',
        'Accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
        'Content-Type': 'application/json',
        'Origin': 'https://sgaestudiante.unemi.edu.ec',
        'Referer': 'https://sgaestudiante.unemi.edu.ec/login',
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
      },
    });
  }

  async login(username: string, password: string): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.LOGIN;
    return this.http.post(
      url,
      {
        username,
        password,
        clientNavegador: 'Chrome 143',
        clientOS: 'Linux -',
        clientScreensize: '1920 x 1200',
        otp_verified_token: null,
      },
      { headers: SGA_HEADERS },
    );
  }

  async changePassword(
    accessToken: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.CHANGE_PASSWORD;
    return this.http.post(
      url,
      {
        action: 'changePassword',
        password1: oldPassword,
        password2: newPassword,
        password3: newPassword,
      },
      {
        bearerToken: accessToken,
        headers: {
          referer: 'https://sgaestudiante.unemi.edu.ec/changepass',
          origin: 'https://sgaestudiante.unemi.edu.ec',
        },
      },
    );
  }

  async changeCareer(
    refreshToken: string,
    perfilId: string,
  ): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.SGA.CHANGE_CAREER;
    return this.http.post(
      url,
      {
        perfil_id: String(perfilId).trim(),
        refresh: String(refreshToken).trim(),
      },
      {
        headers: {
          Referer: 'https://sgaestudiante.unemi.edu.ec/',
        },
      },
    );
  }
}
