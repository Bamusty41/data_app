import { PrismaClient } from '@prisma/client';

/**
 * Config model – holds global settings for the VTU platform.
 * Currently only one row is expected:
 *   primaryProvider: 'INLOMAX' | 'HUSMODATA'
 *   failoverMode: 'AUTOMATIC' | 'MANUAL'
 */
export const prisma = new PrismaClient();

export interface Config {
  id: number;
  primaryProvider: string;
  failoverMode: string;
}

// Helper to ensure a single config row exists
export async function getConfig(): Promise<Config> {
  let cfg = await prisma.config.findFirst();
  if (!cfg) {
    cfg = await prisma.config.create({
      data: { primaryProvider: 'INLOMAX', failoverMode: 'AUTOMATIC' },
    });
  }
  return cfg as Config;
}

export async function updateConfig(data: Partial<Config>): Promise<Config> {
  const cfg = await getConfig();
  const updated = await prisma.config.update({
    where: { id: cfg.id },
    data,
  });
  return updated as Config;
}
