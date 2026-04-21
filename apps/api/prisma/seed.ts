import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const trainerUser = await prisma.user.upsert({
    where: { email: "trainer@example.com" },
    update: {},
    create: {
      role: "trainer",
      email: "trainer@example.com",
      passwordHash: "seed-placeholder-hash",
      displayName: "Demo Trainer",
      trainer: {
        create: {}
      }
    },
    include: { trainer: true }
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      role: "student",
      email: "student@example.com",
      passwordHash: "seed-placeholder-hash",
      displayName: "Demo Student",
      student: {
        create: {}
      }
    },
    include: { student: true }
  });

  if (!trainerUser.trainer || !studentUser.student) {
    throw new Error("Seed failed: trainer/student profiles are missing.");
  }

  const group = await prisma.group.create({
    data: {
      trainerId: trainerUser.trainer.id,
      name: "Demo Group"
    }
  });

  await prisma.groupMembership.create({
    data: {
      groupId: group.id,
      studentId: studentUser.student.id
    }
  });

  const exercise = await prisma.exercise.create({
    data: {
      slug: "barbell-squat",
      name: "Barbell Squat",
      category: "legs"
    }
  });

  const program = await prisma.program.create({
    data: {
      trainerId: trainerUser.trainer.id,
      name: "Starter Strength",
      workouts: {
        create: [
          {
            title: "Workout A",
            dayOrder: 1,
            exercises: {
              create: [
                {
                  exerciseId: exercise.id,
                  position: 1,
                  plannedWeight: 40,
                  plannedReps: 5
                }
              ]
            }
          }
        ]
      }
    }
  });

  await prisma.assignment.create({
    data: {
      programId: program.id,
      studentId: studentUser.student.id,
      isActive: true
    }
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
