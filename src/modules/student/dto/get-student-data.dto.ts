import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { parseBoolean } from '../../../common/utils/boolean-parser.util';
import { ApiProperty } from '@nestjs/swagger';

export class GetStudentDataDto {
  @ApiProperty({ example: '0900000000', description: 'Cédula or ID of the student' })
  @IsString()
  @IsNotEmpty()
  documento: string;

  @ApiProperty({ example: 'Unemi*2025', description: 'Password (optional)', required: false })
  @IsOptional()
  @IsString()
  password?: string | null;

  @ApiProperty({ example: true, description: 'Retrieve public data' })
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  public: boolean;

  @ApiProperty({ example: true, description: 'Retrieve private data (requires login)' })
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  private: boolean;

  @ApiProperty({ example: false, description: 'Attempt password reset if login fails' })
  @Transform(({ value }) => parseBoolean(value))
  @IsBoolean()
  reset_password: boolean;
}
