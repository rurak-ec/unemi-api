import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class StudentDocumentDto {
    @IsString()
    @IsNotEmpty()
    documento: string;

    @IsOptional()
    @IsString()
    password?: string;
}
