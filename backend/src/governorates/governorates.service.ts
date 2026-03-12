import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GovernoratesService {
  constructor(private prisma: PrismaService) {}

  async getAll(search?: string) {
    const where = search ? { name: { contains: search } } : undefined;

    const items = await this.prisma.governorate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { cities: true } } },
    });

    return { items, total: items.length };
  }

  async getOne(id: string) {
    const gov = await this.prisma.governorate.findUnique({
      where: { id },
      include: { _count: { select: { cities: true } } },
    });
    if (!gov) throw new NotFoundException('Governorate not found');
    return gov;
  }

  async getCities(governorateId: string, search?: string) {
    const gov = await this.prisma.governorate.findUnique({
      where: { id: governorateId },
    });
    if (!gov) throw new NotFoundException('Governorate not found');

    const where: any = { governorateId };
    if (search) where.name = { contains: search };

    const cities = await this.prisma.city.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return { items: cities, total: cities.length };
  }

  async createGovernorate(name: string) {
    const existing = await this.prisma.governorate.findUnique({
      where: { name },
    });
    if (existing) throw new ConflictException('Governorate already exists');

    return this.prisma.governorate.create({
      data: { name },
      include: { _count: { select: { cities: true } } },
    });
  }

  async updateGovernorate(id: string, name: string) {
    const gov = await this.prisma.governorate.findUnique({ where: { id } });
    if (!gov) throw new NotFoundException('Governorate not found');

    return this.prisma.governorate.update({
      where: { id },
      data: { name },
      include: { _count: { select: { cities: true } } },
    });
  }

  async deleteGovernorate(id: string) {
    const gov = await this.prisma.governorate.findUnique({ where: { id } });
    if (!gov) throw new NotFoundException('Governorate not found');
    await this.prisma.governorate.delete({ where: { id } });
    return { message: 'Governorate deleted' };
  }

  async createCity(governorateId: string, name: string) {
    const gov = await this.prisma.governorate.findUnique({
      where: { id: governorateId },
    });
    if (!gov) throw new NotFoundException('Governorate not found');

    const existing = await this.prisma.city.findUnique({
      where: { name_governorateId: { name, governorateId } },
    });
    if (existing)
      throw new ConflictException('City already exists in this governorate');

    return this.prisma.city.create({ data: { name, governorateId } });
  }

  async updateCity(cityId: string, name: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');

    return this.prisma.city.update({ where: { id: cityId }, data: { name } });
  }

  async deleteCity(cityId: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');
    await this.prisma.city.delete({ where: { id: cityId } });
    return { message: 'City deleted' };
  }
}
