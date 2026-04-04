import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Helper to determine SLA Hours based on strict Claude output
export function getSLAHours(severity) {
    switch (severity?.toLowerCase()) {
        case 'emergency': return 12;
        case 'high': return 24;
        case 'medium': return 72;
        case 'low': return 168;
        default: return 72; 
    }
}

// Check if a ticket has breached
export function isSlaBreached(createdAtMillis, severityHours) {
    if (!createdAtMillis) return false;
    const hoursElapsed = (Date.now() - createdAtMillis) / (1000 * 60 * 60);
    return hoursElapsed > severityHours;
}

// Logic to Escalate to Admin
export async function triggerSLAEscalation(ticketId, currentAssignee) {
    try {
        const ticketRef = doc(db, 'tickets', ticketId);
        await updateDoc(ticketRef, {
            status: 'SLA_BREACHED',
            assignedTo: 'admin',
            previousAssignee: currentAssignee || 'officer',
            updatedAt: serverTimestamp()
        });

        // Add Immutable Audit Log
        await logAuditAction(ticketId, 'System', 'SLA BREACHED: Ticket Auto-Escalated to Zonal Commissioner');

    } catch (error) {
        console.error("Escalation failed: ", error);
    }
}

export async function logAuditAction(ticketId, actorId, actionText, location = null) {
    try {
        await addDoc(collection(db, `tickets/${ticketId}/auditLog`), {
            actorId: actorId,
            action: actionText,
            timestamp: serverTimestamp(),
            location: location // {lat, lng} if available
        });
    } catch (e) {
        console.error("Audit Logging Error:", e);
    }
}

export function calculateSLA(severity) {
  const hours = { Emergency: 12, High: 24, Medium: 72, Low: 168 };
  return hours[severity] || 72;
}
