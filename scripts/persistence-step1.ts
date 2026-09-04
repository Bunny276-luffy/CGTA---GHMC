import { getRepository } from '../lib/db';
import fs from 'fs';

async function main() {
  const repo = getRepository();
  await repo.setupDatabase();
  
  // Create a user to satisfy FK constraint
  let user = await repo.getUserByEmail('test@example.com');
  if (!user) {
    user = await repo.createUser({
      name: 'Test User',
      email: 'test@example.com',
      role: 'CITIZEN',
      password_hash: 'hashed'
    });
  }
  
  const complaint = await repo.createComplaint({
    title: "Persistence test",
    description: "Persistence test",
    category: "Pothole",
    address: "123 DB Street",
    latitude: 17.0,
    longitude: 78.0,
    severity: "HIGH",
    anonymous: false,
    status: "SUBMITTED",
    created_by_id: user.id
  });

  console.log(`Created complaint with ID: ${complaint.id}`);
  
  // Write the ID to a temp file so step 2 can read it
  fs.writeFileSync('test-id.txt', complaint.id);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
