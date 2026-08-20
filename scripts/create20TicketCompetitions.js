const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createCompetitions() {
  console.log("Starting creation of max-20 ticket competitions...");
  await prisma.$connect();

  const now = new Date();
  const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago (Live)
  const endTime = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

  const competitionsData = [
    {
      title: "Porsche 911 GT3 RS Weissach Package",
      slug: "porsche-911-gt3-rs-weissach-20-tickets",
      productType: "car_bike",
      ticketPrice: 25.00,
      totalTickets: 20,
      soldTickets: 0,
      startTime: startTime,
      endTime: endTime,
      isFeatured: 1,
      isHero: 1,
      detail: "Exclusive 20-ticket draw for a brand new Porsche 911 GT3 RS with Weissach Package! Ultra-low odds competition with strictly 20 tickets available nationwide.",
      images: [
        "/uploads/1783062614052-ferrari1.png",
        "/uploads/1783062614036-ferrari2.png",
        "/uploads/1780297862992-ferrari3.png"
      ],
      prizes: {
        create: [
          {
            position: 1,
            title: "Porsche 911 GT3 RS + £5,000 Cash",
            prizeDetail: "Brand new 2024 Porsche 911 GT3 RS in GT Silver Metallic with Weissach Package, Ceramic Composite Brakes, Front Axle Lift System, and £5,000 cash transferred on delivery.",
            prizeDetailImage: "/uploads/1783062614052-ferrari1.png",
            prizeFeatures: [
              "4.0L Naturally Aspirated Flat-6 (518 HP)",
              "Weissach Package Carbon Trim & Magnesium Wheels",
              "PCCB Ceramic Composite Brakes & Lift System",
              "PDK 7-Speed Dual-Clutch Transmission",
              "£5,000 Cash Allowance for Insurance & Fuel"
            ]
          }
        ]
      },
      questions: {
        create: [
          {
            question: "What German city is Porsche headquartered in?",
            options: ["Stuttgart", "Munich", "Berlin"],
            answers: ["Stuttgart"]
          }
        ]
      },
      contentSections: {
        create: [
          {
            position: 1,
            title: "Track Performance & Aerodynamics",
            description: "Featuring drag reduction system (DRS) and active front diffuser generating up to 860kg of downforce at 177mph.",
            specs: ["0-60 mph in 3.0 seconds", "Top speed 184 mph", "9,000 RPM Rev Limit", "Full Carbon Bucket Seats"],
            image: "/uploads/1783062614036-ferrari2.png"
          }
        ]
      }
    },
    {
      title: "£10,000 Tax-Free Cash Stack",
      slug: "10000-tax-free-cash-stack-20-tickets",
      productType: "cash",
      ticketPrice: 15.00,
      totalTickets: 20,
      soldTickets: 0,
      startTime: startTime,
      endTime: endTime,
      isFeatured: 1,
      isHero: 0,
      detail: "Win £10,000 straight into your bank account! Ultra-exclusive draw capped at strictly 20 tickets total. Same-day instant bank transfer guaranteed upon winner verification.",
      images: [
        "/uploads/1782983254144-cash.png",
        "/uploads/1782983254124-cash2.png"
      ],
      prizes: {
        create: [
          {
            position: 1,
            title: "£10,000 Cash Transfer",
            prizeDetail: "£10,000 tax-free cash transferred directly to the winner's UK/Irish bank account within 24 hours of the live draw.",
            prizeDetailImage: "/uploads/1782983254144-cash.png",
            prizeFeatures: [
              "£10,000 Instant Wire Transfer",
              "100% Tax-Free Winnings",
              "Maximum 20 Tickets Total",
              "1 in 20 Odds of Winning",
              "Guaranteed Live Draw Date"
            ]
          }
        ]
      },
      questions: {
        create: [
          {
            question: "Which currency is officially used in the United Kingdom?",
            options: ["Pound Sterling", "Euro", "US Dollar"],
            answers: ["Pound Sterling"]
          }
        ]
      },
      contentSections: {
        create: [
          {
            position: 1,
            title: "Instant Payout Guarantee",
            description: "Once the live draw completes and winner answer is validated, funds are transferred via UK Faster Payments directly to your bank account.",
            specs: ["Tax Free Cash", "20 Ticket Maximum", "Faster Payments Transfer", "No Deductions"],
            image: "/uploads/1782983254124-cash2.png"
          }
        ]
      }
    },
    {
      title: "Cartier Santos Watch & Apple Tech Package",
      slug: "cartier-santos-watch-apple-tech-20-tickets",
      productType: "tech_luxury",
      ticketPrice: 20.00,
      totalTickets: 20,
      soldTickets: 0,
      startTime: startTime,
      endTime: endTime,
      isFeatured: 1,
      isHero: 0,
      detail: "Win an iconic Cartier Santos de Cartier Large Model in Steel alongside the ultimate Apple Tech Bundle including iPhone 16 Pro Max 512GB and 16-inch MacBook Pro M3 Max.",
      images: [
        "/uploads/1779435211008-cartier4.png",
        "/uploads/1779435253398-cartier2.png",
        "/uploads/1780297863026-iphone.webp"
      ],
      prizes: {
        create: [
          {
            position: 1,
            title: "Cartier Santos De Cartier + Apple Bundle",
            prizeDetail: "Brand new unworn Cartier Santos De Cartier Large Model in Stainless Steel with interchangeable calfskin strap, Apple iPhone 16 Pro Max 512GB, and 16-inch MacBook Pro M3 Max.",
            prizeDetailImage: "/uploads/1779435211008-cartier4.png",
            prizeFeatures: [
              "Cartier Santos De Cartier Large Model (WSSA0018)",
              "Automatic Calibre 1847 MC Movement",
              "QuickSwitch Interchangeable Bracelet & Strap System",
              "Apple iPhone 16 Pro Max (512GB Storage)",
              "16-inch MacBook Pro (M3 Max Chip, 36GB RAM)"
            ]
          }
        ]
      },
      questions: {
        create: [
          {
            question: "What city is Cartier luxury brand originally from?",
            options: ["Paris", "Geneva", "Milan"],
            answers: ["Paris"]
          }
        ]
      },
      contentSections: {
        create: [
          {
            position: 1,
            title: "Unrivalled Luxury & Cutting-Edge Tech",
            description: "A combination of timeless horology and world-leading personal technology delivered brand new with original boxes and manufacturer warranty.",
            specs: ["Cartier 100m Water Resistance", "Interchangeable Straps", "Apple M3 Max Chip", "Full Warranty Included"],
            image: "/uploads/1779435253398-cartier2.png"
          }
        ]
      }
    },
    {
      title: "Range Rover Sport Autobiography P530 V8",
      slug: "range-rover-sport-autobiography-v8-20-tickets",
      productType: "car_bike",
      ticketPrice: 30.00,
      totalTickets: 20,
      soldTickets: 0,
      startTime: startTime,
      endTime: endTime,
      isFeatured: 1,
      isHero: 0,
      detail: "The pinnacle of luxury performance SUVs. Win this stunning Range Rover Sport Autobiography P530 V8 with Shadow Exterior Pack, 23-inch Forged Wheels, and Meridian 3D Surround Sound.",
      images: [
        "/uploads/1783054523389-rangerover6.jpg",
        "/uploads/1783054523331-rangerover5.jpg"
      ],
      prizes: {
        create: [
          {
            position: 1,
            title: "Range Rover Sport Autobiography V8 + £3,000 Cash",
            prizeDetail: "2024 Range Rover Sport Autobiography P530 Twin Turbo V8 in Santorini Black with Semi-Aniline Leather, Executive Climate Seats, and £3,000 cash for insurance & running costs.",
            prizeDetailImage: "/uploads/1783054523389-rangerover6.jpg",
            prizeFeatures: [
              "4.4L Twin Turbo V8 Engine (523 HP / 750 Nm)",
              "Meridian 3D Surround Sound System (1,430W)",
              "23-inch Style 5135 Gloss Black Wheels",
              "Digital LED Headlights with Signature DRL",
              "£3,000 Cash Support Included"
            ]
          }
        ]
      },
      questions: {
        create: [
          {
            question: "Which automotive company manufactures the Range Rover Sport?",
            options: ["Land Rover", "Audi", "Porsche"],
            answers: ["Land Rover"]
          }
        ]
      },
      contentSections: {
        create: [
          {
            position: 1,
            title: "Executive Luxury & V8 Power",
            description: "Combining dynamic sports handling with unmatched off-road capability and sublime luxury refinement.",
            specs: ["0-60 mph in 4.3s", "Adaptive Off-Road Cruise", "Dynamic Air Suspension", "Pivi Pro 13.1-inch Touchscreen"],
            image: "/uploads/1783054523331-rangerover5.jpg"
          }
        ]
      }
    }
  ];

  for (const data of competitionsData) {
    // Check if slug already exists to prevent duplicate error
    const existing = await prisma.competition.findUnique({ where: { slug: data.slug } });
    if (existing) {
      console.log(`Competition with slug ${data.slug} already exists (ID #${existing.id}). Skipping.`);
      continue;
    }
    const created = await prisma.competition.create({
      data,
      include: {
        prizes: true,
        questions: true,
        contentSections: true
      }
    });
    console.log(`Successfully created competition: ID #${created.id} - ${created.title} (Max Tickets: ${created.totalTickets})`);
  }

  console.log("Competitions process completed!");
}

createCompetitions()
  .catch((err) => {
    console.error("Error creating competitions:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
