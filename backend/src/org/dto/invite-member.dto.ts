import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { OrgRoleInOrg } from '@prisma/client';

export class InviteMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(OrgRoleInOrg)
  @IsNotEmpty()
  role: OrgRoleInOrg;
}
