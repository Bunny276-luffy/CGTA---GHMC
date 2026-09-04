import { getRepository } from '../lib/db';
import fs from 'fs';

async function main() {
  const repo = getRepository();
  await repo.setupDatabase();
  
  const id = fs.readFileSync('test-id.txt', 'utf-8').trim();
  
  const allComplaints = await repo.getAllComplaints();
  const complaint = allComplaints.find(c => c.id === id);
  if (!complaint) {
    throw new Error("Complaint not found in step 2. Persistence failed.");
  }
  
  await repo.updateComplaintStatus(id, 'RESOLVED');
  console.log(`Updated status to RESOLVED for complaint ID: ${id}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
