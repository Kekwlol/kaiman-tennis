import { db } from "./db";

// Generischer Hardware-Adapter (Strategy Pattern)
// Production-Implementierungen sind nur Stubs - rufen externe APIs auf.

type DeviceCommand = {
  action: "on" | "off" | "open" | "grant" | "revoke";
  channel?: number;
  pinCode?: string;
  validFrom?: Date;
  validUntil?: Date;
};

interface DeviceAdapter {
  execute(deviceId: string, cmd: DeviceCommand): Promise<{ ok: boolean; message?: string }>;
}

const adapters: Record<string, DeviceAdapter> = {
  relay: {
    async execute(deviceId, cmd) {
      const device = await db.device.findUnique({ where: { id: deviceId } });
      if (!device) return { ok: false, message: "DEVICE_NOT_FOUND" };
      // Production: HTTP POST an device.endpoint
      console.log(`[relay:${device.name}] ${cmd.action} channel=${cmd.channel}`);
      return { ok: true };
    },
  },
  exivo: {
    async execute(deviceId, cmd) {
      // dormakaba Exivo API: https://api.exivo.com/v2/...
      console.log(`[exivo:${deviceId}] ${cmd.action}`, { pin: cmd.pinCode });
      return { ok: true };
    },
  },
  comydo: {
    async execute(deviceId, cmd) {
      console.log(`[comydo:${deviceId}] ${cmd.action}`, { pin: cmd.pinCode });
      return { ok: true };
    },
  },
  mqtt: {
    async execute(deviceId, cmd) {
      // MQTT-Publish an device.endpoint (broker)
      console.log(`[mqtt:${deviceId}] publish`, cmd);
      return { ok: true };
    },
  },
  salto: { async execute(id, cmd) { console.log("[salto]", id, cmd); return { ok: true }; } },
  tedee: { async execute(id, cmd) { console.log("[tedee]", id, cmd); return { ok: true }; } },
  nuki:  { async execute(id, cmd) { console.log("[nuki]",  id, cmd); return { ok: true }; } },
};

export async function executeDevice(deviceId: string, cmd: DeviceCommand) {
  const device = await db.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error("DEVICE_NOT_FOUND");
  const adapter = adapters[device.kind];
  if (!adapter) throw new Error(`NO_ADAPTER:${device.kind}`);

  let res: { ok: boolean; message?: string };
  try {
    res = await adapter.execute(deviceId, cmd);
  } catch (e) {
    res = { ok: false, message: (e as Error).message };
  }

  await db.deviceLog.create({
    data: {
      deviceId,
      action: cmd.action,
      status: res.ok ? "ok" : "error",
      message: res.message ?? null,
    },
  });
  return res;
}

// Cron-Job: Vor Reservierungen Licht/Heizung an, danach aus
export async function syncDeviceState() {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);

  const upcoming = await db.booking.findMany({
    where: {
      status: "confirmed",
      OR: [
        { startsAt: { gte: windowStart, lte: windowEnd } },
        { endsAt: { gte: windowStart, lte: windowEnd } },
      ],
    },
    include: { court: { include: { deviceMappings: true } } },
  });

  for (const b of upcoming) {
    for (const mapping of b.court.deviceMappings) {
      if (mapping.action !== "light" && mapping.action !== "heat") continue;
      const isActive = b.startsAt <= new Date(now.getTime() + 15 * 60 * 1000) &&
        b.endsAt >= new Date(now.getTime() - 15 * 60 * 1000);
      await executeDevice(mapping.deviceId, {
        action: isActive ? "on" : "off",
        channel: mapping.channel,
      });
    }
  }
}
