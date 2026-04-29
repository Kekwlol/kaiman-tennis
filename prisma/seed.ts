import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.tenant.deleteMany({});

  const greinsfurth = await db.tenant.create({
    data: {
      slug: "greinsfurth",
      name: "TC Greinsfurth",
      primaryColor: "#EEFF00",
      modulesJson: JSON.stringify({
        reservation: true, payment: true, kiosk: true,
        ladder: true, tournament: true, teams: true, cms: true,
      }),
      iban: "AT00 0000 0000 0000 0000",
      vatNumber: "ATU00000000",
      courts: {
        create: [
          { name: "Platz 1", surface: "clay", category: "outdoor", order: 1 },
          { name: "Platz 2", surface: "clay", category: "outdoor", order: 2 },
          { name: "Platz 3", surface: "clay", category: "outdoor", order: 3 },
          { name: "Halle 1", surface: "indoor", category: "indoor", order: 4 },
        ],
      },
      members: {
        create: [
          { email: "max@example.com", name: "Max Muster", group: "adult", skillScore: 1200 },
          { email: "anna@example.com", name: "Anna Beispiel", group: "adult", skillScore: 1350 },
          { email: "lena@example.com", name: "Lena Schmid", group: "youth", skillScore: 950, birthdate: new Date("2010-05-12") },
          { email: "tom@example.com", name: "Tom Wagner", group: "adult", skillScore: 1100 },
          { email: "irma@example.com", name: "Irma Berger", group: "senior", skillScore: 1400 },
        ],
      },
      products: {
        create: [
          { name: "Mineralwasser 0,5l", category: "Getraenke", price: 200, cost: 60, stock: 24, vatRate: 2000 },
          { name: "Cola 0,33l", category: "Getraenke", price: 280, cost: 90, stock: 18, vatRate: 2000 },
          { name: "Kaffee", category: "Getraenke", price: 250, cost: 50, stock: 999, vatRate: 2000 },
          { name: "Schnitzelsemmel", category: "Speisen", price: 480, cost: 200, stock: 8, vatRate: 1000 },
          { name: "Tennisball-Dose", category: "Equipment", price: 990, cost: 600, stock: 12, vatRate: 2000 },
        ],
      },
      bookingRules: {
        create: [
          {
            name: "Erwachsene: 2/Woche, 24h Storno",
            scopeJson: JSON.stringify({ groups: ["adult", "senior"] }),
            maxPerWeek: 2,
            maxOpenBookings: 3,
            cancelDeadlineHours: 24,
            maxAdvanceDays: 14,
          },
          {
            name: "Jugend: 3/Woche bis 18 Uhr",
            scopeJson: JSON.stringify({ groups: ["youth", "child"], hourTo: 18 }),
            maxPerWeek: 3,
            maxAdvanceDays: 7,
            cancelDeadlineHours: 12,
          },
        ],
      },
      membershipTypes: {
        create: [
          { name: "Erwachsen 2026", fee: 24000, durationMonths: 12, resultingGroup: "adult" },
          { name: "Jugend 2026", fee: 12000, durationMonths: 12, resultingGroup: "youth" },
          { name: "Senior 2026", fee: 18000, durationMonths: 12, resultingGroup: "senior" },
          { name: "Familie 2026", fee: 50000, durationMonths: 12, resultingGroup: "family" },
        ],
      },
      newsItems: {
        create: [
          {
            title: "Saisonstart 2026",
            body: "Die Tennissaison startet am 1. Mai 2026. Alle Plätze frisch präpariert. Neuanmeldungen über das Mitglieds-Portal.",
          },
          {
            title: "Clubmeisterschaft 2026 - Anmeldung offen",
            body: "Die Clubmeisterschaft findet vom 14.-22. Juni statt. Jetzt über die Turnier-Seite anmelden.",
          },
        ],
      },
      sponsors: {
        create: [
          { name: "Wilson Sport", link: "https://wilson.com" },
          { name: "Sparkasse Amstetten" },
        ],
      },
      teams: {
        create: [
          {
            name: "Herren 1",
            league: "Niederösterreich Landesliga A",
            division: "Gruppe Nord",
          },
          {
            name: "Damen 1",
            league: "Niederösterreich Landesliga B",
          },
        ],
      },
    },
    include: { courts: true, members: true, teams: true },
  });

  // Preiszone + Tiers
  const zone = await db.priceZone.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Hauptzeit",
      color: "#EEFF00",
      defaultPrice: 1200,
      tiers: {
        create: [
          { hourFrom: 18, hourTo: 21, price: 1500, dayOfWeekMask: 0b0011110 }, // Mo-Do 18-21
          { hourFrom: 8, hourTo: 18, price: 800, dayOfWeekMask: 127 },
        ],
      },
    },
  });

  // Mitgliedschaft für Max
  const types = await db.membershipType.findMany({ where: { tenantId: greinsfurth.id } });
  const max = greinsfurth.members.find((m) => m.email === "max@example.com")!;
  await db.membershipPurchase.create({
    data: {
      tenantId: greinsfurth.id,
      memberId: max.id,
      typeId: types[0].id,
      validFrom: new Date("2026-01-01"),
      validUntil: new Date("2026-12-31"),
      pricePaid: 24000,
      paid: true,
    },
  });

  // Forderungspyramide
  const ladder = await db.ladder.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Herren Einzel 2026",
      format: "pyramid",
      matchType: "singles",
      category: "men",
      seasonStart: new Date("2026-04-01"),
      seasonEnd: new Date("2026-09-30"),
      participants: {
        create: greinsfurth.members.slice(0, 5).map((m, i) => ({
          memberId: m.id,
          position: i + 1,
        })),
      },
    },
  });

  // Eine offene Forderung
  await db.challenge.create({
    data: {
      ladderId: ladder.id,
      challengerId: greinsfurth.members[2].id, // Lena auf Pos 3 fordert Max auf Pos 1
      challengedId: greinsfurth.members[0].id,
      deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });

  // Turnier
  const tournament = await db.tournament.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Clubmeisterschaft 2026",
      format: "ko",
      matchType: "singles",
      drawSize: 8,
      registrationOpen: new Date("2026-05-01"),
      registrationClose: new Date("2026-06-10"),
      startsAt: new Date("2026-06-14"),
      endsAt: new Date("2026-06-22"),
      entryFee: 2000,
      status: "registration",
      entries: {
        create: greinsfurth.members.slice(0, 4).map((m, i) => ({
          memberId: m.id,
          seed: i + 1,
          paid: true,
        })),
      },
    },
  });

  // Mannschaftsspieler
  await db.teamMember.createMany({
    data: greinsfurth.teams[0]
      ? greinsfurth.members.slice(0, 4).map((m, i) => ({
          teamId: greinsfurth.teams[0].id,
          memberId: m.id,
          position: i + 1,
        }))
      : [],
  });
  await db.leagueMatch.create({
    data: {
      tenantId: greinsfurth.id,
      teamId: greinsfurth.teams[0].id,
      opponent: "TC Amstetten",
      isHome: true,
      date: new Date("2026-05-10"),
    },
  });

  // Kurs
  await db.course.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Kindertraining Ostern",
      type: "camp",
      description: "5 Tage Tenniscamp für Kinder von 7-12 Jahren",
      startsAt: new Date("2026-04-29T09:00:00"),
      endsAt: new Date("2026-05-03T16:00:00"),
      capacity: 16,
      minParticipants: 6,
      price: 12000,
      status: "published",
    },
  });

  // News + Sponsors sind bereits via nested erstellt

  // Demo-Buchung
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  await db.booking.create({
    data: {
      tenantId: greinsfurth.id,
      courtId: greinsfurth.courts[0].id,
      guestName: "Demo Buchung",
      startsAt: today,
      endsAt: new Date(today.getTime() + 3600 * 1000),
      source: "admin",
      pinCode: "1234",
      pricePaid: 1200,
    },
  });

  // Open-Play-Sessions
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);
  const session1 = await db.openSession.create({
    data: {
      tenantId: greinsfurth.id,
      hostId: greinsfurth.members[1].id,
      courtId: greinsfurth.courts[1].id,
      startsAt: tomorrow,
      endsAt: new Date(tomorrow.getTime() + 90 * 60 * 1000),
      format: "doubles",
      skillMin: 2.0,
      skillMax: 3.5,
      maxPlayers: 4,
      description: "Lockeres Doppel nach der Arbeit. Bringe ggf. neue Bälle mit.",
    },
  });
  await db.openSessionParticipant.create({
    data: { sessionId: session1.id, memberId: greinsfurth.members[3].id },
  });
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(10, 0, 0, 0);
  await db.openSession.create({
    data: {
      tenantId: greinsfurth.id,
      hostId: greinsfurth.members[2].id,
      startsAt: dayAfter,
      endsAt: new Date(dayAfter.getTime() + 60 * 60 * 1000),
      format: "singles",
      skillMin: 0,
      skillMax: 2.5,
      maxPlayers: 2,
      description: "Anfänger willkommen!",
    },
  });

  // Wallet für Max
  await db.wallet.create({
    data: { memberId: greinsfurth.members[0].id, balance: 5000 },
  });

  // Konten anlegen
  await db.account.createMany({
    data: [
      { tenantId: greinsfurth.id, code: "2700", name: "Bank", type: "asset" },
      { tenantId: greinsfurth.id, code: "2800", name: "Kasse", type: "asset" },
      { tenantId: greinsfurth.id, code: "4000", name: "Erlöse Mitgliedsbeitrag", type: "revenue" },
      { tenantId: greinsfurth.id, code: "4100", name: "Erlöse Reservierung", type: "revenue" },
      { tenantId: greinsfurth.id, code: "4200", name: "Erlöse Kiosk", type: "revenue" },
      { tenantId: greinsfurth.id, code: "5000", name: "Aufwand Material", type: "expense" },
      { tenantId: greinsfurth.id, code: "5100", name: "Aufwand Energie", type: "expense" },
    ],
  });

  // Gerate
  const lightDevice = await db.device.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Flutlicht-Relais",
      kind: "relay",
      endpoint: "http://192.168.1.50/cmd",
    },
  });
  await db.deviceMapping.createMany({
    data: greinsfurth.courts.slice(0, 3).map((c, i) => ({
      deviceId: lightDevice.id,
      courtId: c.id,
      channel: i,
      action: "light",
    })),
  });
  await db.device.create({
    data: {
      tenantId: greinsfurth.id,
      name: "Eingangstuer",
      kind: "exivo",
      endpoint: "https://api.exivo.com/v2/...",
    },
  });

  // Racketworld als zweiter Tenant mit anderem Branding
  await db.tenant.create({
    data: {
      slug: "racketworld",
      name: "Racketworld Wien",
      primaryColor: "#FF3366",
      customDomain: "racketworld.wien",
      domainStatus: "verified",
      modulesJson: JSON.stringify({
        reservation: true, payment: true, kiosk: true,
      }),
      courts: {
        create: [
          { name: "Halle 1", surface: "indoor", category: "indoor", order: 1 },
          { name: "Halle 2", surface: "indoor", category: "indoor", order: 2 },
          { name: "Halle 3", surface: "indoor", category: "indoor", order: 3 },
          { name: "Halle 4", surface: "indoor", category: "indoor", order: 4 },
        ],
      },
    },
  });

  console.log("Seed komplett.");
  console.log(`  greinsfurth: apiKey=${greinsfurth.apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
