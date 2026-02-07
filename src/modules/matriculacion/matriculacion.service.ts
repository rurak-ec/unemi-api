import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../http-client/http-client.service';
import { API_ENDPOINTS } from '../../common/constants/api-endpoints.constant';
import { MatriculacionSearchResult } from '../student/interfaces/search-result.interface';

@Injectable()
export class MatriculacionService {
  private readonly logger = new Logger(MatriculacionService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClientService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'matriculacion.baseUrl',
      'https://matriculacion-api.unemi.edu.ec/api/matricula/v1.0.0',
    );
  }

  async searchPersona(documento: string): Promise<MatriculacionSearchResult> {
    const url = this.baseUrl + API_ENDPOINTS.MATRICULACION.SEARCH_PERSONA;
    return this.http.post(url, { documento }, {
      headers: {
        referer: 'https://matriculacion.unemi.edu.ec/auth/signIn/',
      },
    });
  }

  async resetPassword(
    tempToken: string,
    username: string,
    newPassword: string,
  ): Promise<any> {
    const url = this.baseUrl + API_ENDPOINTS.MATRICULACION.RESET_PASSWORD;
    return this.http.post(
      url,
      {
        username,
        password1: newPassword,
        password2: newPassword,
      },
      {
        bearerToken: tempToken,
        headers: {
          referer: 'https://matriculacion.unemi.edu.ec/recover_password/',
        },
      },
    );
  }
}
