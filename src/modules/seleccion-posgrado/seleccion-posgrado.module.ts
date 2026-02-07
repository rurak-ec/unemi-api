import { Module } from '@nestjs/common';
import { SeleccionPosgradoService } from './seleccion-posgrado.service';

@Module({
  providers: [SeleccionPosgradoService],
  exports: [SeleccionPosgradoService],
})
export class SeleccionPosgradoModule {}
