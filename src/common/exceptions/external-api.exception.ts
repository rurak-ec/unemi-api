import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constant';

export class ExternalApiException extends HttpException {
  constructor(service: string, originalError?: any) {
    super(
      ERROR_MESSAGES.EXTERNAL_API_ERROR(service) +
        (originalError?.message ? `: ${originalError.message}` : ''),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
