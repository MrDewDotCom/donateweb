import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/src/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';


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

    async updateSettings(data: UpdateSettingsDto) {
        const settings =
            await this.getSettings();

        return this.prisma.setting.update({
            where: {
                id: settings.id,
            },
            data,
        });
    }
    async getSetting() {
        return this.prisma.setting.findFirst();
    }

    async updateSetting(
        dto: UpdateSettingsDto,
    ) {
        return this.prisma.setting.update({
            where: { id: 1 },
            data: dto,
        });
    }


}