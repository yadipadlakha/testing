import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@traveleverywhere.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin = existingAdmin
    ? await prisma.user.update({ where: { id: existingAdmin.id }, data: { role: "ADMIN" } })
    : await prisma.user.create({
        data: { name: "Admin", email: adminEmail, passwordHash: await bcrypt.hash("password123", 12), role: "ADMIN" },
      });
  console.log(
    existingAdmin ? `Demo admin already exists: ${adminEmail} (role ensured)` : `Created demo admin. Login with ${adminEmail} / password123`,
  );

  const employeeEmail = "employee@traveleverywhere.com";
  let employee = await prisma.user.findUnique({ where: { email: employeeEmail } });
  if (!employee) {
    const passwordHash = await bcrypt.hash("password123", 12);
    employee = await prisma.user.create({
      data: {
        name: "Priya Sharma",
        email: employeeEmail,
        passwordHash,
        role: "EMPLOYEE",
        createdById: admin.id,
        permissions: { create: [{ module: "ENQUIRY" }, { module: "HOTEL" }] },
      },
    });
    console.log(`Created demo employee. Login with ${employeeEmail} / password123`);
  } else {
    console.log(`Demo employee already exists: ${employeeEmail}`);
  }

  const existingEnquiries = await prisma.enquiry.count();
  if (existingEnquiries === 0) {
    const sampleClients = [
      { name: "Laxmi Marathe", phone: "7567447555", email: "info@statustours.in", companyName: "Status Tours" },
      { name: "Neha Shevade", phone: "8087236106", email: "neha.shevade@sotc.in", companyName: "LT Short Haul" },
      { name: "Nimesh Soni", phone: "1234567890", email: "jntour7707@gmail.com", companyName: "JN Tour" },
      { name: "Riddhi Kanani", phone: "7202008444", email: "traveljcube@gmail.com", companyName: "Travel Jcube" },
      { name: "Tina Panthaki", phone: "9820924047", email: "tina.panthaki@in.fcm.travel", companyName: "FCM Travel" },
    ];

    const clients = await Promise.all(
      sampleClients.map((c) => prisma.client.create({ data: c })),
    );

    const sampleEnquiries: Array<{
      clientIndex: number;
      status: "NEW_QUERY" | "QUOTATION_SENT" | "ON_HOLD" | "CONVERTED" | "FOLLOW_UP" | "LOST";
      travelTo: string;
      daysFromNow: number;
      durationDays: number;
      adults: number;
      children: number;
      childrenAges?: string;
      hotelCategory?: number;
      currency: string;
      allocatedTo: "admin" | "employee";
    }> = [
      { clientIndex: 0, status: "NEW_QUERY", travelTo: "Sri Lanka", daysFromNow: 23, durationDays: 6, adults: 3, children: 0, hotelCategory: 4, currency: "LKR", allocatedTo: "employee" },
      { clientIndex: 1, status: "NEW_QUERY", travelTo: "Hong Kong, Macau", daysFromNow: 84, durationDays: 4, adults: 3, children: 0, currency: "HKD", allocatedTo: "admin" },
      { clientIndex: 2, status: "QUOTATION_SENT", travelTo: "Japan", daysFromNow: 69, durationDays: 11, adults: 5, children: 2, childrenAges: "8, 12", hotelCategory: 4, currency: "JPY", allocatedTo: "employee" },
      { clientIndex: 3, status: "ON_HOLD", travelTo: "Seychelles", daysFromNow: 134, durationDays: 6, adults: 2, children: 0, hotelCategory: 5, currency: "SCR", allocatedTo: "admin" },
      { clientIndex: 4, status: "FOLLOW_UP", travelTo: "Mauritius", daysFromNow: 75, durationDays: 4, adults: 2, children: 0, currency: "MUR", allocatedTo: "employee" },
      { clientIndex: 0, status: "CONVERTED", travelTo: "Maldives", daysFromNow: 45, durationDays: 5, adults: 2, children: 1, childrenAges: "5", hotelCategory: 5, currency: "MVR", allocatedTo: "employee" },
      { clientIndex: 1, status: "LOST", travelTo: "Bali", daysFromNow: -10, durationDays: 7, adults: 2, children: 0, currency: "IDR", allocatedTo: "admin" },
    ];

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    for (const e of sampleEnquiries) {
      await prisma.enquiry.create({
        data: {
          clientId: clients[e.clientIndex].id,
          status: e.status,
          type: "HOLIDAY_PACKAGE",
          travelTo: e.travelTo,
          travelDate: new Date(now + e.daysFromNow * day),
          durationDays: e.durationDays,
          adults: e.adults,
          children: e.children,
          childrenAges: e.childrenAges,
          hotelCategory: e.hotelCategory,
          currency: e.currency,
          allocatedToId: e.allocatedTo === "admin" ? admin.id : employee.id,
          createdById: admin.id,
        },
      });
    }
    console.log(`Created ${sampleEnquiries.length} sample enquiries.`);
  } else {
    console.log(`Sample enquiries already exist (${existingEnquiries}), skipping.`);
  }

  const existingHotels = await prisma.hotel.count();
  if (existingHotels === 0) {
    await prisma.hotel.createMany({
      data: [
        {
          name: "Cinnamon Grand Colombo",
          destination: "Sri Lanka",
          starRating: 5,
          pricePerNight: 12500,
          contactPerson: "Ravi Fernando",
          contactPhone: "+94 11 249 7000",
          createdById: admin.id,
        },
        {
          name: "Conrad Maldives Rangali Island",
          destination: "Maldives",
          starRating: 5,
          pricePerNight: 45000,
          contactPerson: "Aisha Waheed",
          contactPhone: "+960 668 0629",
          createdById: admin.id,
        },
        {
          name: "Hotel Nikko Narita",
          destination: "Japan",
          starRating: 4,
          pricePerNight: 9800,
          contactPerson: "Kenji Sato",
          contactPhone: "+81 476 32 0031",
          createdById: admin.id,
        },
      ],
    });
    console.log("Created 3 sample hotels.");
  } else {
    console.log(`Sample hotels already exist (${existingHotels}), skipping.`);
  }

  const existingActivities = await prisma.sightseeing.count();
  if (existingActivities === 0) {
    await prisma.sightseeing.createMany({
      data: [
        {
          name: "Sigiriya Rock Fortress Tour",
          destination: "Sri Lanka",
          duration: "Full Day",
          price: 3500,
          createdById: admin.id,
        },
        {
          name: "Mount Fuji & Hakone Day Trip",
          destination: "Japan",
          duration: "Full Day",
          price: 6200,
          createdById: admin.id,
        },
        {
          name: "Sunset Dolphin Cruise",
          destination: "Maldives",
          duration: "Half Day",
          price: 2800,
          createdById: admin.id,
        },
      ],
    });
    console.log("Created 3 sample sightseeing activities.");
  } else {
    console.log(`Sample sightseeing activities already exist (${existingActivities}), skipping.`);
  }

  const existingVehicles = await prisma.transport.count();
  if (existingVehicles === 0) {
    await prisma.transport.createMany({
      data: [
        {
          vehicleType: "Sedan",
          destination: "Sri Lanka",
          capacity: 4,
          pricePerDay: 4500,
          contactPerson: "Sunil Perera",
          contactPhone: "+94 77 123 4567",
          createdById: admin.id,
        },
        {
          vehicleType: "Tempo Traveller",
          destination: "Japan",
          capacity: 12,
          pricePerDay: 15000,
          contactPerson: "Hiroshi Tanaka",
          contactPhone: "+81 90 1234 5678",
          createdById: admin.id,
        },
      ],
    });
    console.log("Created 2 sample transport vendors.");
  } else {
    console.log(`Sample transport vendors already exist (${existingVehicles}), skipping.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
