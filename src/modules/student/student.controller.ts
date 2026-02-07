import { Controller, Post, Body } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentDocumentDto } from './dto/student-document.dto';
import { Logger } from '@nestjs/common';

// Imports updated above
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Student')
@Controller('searchStudent')
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(private readonly studentService: StudentService) { }

  @Post('publicData')
  @ApiOperation({ summary: 'Get public student data (No login required)' })
  @ApiResponse({ status: 200, description: 'Public data retrieved successfully.' })
  publicData(@Body() dto: StudentDocumentDto) {
    this.logger.log(`Public data request for: ${dto.documento}`);
    return this.studentService.getStudentData({
      documento: dto.documento,
      password: dto.password,
      public: true,
      private: false,
      reset_password: false,
    });
  }

  @Post('privateData')
  @ApiOperation({ summary: 'Get private student data (Login required with optional reset)' })
  @ApiResponse({ status: 200, description: 'Private data retrieved successfully.' })
  privateData(@Body() dto: StudentDocumentDto) {
    this.logger.log(`Private data request for: ${dto.documento} (reset=${!!dto.reset_password})`);
    return this.studentService.getStudentData({
      documento: dto.documento,
      password: dto.password,
      public: true,
      private: true,
      reset_password: dto.reset_password ?? false,
    });
  }
}
