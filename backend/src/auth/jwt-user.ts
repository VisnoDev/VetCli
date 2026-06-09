import { Role } from '@prisma/client';

export type JwtUser = {
  id: string;
  email: string;
  role: Role;
  clinicaId: string;
};
