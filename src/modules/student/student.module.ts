import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { SgaModule } from '../sga/sga.module';
import { SeleccionPosgradoModule } from '../seleccion-posgrado/seleccion-posgrado.module';
import { MatriculacionModule } from '../matriculacion/matriculacion.module';

@Module({
  imports: [SgaModule, SeleccionPosgradoModule, MatriculacionModule],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
