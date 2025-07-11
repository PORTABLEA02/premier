import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import validation functions
import { validateServiceRequest } from './validators/serviceRequestValidator';
import { validateUserData } from './validators/userValidator';
import { validateFamilyMember } from './validators/familyMemberValidator';
import { auditLogger } from './utils/auditLogger';
import { securityMonitor } from './utils/securityMonitor';

// Service Request Validation
export const onServiceRequestCreate = functions.firestore
  .document('serviceRequests/{requestId}')
  .onCreate(async (snap, context) => {
    const requestId = context.params.requestId;
    const data = snap.data();
    
    try {
      // Log the creation attempt
      await auditLogger.log({
        action: 'service_request_created',
        userId: data.userId,
        resourceId: requestId,
        details: {
          service: data.service,
          amount: data.amount,
          status: data.status
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      // Validate the service request
      const validation = await validateServiceRequest(data, requestId);
      
      if (!validation.isValid) {
        // Mark as invalid and add error comments
        await snap.ref.update({
          status: 'rejected',
          comments: `Validation échouée: ${validation.errors.join(', ')}`,
          reviewedBy: 'Système de validation',
          responseDate: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log security incident
        await securityMonitor.logIncident({
          type: 'validation_failure',
          severity: 'medium',
          userId: data.userId,
          details: {
            requestId,
            errors: validation.errors,
            data: data
          }
        });

        // Send notification to user
        await admin.firestore().collection('notifications').add({
          userId: data.userId,
          title: 'Demande rejetée',
          message: `Votre demande a été automatiquement rejetée: ${validation.errors.join(', ')}`,
          type: 'error',
          read: false,
          relatedId: requestId,
          relatedType: 'request',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return;
      }

      // If validation passes, send notification to admins
      const admins = await admin.firestore()
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      const notifications = admins.docs.map(adminDoc => ({
        userId: adminDoc.id,
        title: 'Nouvelle demande de service',
        message: `${data.memberName} a soumis une demande de ${data.service} pour ${data.amount.toLocaleString()} FCFA`,
        type: 'info',
        read: false,
        relatedId: requestId,
        relatedType: 'request',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }));

      // Batch write notifications
      const batch = admin.firestore().batch();
      notifications.forEach(notification => {
        const notifRef = admin.firestore().collection('notifications').doc();
        batch.set(notifRef, notification);
      });
      await batch.commit();

    } catch (error) {
      console.error('Erreur lors de la validation de la demande:', error);
      
      await securityMonitor.logIncident({
        type: 'system_error',
        severity: 'high',
        userId: data.userId,
        details: {
          error: error.message,
          requestId,
          function: 'onServiceRequestCreate'
        }
      });
    }
  });

// User Data Validation
export const onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const data = snap.data();
    
    try {
      const validation = await validateUserData(data);
      
      if (!validation.isValid) {
        await securityMonitor.logIncident({
          type: 'invalid_user_data',
          severity: 'high',
          userId: userId,
          details: {
            errors: validation.errors,
            data: data
          }
        });
      }

      await auditLogger.log({
        action: 'user_created',
        userId: userId,
        details: {
          email: data.email,
          role: data.role,
          status: data.status
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Erreur lors de la validation utilisateur:', error);
    }
  });

// Family Member Validation
export const onFamilyMemberCreate = functions.firestore
  .document('familyMembers/{memberId}')
  .onCreate(async (snap, context) => {
    const memberId = context.params.memberId;
    const data = snap.data();
    
    try {
      const validation = await validateFamilyMember(data);
      
      if (!validation.isValid) {
        // Delete invalid family member
        await snap.ref.delete();
        
        await securityMonitor.logIncident({
          type: 'invalid_family_member',
          severity: 'medium',
          userId: data.userId,
          details: {
            errors: validation.errors,
            memberId
          }
        });

        return;
      }

      await auditLogger.log({
        action: 'family_member_added',
        userId: data.userId,
        resourceId: memberId,
        details: {
          memberName: `${data.firstName} ${data.lastName}`,
          relationship: data.relationship
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

    } catch (error) {
      console.error('Erreur lors de la validation du membre famille:', error);
    }
  });

// Security monitoring for suspicious activities
export const onUserUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const userId = context.params.userId;
    const before = change.before.data();
    const after = change.after.data();
    
    // Check for suspicious changes
    const suspiciousChanges = [];
    
    if (before.role !== after.role) {
      suspiciousChanges.push(`Role changed from ${before.role} to ${after.role}`);
    }
    
    if (before.status !== after.status) {
      suspiciousChanges.push(`Status changed from ${before.status} to ${after.status}`);
    }
    
    if (suspiciousChanges.length > 0) {
      await securityMonitor.logIncident({
        type: 'suspicious_user_modification',
        severity: 'high',
        userId: userId,
        details: {
          changes: suspiciousChanges,
          before: before,
          after: after
        }
      });
    }

    await auditLogger.log({
      action: 'user_updated',
      userId: userId,
      details: {
        changes: suspiciousChanges
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  });

// Rate limiting for service requests
export const checkRequestRateLimit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const userId = context.auth.uid;
  const now = admin.firestore.Timestamp.now();
  const oneHourAgo = admin.firestore.Timestamp.fromMillis(now.toMillis() - 60 * 60 * 1000);

  try {
    // Check requests in the last hour
    const recentRequests = await admin.firestore()
      .collection('serviceRequests')
      .where('userId', '==', userId)
      .where('submissionDate', '>=', oneHourAgo.toDate().toISOString())
      .get();

    const maxRequestsPerHour = 3;
    
    if (recentRequests.size >= maxRequestsPerHour) {
      await securityMonitor.logIncident({
        type: 'rate_limit_exceeded',
        severity: 'medium',
        userId: userId,
        details: {
          requestCount: recentRequests.size,
          timeWindow: '1 hour',
          limit: maxRequestsPerHour
        }
      });

      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Limite de ${maxRequestsPerHour} demandes par heure atteinte`
      );
    }

    return { allowed: true, remaining: maxRequestsPerHour - recentRequests.size };

  } catch (error) {
    console.error('Erreur lors de la vérification du rate limit:', error);
    throw new functions.https.HttpsError('internal', 'Erreur interne du serveur');
  }
});

// Clean up old audit logs (runs daily)
export const cleanupAuditLogs = functions.pubsub
  .schedule('0 2 * * *') // Every day at 2 AM
  .timeZone('Africa/Abidjan')
  .onRun(async (context) => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    try {
      const oldLogs = await admin.firestore()
        .collection('auditLogs')
        .where('timestamp', '<', thirtyDaysAgo)
        .limit(500)
        .get();

      if (oldLogs.empty) {
        console.log('No old audit logs to delete');
        return;
      }

      const batch = admin.firestore().batch();
      oldLogs.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`Deleted ${oldLogs.size} old audit logs`);

    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
    }
  });