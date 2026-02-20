import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.post.deleteMany();
  await prisma.thread.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      password: passwordHash,
      avatarUrl: null,
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob@example.com',
      password: passwordHash,
      avatarUrl: null,
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: 'Carol Williams',
      email: 'carol@example.com',
      password: passwordHash,
      avatarUrl: null,
    },
  });

  const bookClub = await prisma.group.create({
    data: {
      name: 'Book Club',
      slug: 'book-club',
      description: '## Welcome to Book Club!\n\nA group for avid readers who love discussing books. We read one book per month and meet to discuss.',
      isPublic: true,
      createdById: alice.id,
    },
  });

  const hikers = await prisma.group.create({
    data: {
      name: 'Weekend Hikers',
      slug: 'weekend-hikers',
      description: '## Weekend Hikers\n\nJoin us for weekend hikes around the area. All skill levels welcome!',
      isPublic: true,
      createdById: bob.id,
    },
  });

  const devs = await prisma.group.create({
    data: {
      name: 'Local Dev Meetup',
      slug: 'local-dev-meetup',
      description: '## Local Dev Meetup\n\nMonthly meetups for developers. Share projects, learn new tech, network.',
      isPublic: true,
      createdById: carol.id,
    },
  });

  // Memberships
  await prisma.membership.createMany({
    data: [
      { userId: alice.id, groupId: bookClub.id, role: 'admin' },
      { userId: bob.id, groupId: bookClub.id, role: 'member' },
      { userId: carol.id, groupId: bookClub.id, role: 'admin' },
      { userId: bob.id, groupId: hikers.id, role: 'admin' },
      { userId: alice.id, groupId: hikers.id, role: 'member' },
      { userId: carol.id, groupId: devs.id, role: 'admin' },
      { userId: bob.id, groupId: devs.id, role: 'member' },
    ],
  });

  // Threads
  const thread1 = await prisma.thread.create({
    data: {
      groupId: bookClub.id,
      authorId: alice.id,
      title: 'January Book Pick: Project Hail Mary',
      body: "Let's read **Project Hail Mary** by Andy Weir this month!\n\nIt's a sci-fi novel about an astronaut who wakes up alone on a spaceship with no memory. Great read!",
      isPinned: true,
    },
  });

  const thread2 = await prisma.thread.create({
    data: {
      groupId: bookClub.id,
      authorId: bob.id,
      title: 'Favorite books of last year?',
      body: "What were everyone's favorite reads from last year? I'm looking for recommendations.\n\nMine was *Klara and the Sun* by Kazuo Ishiguro.",
    },
  });

  await prisma.thread.create({
    data: {
      groupId: hikers.id,
      authorId: bob.id,
      title: 'Saturday hike at Eagle Peak',
      body: "Meeting at the trailhead at **8am**. Bring water and snacks.\n\n### What to bring\n- Water (at least 2L)\n- Snacks\n- Sunscreen\n- Good hiking shoes",
      isPinned: true,
    },
  });

  // Posts (comments)
  const comment1 = await prisma.post.create({
    data: {
      threadId: thread1.id,
      authorId: bob.id,
      body: "Great pick! I've been wanting to read this one.",
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread1.id,
      authorId: carol.id,
      body: "I already read it — you're all in for a treat! No spoilers from me.",
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread1.id,
      authorId: alice.id,
      body: "Glad you're excited @Bob! Let's aim to discuss at the end of the month.",
      parentId: comment1.id,
    },
  });

  await prisma.post.create({
    data: {
      threadId: thread2.id,
      authorId: carol.id,
      body: "I loved *The Midnight Library* by Matt Haig. Highly recommend!",
    },
  });

  console.log('Seed data created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
