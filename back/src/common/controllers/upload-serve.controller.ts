import {
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Query,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { verifySignedUpload } from 'src/common/utils/signed-url.util';

@Controller('uploads')
export class UploadsServeController {
    @Get(':filename')
    serve(
        @Param('filename') filename: string,
        @Query('expires') expires: string,
        @Query('token') token: string,
        @Res() res: Response,
    ) {
        // กัน path traversal — filename ต้องไม่มี path separator
        if (filename.includes('/') || filename.includes('\\')) {
            throw new ForbiddenException('ชื่อไฟล์ไม่ถูกต้อง');
        }

        if (!verifySignedUpload(filename, expires, token)) {
            throw new ForbiddenException('ลิงก์หมดอายุหรือไม่ถูกต้อง');
        }

        const uploadsDir = path.resolve('./uploads');
        const filePath = path.join(uploadsDir, filename);

        if (!filePath.startsWith(uploadsDir + path.sep)) {
            throw new ForbiddenException('ชื่อไฟล์ไม่ถูกต้อง');
        }

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException('ไม่พบไฟล์');
        }

        return res.sendFile(filePath);
    }
}