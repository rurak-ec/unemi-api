import { Module } from '@nestjs/common';
import { MatriculacionService } from './matriculacion.service';

@Module({
  providers: [MatriculacionService],
  exports: [MatriculacionService],
})
export class MatriculacionModule {}
