import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from '../http-client/http-client.service';
import { API_ENDPOINTS } from '../../common/constants/api-endpoints.constant';
import { PosgradoRecoveryResult } from '../student/interfaces/search-result.interface';

@Injectable()
export class SeleccionPosgradoService {
  private readonly logger = new Logger(SeleccionPosgradoService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClientService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'posgrado.baseUrl',
      'https://seleccionposgrado.unemi.edu.ec',
    );
  }

  async recoveryPassword(documento: string): Promise<PosgradoRecoveryResult> {
    const url = this.baseUrl + API_ENDPOINTS.POSGRADO.RECOVERY_PASSWORD;
    return this.http.post(
      url,
      new URLSearchParams({
        action: 'searchPOSGRADO',
        documento,
      }).toString(),
      {
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-language': 'es-US,es-419;q=0.9,es;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRFToken':
            'l8SPDxMkY1fpM89rXwyUK34tmOaq3AlSSAKAXI8gTsk8Sz0ayosgJzf5NZ2ksCxJ',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie':
            '_ga=GA1.1.728013978.1761357380; _ga_MWP31MWNNN=GS2.1.s1763497826$o8$g1$t1763497826$j60$l0$h0; csrftoken=l8SPDxMkY1fpM89rXwyUK34tmOaq3AlSSAKAXI8gTsk8Sz0ayosgJzf5NZ2ksCxJ; sessionid=1r8st8rasqs7ody5a593uazu5uodhm0j',
          'Referer':
            'https://seleccionposgrado.unemi.edu.ec/loginpostulacion',
        },
      },
    );
  }
}
