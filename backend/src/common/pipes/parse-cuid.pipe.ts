import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Matches CUID v1 — starts with 'c', 20-32 lowercase alphanumeric chars.
// Prisma's cuid() always produces this format.
const CUID_RE = /^c[a-z0-9]{20,32}$/;

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !CUID_RE.test(value)) {
      throw new BadRequestException(`Invalid ID format: "${value}"`);
    }
    return value;
  }
}
