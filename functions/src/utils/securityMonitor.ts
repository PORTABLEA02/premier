import * as admin from 'firebase-admin';

interface SecurityIncident {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  details: any;
}

export const securityMonitor = {
  async logIncident(incident: SecurityIncident): Promise<void> {
    try {
      await admin.firestore().collection('securityLogs').add({
        ...incident,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        resolved: false
      });

      // Send alert to admins for high/critical incidents
      if (incident.severity === 'high' || incident.severity === 'critical') {
        await this.alertAdmins(incident);
      }

    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'incident de sécurité:', error);
    }
  },

  async alertAdmins(incident: SecurityIncident): Promise<void> {
    try {
      const admins = await admin.firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      const notifications = admins.docs.map(adminDoc => ({
        userId: adminDoc.id,
        title: `Alerte de sécurité - ${incident.severity.toUpperCase()}`,
        message: `Incident détecté: ${incident.type}. Vérification requise.`,
        type: 'error',
        read: false,
        relatedType: 'security',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }));

      const batch = admin.firestore().batch();
      notifications.forEach(notification => {
        const notifRef = admin.firestore().collection('notifications').doc();
        batch.set(notifRef, notification);
      });
      await batch.commit();

    } catch (error) {
      console.error('Erreur lors de l\'envoi d\'alertes aux admins:', error);
    }
  },

  async checkSuspiciousActivity(userId: string): Promise<boolean> {
    try {
      const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);
      
      // Check for multiple failed attempts
      const recentIncidents = await admin.firestore()
        .collection('securityLogs')
        .where('userId', '==', userId)
        .where('timestamp', '>=', oneHourAgo)
        .where('type', 'in', ['validation_failure', 'suspicious_activity'])
        .get();

      if (recentIncidents.size >= 5) {
        await this.logIncident({
          type: 'suspicious_user_activity',
          severity: 'high',
          userId,
          details: {
            incidentCount: recentIncidents.size,
            timeWindow: '1 hour'
          }
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la vérification d\'activité suspecte:', error);
      return false;
    }
  }
};