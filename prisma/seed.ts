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

  const existingActivityTypes = await prisma.sightseeingActivityType.count();
  if (existingActivityTypes === 0) {
    await prisma.sightseeingActivityType.createMany({
      data: [{ name: "Cultural Tour" }, { name: "Cruise" }, { name: "Adventure" }, { name: "Early Entry Pass" }],
    });
    console.log("Created 4 sample activity types.");
  } else {
    console.log(`Sample activity types already exist (${existingActivityTypes}), skipping.`);
  }

  const existingActivities = await prisma.sightseeing.count();
  if (existingActivities === 0) {
    const culturalType = await prisma.sightseeingActivityType.findUnique({ where: { name: "Cultural Tour" } });
    const cruiseType = await prisma.sightseeingActivityType.findUnique({ where: { name: "Cruise" } });

    const sigiriya = await prisma.sightseeing.create({
      data: {
        name: "Sigiriya Rock Fortress Tour",
        country: "Sri Lanka",
        city: "Dambulla",
        starRating: 4.5,
        duration: "Full Day",
        price: 3500,
        contactPhone: "+94 81 249 8000",
        tourSummary: "Guided full-day tour of the ancient Sigiriya rock fortress, a UNESCO World Heritage Site.",
        activityTypes: culturalType ? { connect: { id: culturalType.id } } : undefined,
        createdById: admin.id,
      },
    });

    const fuji = await prisma.sightseeing.create({
      data: {
        name: "Mount Fuji & Hakone Day Trip",
        country: "Japan",
        city: "Hakone",
        starRating: 4.8,
        duration: "Full Day",
        price: 6200,
        tourSummary: "Scenic day trip to Mount Fuji's 5th station and Lake Ashi with a cable car ride.",
        activityTypes: culturalType ? { connect: { id: culturalType.id } } : undefined,
        createdById: admin.id,
      },
    });

    await prisma.sightseeing.create({
      data: {
        name: "Sunset Dolphin Cruise",
        country: "Maldives",
        city: "Male",
        starRating: 4.2,
        duration: "Half Day",
        price: 2800,
        tourSummary: "Evening cruise to spot spinner dolphins with refreshments on board.",
        activityTypes: cruiseType ? { connect: { id: cruiseType.id } } : undefined,
        createdById: admin.id,
      },
    });

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await prisma.sightseeingRate.create({
      data: {
        sightseeingId: sigiriya.id,
        title: "Standard season",
        startDate: new Date(now - 30 * day),
        endDate: new Date(now + 180 * day),
        daysOfWeek: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
        adultRate: 3500,
        minAdult: 1,
        childRate: 1800,
        minChild: 0,
        maxChild: 4,
        infantRate: 0,
        cancelPolicy: "Free cancellation up to 24 hours before the activity.",
      },
    });
    await prisma.sightseeingRate.create({
      data: {
        sightseeingId: fuji.id,
        title: "Peak season",
        startDate: new Date(now - 30 * day),
        endDate: new Date(now + 180 * day),
        daysOfWeek: ["SAT", "SUN"],
        adultRate: 7500,
        childRate: 4200,
        infantRate: 0,
        cancelPolicy: "Non-refundable within 48 hours of the activity.",
      },
    });

    console.log("Created 3 sample sightseeing activities with rate bands.");
  } else {
    console.log(`Sample sightseeing activities already exist (${existingActivities}), skipping.`);
  }

  const existingVehicles = await prisma.transport.count();
  if (existingVehicles === 0) {
    const sedan = await prisma.transport.create({
      data: {
        vehicleType: "Sedan",
        subType: "Toyota Camry",
        acType: "AC",
        seats: 4,
        vehicleNumber: "WP-CAB-2451",
        tripTypes: ["OUTSTATION", "AIRPORT"],
        title: "AC Sedan — Sigiriya Transfers",
        location: "Colombo, Sri Lanka",
        packagesStarting: "Half Day / Full Day / Outstation",
        pricePerKm: 65,
        pricePerHour: 450,
        recommendedDriver: "Sunil Perera",
        amenities: ["Wifi", "Charging Point", "Water Bottle"],
        createdById: admin.id,
      },
    });

    const tempoTraveller = await prisma.transport.create({
      data: {
        vehicleType: "Tempo Traveller",
        subType: "Force Traveller 12-Seater",
        acType: "AC",
        seats: 12,
        vehicleNumber: "JP-TRV-8827",
        tripTypes: ["OUTSTATION", "LOCAL"],
        title: "AC Tempo Traveller — Fuji Group Tours",
        location: "Tokyo, Japan",
        packagesStarting: "Full Day / Outstation",
        pricePerKm: 120,
        pricePerHour: 900,
        recommendedDriver: "Hiroshi Tanaka",
        amenities: ["Wifi", "Music", "Charging Point", "Reading Light", "Blanket"],
        createdById: admin.id,
      },
    });

    console.log("Created 2 sample vehicles.");

    const existingRoutes = await prisma.transportRoute.count();
    if (existingRoutes === 0) {
      const sigiriyaActivity = await prisma.sightseeing.findFirst({ where: { name: "Sigiriya Rock Fortress Tour" } });
      const fujiActivity = await prisma.sightseeing.findFirst({ where: { name: "Mount Fuji & Hakone Day Trip" } });

      const sigiriyaRoute = await prisma.transportRoute.create({
        data: {
          name: "Colombo to Sigiriya",
          destinations: ["Colombo", "Dambulla", "Sigiriya"],
          itineraryText: "Depart Colombo early morning, drive via Dambulla, arrive Sigiriya for the rock fortress tour, return evening.",
          actualDistanceKm: 170,
          displayDistanceKm: 170,
          itineraryDurationHours: 10,
          activities: sigiriyaActivity ? { connect: { id: sigiriyaActivity.id } } : undefined,
          createdById: admin.id,
        },
      });

      const fujiRoute = await prisma.transportRoute.create({
        data: {
          name: "Tokyo to Mount Fuji",
          destinations: ["Tokyo", "Hakone", "Mount Fuji"],
          itineraryText: "Depart Tokyo, drive to Mount Fuji 5th station, continue to Lake Ashi in Hakone, return via Tokyo expressway.",
          actualDistanceKm: 210,
          displayDistanceKm: 210,
          itineraryDurationHours: 12,
          activities: fujiActivity ? { connect: { id: fujiActivity.id } } : undefined,
          createdById: admin.id,
        },
      });

      console.log("Created 2 sample transport routes.");

      await prisma.transportRoutePricing.createMany({
        data: [
          {
            transportId: sedan.id,
            routeId: sigiriyaRoute.id,
            pricePerKm: 65,
            nightCharge: 500,
            tollTax: 300,
            driverAllowance: 1000,
            totalPrice: 12850,
          },
          {
            transportId: tempoTraveller.id,
            routeId: fujiRoute.id,
            pricePerKm: 120,
            nightCharge: 800,
            tollTax: 1200,
            driverAllowance: 1500,
            totalPrice: 28700,
          },
        ],
      });
      console.log("Created 2 sample route pricing entries.");
    } else {
      console.log(`Sample transport routes already exist (${existingRoutes}), skipping.`);
    }
  } else {
    console.log(`Sample vehicles already exist (${existingVehicles}), skipping.`);
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
