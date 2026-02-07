import { Module } from '@nestjs/common';
import { SgaAuthService } from './services/sga-auth.service';
import { SgaStudentService } from './services/sga-student.service';

@Module({
  providers: [SgaAuthService, SgaStudentService],
  exports: [SgaAuthService, SgaStudentService],
})
export class SgaModule {}
