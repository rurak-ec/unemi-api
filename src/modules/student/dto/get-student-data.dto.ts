import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseBoolean } from '../../../common/utils/boolean-parser.util';

export class GetStudentDataDto {
  @IsString()
  @IsNotEmpty()
  documento: string;

  @IsOptional()
  @IsString()
  password?: string | null;

  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  public: boolean;

  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  private: boolean;

  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  reset_password: boolean;
}
