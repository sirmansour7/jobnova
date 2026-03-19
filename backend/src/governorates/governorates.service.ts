import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { CacheKeys, CacheTTL } from '../common/cache-keys';

@Injectable()
export class GovernoratesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  async getAll(search?: string) {
    // Only cache the unfiltered list — search results are too varied to be useful
    if (!search) {
      const cached = await this.cache.get(CacheKeys.GOVERNORATES_ALL);
      if (cached) return cached;
    }

    const where = search ? { name: { contains: search } } : undefined;
    const items = await this.prisma.governorate.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { cities: true } } },
    });
    const result = { items, total: items.length };

    if (!search) {
      await this.cache.set(
        CacheKeys.GOVERNORATES_ALL,
        result,
        CacheTTL.SIX_HOURS,
      );
    }

    return result;
  }

  async getOne(id: string) {
    const key = CacheKeys.governorate(id);
    const cached = await this.cache.get(key);
    if (cached) return cached;

    const gov = await this.prisma.governorate.findUnique({
      where: { id },
      include: { _count: { select: { cities: true } } },
    });
    if (!gov) throw new NotFoundException('Governorate not found');

    await this.cache.set(key, gov, CacheTTL.SIX_HOURS);
    return gov;
  }

  async getCities(governorateId: string, search?: string) {
    const gov = await this.prisma.governorate.findUnique({
      where: { id: governorateId },
    });
    if (!gov) throw new NotFoundException('Governorate not found');

    // Only cache unfiltered city lists
    const key = CacheKeys.cities(governorateId);
    if (!search) {
      const cached = await this.cache.get(key);
      if (cached) return cached;
    }

    const where: { governorateId: string; name?: { contains: string } } = {
      governorateId,
    };
    if (search) where.name = { contains: search };

    const cities = await this.prisma.city.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    const result = { items: cities, total: cities.length };

    if (!search) {
      await this.cache.set(key, result, CacheTTL.SIX_HOURS);
    }

    return result;
  }

  async createGovernorate(name: string) {
    const existing = await this.prisma.governorate.findUnique({
      where: { name },
    });
    if (existing) throw new ConflictException('Governorate already exists');

    const gov = await this.prisma.governorate.create({
      data: { name },
      include: { _count: { select: { cities: true } } },
    });

    await this.cache.del(CacheKeys.GOVERNORATES_ALL);
    return gov;
  }

  async updateGovernorate(id: string, name: string) {
    const gov = await this.prisma.governorate.findUnique({ where: { id } });
    if (!gov) throw new NotFoundException('Governorate not found');

    const updated = await this.prisma.governorate.update({
      where: { id },
      data: { name },
      include: { _count: { select: { cities: true } } },
    });

    await Promise.all([
      this.cache.del(CacheKeys.GOVERNORATES_ALL),
      this.cache.del(CacheKeys.governorate(id)),
    ]);
    return updated;
  }

  async deleteGovernorate(id: string) {
    const gov = await this.prisma.governorate.findUnique({ where: { id } });
    if (!gov) throw new NotFoundException('Governorate not found');
    await this.prisma.governorate.delete({ where: { id } });

    await Promise.all([
      this.cache.del(CacheKeys.GOVERNORATES_ALL),
      this.cache.del(CacheKeys.governorate(id)),
      this.cache.del(CacheKeys.cities(id)),
    ]);
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

    const city = await this.prisma.city.create({
      data: { name, governorateId },
    });

    await this.cache.del(CacheKeys.cities(governorateId));
    return city;
  }

  async updateCity(cityId: string, name: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');

    const updated = await this.prisma.city.update({
      where: { id: cityId },
      data: { name },
    });

    await this.cache.del(CacheKeys.cities(city.governorateId));
    return updated;
  }

  async deleteCity(cityId: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new NotFoundException('City not found');
    await this.prisma.city.delete({ where: { id: cityId } });

    await this.cache.del(CacheKeys.cities(city.governorateId));
    return { message: 'City deleted' };
  }
}
