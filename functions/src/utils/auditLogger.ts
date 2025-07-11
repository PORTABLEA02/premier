import * as admin from 'firebase-admin';

interface AuditLogEntry {
  action: string;
  userId: string;
  resourceId?: string;
  details: any;
  timestamp: admin.firestore.FieldValue;
  ip?: string;
  userAgent?: string;
}

export const auditLogger = {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await admin.firestore().collection('auditLogs').add({
        ...entry,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du log d\'audit:', error);
    }
  },

  async logUserAction(userId: string, action: string, details: any): Promise<void> {
    await this.log({
      action,
      userId,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  },

  async logSystemAction(action: string, details: any): Promise<void> {
    await this.log({
      action,
      userId: 'system',
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  },

  async logSecurityEvent(userId: string, event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any): Promise<void> {
    await this.log({
      action: `security_${event}`,
      userId,
      details: {
        ...details,
        severity,
        eventType: 'security'
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Also log to security logs collection for easier monitoring
    await admin.firestore().collection('securityLogs').add({
      userId,
      event,
      severity,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
};