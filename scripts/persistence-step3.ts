import { getRepository } from '../lib/db';
import fs from 'fs';

async function main() {
  const repo = getRepository();
  await repo.setupDatabase();
  
  const id = fs.readFileSync('test-id.txt', 'utf-8').trim();
  
  const allComplaints = await repo.getAllComplaints();
  const complaint = allComplaints.find(c => c.id === id);
  if (!complaint) {
    throw new Error("Complaint not found in step 3. Persistence failed.");
  }
  
  if (complaint.status !== 'RESOLVED') {
    throw new Error(`Expected status to be RESOLVED but got ${complaint.status}`);
  }
  
  console.log(`Verified status is RESOLVED for complaint ID: ${id}`);
  
  // Cleanup
  fs.unlinkSync('test-id.txt');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
