import { Controller, Post, Body } from '@nestjs/common';
import { StudentService } from './student.service';
import { GetStudentDataDto } from './dto/get-student-data.dto';
import { StudentDocumentDto } from './dto/student-document.dto';
import { Logger } from '@nestjs/common';

// Imports updated above
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Student')
@Controller('student')
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(private readonly studentService: StudentService) { }

  @Post('data')
  @ApiOperation({ summary: 'Legacy endpoint (Internal use)' })
  getStudentData(@Body() dto: GetStudentDataDto) {
    return this.studentService.getStudentData(dto);
  }

  @Post('public')
  @ApiOperation({ summary: 'Get public student data (No login required)' })
  @ApiResponse({ status: 200, description: 'Public data retrieved successfully.' })
  getPublicData(@Body() dto: StudentDocumentDto) {
    this.logger.log(`Public data request for: ${dto.documento}`);
    return this.studentService.getStudentData({
      documento: dto.documento,
      password: dto.password,
      public: true,
      private: false,
      reset_password: false,
    });
  }

  @Post('private')
  @ApiOperation({ summary: 'Get private student data (Login required)' })
  @ApiResponse({ status: 200, description: 'Private data retrieved successfully.' })
  getPrivateData(@Body() dto: StudentDocumentDto) {
    this.logger.log(`Private data request for: ${dto.documento}`);
    return this.studentService.getStudentData({
      documento: dto.documento,
      password: dto.password,
      public: true, // Implied true as per user request (or should it be just private? User said "private se sobreentiende que public aqui es true")
      private: true,
      reset_password: false,
    });
  }

  @Post('reset')
  @ApiOperation({ summary: 'Get student data with password reset flow' })
  @ApiResponse({ status: 200, description: 'Data retrieved with potential password reset.' })
  resetPassword(@Body() dto: StudentDocumentDto) {
    this.logger.log(`Reset password request for: ${dto.documento}`);
    return this.studentService.getStudentData({
      documento: dto.documento,
      password: dto.password,
      public: true, // "reset se sobreentinee true los 2 anteiores" -> public=true, private=true
      private: true,
      reset_password: true,
    });
  }
}
