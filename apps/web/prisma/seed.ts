import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const agency = await prisma.agency.upsert({
    where: { id: "demo-agency" },
    update: {},
    create: {
      id: "demo-agency",
      name: "Blue Horizon Travel",
      users: {
        create: [
          { name: "Ava Admin", email: "admin@voyager.dev", passwordHash, role: "ADMIN" },
          { name: "Sam Agent", email: "agent@voyager.dev", passwordHash, role: "AGENT" },
        ],
      },
    },
  });

  const [admin, agent] = await prisma.user.findMany({
    where: { agencyId: agency.id },
    orderBy: { role: "asc" },
  });

  const clientsData = [
    { name: "Priya Sharma", email: "priya@example.com", phone: "+1-555-0101", stage: "BOOKED" as const, source: "Referral", ownerId: agent.id },
    { name: "Daniel Kim", email: "daniel@example.com", phone: "+1-555-0102", stage: "NEGOTIATION" as const, source: "Instagram", ownerId: agent.id },
    { name: "The Okafor Family", email: "okafor@example.com", phone: "+1-555-0103", stage: "PROPOSAL_SENT" as const, source: "Website", ownerId: admin.id },
    { name: "Maria Gonzalez", email: "maria@example.com", phone: "+1-555-0104", stage: "NEW_LEAD" as const, source: "Google Ads", ownerId: agent.id },
    { name: "James Whitfield", email: "james@example.com", phone: "+1-555-0105", stage: "CONTACTED" as const, source: "Referral", ownerId: admin.id },
  ];

  for (const data of clientsData) {
    const client = await prisma.client.create({
      data: {
        agencyId: agency.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        stage: data.stage,
        source: data.source,
        ownerId: data.ownerId,
        interactions: {
          create: [
            {
              type: "EMAIL",
              subject: "Initial inquiry",
              content: "Reached out about a potential trip.",
              userId: data.ownerId,
              occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            },
          ],
        },
      },
    });

    if (data.stage === "BOOKED" || data.stage === "NEGOTIATION") {
      const startDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 37);
      await prisma.trip.create({
        data: {
          agencyId: agency.id,
          clientId: client.id,
          ownerId: data.ownerId,
          title: `${data.name.split(" ")[0]}'s getaway`,
          destination: "Lisbon, Portugal",
          startDate,
          endDate,
          travelers: 2,
          budgetAmount: 4500,
          currency: "USD",
          status: data.stage === "BOOKED" ? "CONFIRMED" : "QUOTED",
        },
      });
    }
  }

  console.log("Seed complete. Login with admin@voyager.dev / password123 or agent@voyager.dev / password123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
