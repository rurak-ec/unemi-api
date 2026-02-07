import { HttpException, HttpStatus } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constant';

export class StudentNotFoundException extends HttpException {
  constructor() {
    super(ERROR_MESSAGES.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}
