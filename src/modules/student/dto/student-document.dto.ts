import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentDocumentDto {
    @ApiProperty({ example: '0900000000', description: 'Cédula or ID of the student' })
    @IsString()
    @IsNotEmpty()
    documento: string;

    @ApiProperty({ example: 'Unemi*2025', description: 'Password (optional). Defaults to ID if not provided.', required: false })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({ example: false, description: 'Attempt password reset if login fails', required: false })
    @IsOptional()
    @IsBoolean() // Should import IsBoolean
    reset_password?: boolean;
}
