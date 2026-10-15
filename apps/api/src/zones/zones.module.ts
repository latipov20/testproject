import { Controller, Get, Headers, Module } from '@nestjs/common';
import { langFrom } from '../common/i18n';
import { PrismaService } from '../prisma/prisma.service';

@Controller('delivery-zones')
class ZonesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Headers('accept-language') al?: string) {
    const lang = langFrom(al);
    const zones = await this.prisma.deliveryZone.findMany({ where: { active: true }, orderBy: { id: 'asc' } });
    return zones.map((z) => ({
      id: z.id,
      region: lang === 'ru' ? z.regionRu : z.regionUz,
      district: z.district,
      fee: z.fee,
      daysMin: z.daysMin,
      daysMax: z.daysMax,
    }));
  }
}

@Module({ controllers: [ZonesController] })
export class ZonesModule {}
