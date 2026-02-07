import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constant';

export class AuthenticationFailedException extends HttpException {
  constructor(message?: string) {
    super(message ?? ERROR_MESSAGES.AUTHENTICATION_FAILED, HttpStatus.UNAUTHORIZED);
  }
}
