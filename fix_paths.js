const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixPaths() {
  console.log("Starting path fix...");
  const competitions = await prisma.competition.findMany();

  for (const comp of competitions) {
    let updated = false;

    // Fix main array of images
    const fixedImages = comp.images.map((img) => {
      // Fix instances where it says /public/filename.png instead of /public/uploads/filename.png
      if (img.includes("/public/") && !img.includes("/public/uploads/")) {
        updated = true;
        return img.replace("/public/", "/public/uploads/");
      }
      
      // Fix instances where it says /uploads/filename.png instead of /public/uploads/filename.png
      if (img.includes("/uploads/") && !img.includes("/public/uploads/")) {
        updated = true;
        return img.replace("/uploads/", "/public/uploads/");
      }
      
      return img;
    });

    // Fix single prize image
    let fixedPrizeImage = comp.prizeDetailImage;
    if (fixedPrizeImage) {
      if (fixedPrizeImage.includes("/public/") && !fixedPrizeImage.includes("/public/uploads/")) {
        fixedPrizeImage = fixedPrizeImage.replace("/public/", "/public/uploads/");
        updated = true;
      }
      if (fixedPrizeImage.includes("/uploads/") && !fixedPrizeImage.includes("/public/uploads/")) {
        fixedPrizeImage = fixedPrizeImage.replace("/uploads/", "/public/uploads/");
        updated = true;
      }
    }

    if (updated) {
      await prisma.competition.update({
        where: { id: comp.id },
        data: {
          images: fixedImages,
          prizeDetailImage: fixedPrizeImage,
        },
      });
      console.log(`Updated competition ID: ${comp.id}`);
    }
  }
  
  console.log("Path fix complete!");
}

fixPaths()
  .catch(console.error)
  .finally(() => prisma.$disconnect());