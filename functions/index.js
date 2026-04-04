const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// 1. SLA Escalation Engine - Runs every hour
exports.checkSLABreaches = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
    const now = Date.now();
    const ticketsRef = db.collection('tickets');
    
    // Get all tickets that are not resolved, closed, or already breached
    const activeTickets = await ticketsRef.where('status', 'in', ['Submitted', 'Assigned', 'In Progress']).get();
    
    const batch = db.batch();
    let breachedCount = 0;

    activeTickets.forEach(doc => {
        const ticket = doc.data();
        const created = ticket.createdAt?.toMillis ? ticket.createdAt.toMillis() : Date.parse(ticket.createdAt);
        
        if (!created) return;

        const hoursElapsed = (now - created) / (1000 * 60 * 60);
        let slaLimit = 72; // default Medium
        
        switch (ticket.severity?.toLowerCase()) {
            case 'emergency': slaLimit = 12; break;
            case 'high': slaLimit = 24; break;
            case 'medium': slaLimit = 72; break;
            case 'low': slaLimit = 168; break;
        }

        if (hoursElapsed > slaLimit) {
            batch.update(doc.ref, {
                status: 'SLA_BREACHED',
                escalatedTo: 'Admin',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Write to audit log
            const auditRef = db.collection(`tickets/${doc.id}/auditLog`).doc();
            batch.set(auditRef, {
                actorId: 'System_Cron',
                action: `SLA BREACHED: Auto-escalated to Zonal Commissioner after ${Math.floor(hoursElapsed)} hours.`,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            breachedCount++;
        }
    });

    if (breachedCount > 0) {
        await batch.commit();
        console.log(`Successfully escalated ${breachedCount} tickets.`);
    }
    return null;
});

// 2. Predictive Infrastructure Decay - Runs once daily
exports.predictInfrastructureDecay = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    const db = admin.firestore();
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const recentTickets = await db.collection('tickets')
        .where('category', 'in', ['Roads', 'Water'])
        .where('createdAt', '>=', admin.firestore.Timestamp.fromMillis(sevenDaysAgo))
        .get();

    // Group by Ward/Location heuristic
    const zoneMap = {};
    recentTickets.forEach(doc => {
        const t = doc.data();
        // Fallback simulated grouping by 'zone' extracted from address or arbitrary region
        const zone = t.zone || 'Central';
        if (!zoneMap[zone]) zoneMap[zone] = 0;
        zoneMap[zone]++;
    });

    const batch = db.batch();
    let alertCreated = false;

    // Trigger alerts for 3+ critical infrastructure tickets in 7 days
    for (const [zone, count] of Object.entries(zoneMap)) {
        if (count >= 3) {
            const alertRef = db.collection('predictiveAlerts').doc();
            batch.set(alertRef, {
                zone: zone,
                message: `High Risk Zone Detected — possible infrastructure failure in ${zone}.`,
                ticketCount: count,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                active: true,
                severity: count >= 5 ? 'Critical' : 'Warning'
            });
            alertCreated = true;
        }
    }

    if (alertCreated) {
        await batch.commit();
        console.log('Predictive decay alerts generated.');
    }
    return null;
});
