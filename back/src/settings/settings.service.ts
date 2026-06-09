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

    async updateSettings(data: any) {
        const settings =
            await this.getSettings();

        return this.prisma.setting.update({
            where: {
                id: settings.id,
            },
            data,
        });
    }


}