import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';


@Injectable()
export class SettingsService {
    constructor(
        private prisma: PrismaService,
    ) { }

    async getSettings() {
        let settings =
            await this.prisma.setting.findFirst();

        if (!settings) {
            settings =
                await this.prisma.setting.create({
                    data: {},
                });
        }

        return settings;
    }
}