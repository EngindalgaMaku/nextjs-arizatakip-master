import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import { z } from 'zod';

// Zod schema for request body validation (basic example)
const notifyRequestBodySchema = z.object({
  target: z.enum(['admin', 'teacher']),
  issueId: z.string().optional(), // Optional, depending on notification type
  updaterRole: z.enum(['admin', 'teacher']).optional(), // Who initiated the update?
  // Add other expected fields if necessary
});

// Firebase Admin SDK başlatma
if (!admin.apps.length) {
  try {
    const serviceAccount: ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  } catch (error) {
    console.error('Firebase admin başlatılamadı:', error);
  }
}

// Supabase istemcisi oluştur
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Token veri yapısı
interface FCMToken {
  token: string;
}

// Arıza kayıt yapısı
interface IssueRecord {
  id: string;
  device_name: string;
  device_type: string;
  reported_by: string;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = notifyRequestBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid request body', details: validationResult.error.errors }, { status: 400 });
    }

    // Destructure updaterRole along with other data
    const { target, issueId, updaterRole } = validationResult.data;

    let issueRecord: any = null;
    if (issueId) {
       const { data: issueData, error: issueError } = await supabaseAdmin
        .from('issues')
        .select('*')
        .eq('id', issueId)
        .single();

      if (issueError) {
        console.error('Arıza kaydı alınamadı:', issueError);
        return NextResponse.json({ success: false, error: 'Arıza kaydı bulunamadı' }, { status: 404 });
      }
      issueRecord = issueData;
    }

    const sendNotifications = async (tokens: string[], notification: admin.messaging.Notification, data: { [key: string]: string }, userType: string) => {
      if (tokens.length === 0) {
        console.log(`${userType} için gönderilecek token bulunamadı.`);
        return { successCount: 0, failureCount: 0, failedTokens: [] };
      }

      let successCount = 0;
      let failureCount = 0;
      const failedTokens: string[] = [];

      const sendPromises = tokens.map(async (token) => {
        const message: admin.messaging.Message = {
          token,
          notification,
          data,
          webpush: {
            notification: {
              ...notification,
              icon: '/okullogo.png', // Consider making this configurable
              badge: '/icons/badge-128x128.png', // Consider making this configurable
              actions: [
                {
                  action: 'view',
                  title: 'Görüntüle',
                },
              ],
            },
            fcmOptions: {
              link: data.url,
            },
          },
        };

        try {
          // --- Temporarily Disable FCM --- START
          // await getMessaging().send(message);
          console.log(`Notification sending temporarily disabled. Would send to: ${token.substring(0, 10)}...`);
          // --- Temporarily Disable FCM --- END
          successCount++;
        } catch (error: any) {
          failureCount++;
          failedTokens.push(token);
          console.error(`Bildirim gönderme hatası (token: ${token.substring(0, 10)}...):`, error.code, error.message);
          // Handle specific error codes (e.g., 'messaging/registration-token-not-registered')
          if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token') {
             console.log(`Geçersiz veya kayıtsız token (${token.substring(0, 10)}...) siliniyor...`);
             // Attempt to delete the invalid token from Supabase
             await supabaseAdmin.from('fcm_tokens').delete().eq('token', token);
          }
          // Consider adding retry logic for transient errors if needed
        }
      });

      await Promise.all(sendPromises);
      return { successCount, failureCount, failedTokens };
    };

    if (target === 'admin' && issueRecord) {
      // Fetch admin tokens
      const { data: adminTokensData, error: adminTokensError } = await supabaseAdmin
        .from('fcm_tokens')
        .select('token')
        .eq('user_role', 'admin');

      if (adminTokensError) {
        console.error('Admin tokenları alınamadı:', adminTokensError);
        return NextResponse.json({ success: false, error: 'Admin tokenları alınamadı' }, { status: 500 });
      }

      const adminTokens = (adminTokensData as FCMToken[] || []).map(item => item.token);

      // Prepare admin notification
      const adminNotification = {
        title: 'Yeni Arıza Bildirimi',
        body: `${issueRecord.device_name} (${issueRecord.location}) için yeni bir arıza bildirimi var.`,
      };
      const adminData = {
        issueId: issueRecord.id.toString(),
        deviceType: issueRecord.device_type,
        userRole: 'admin',
        clickAction: 'https://atsis.husniyeozdilek.k12.tr/dashboard/issues', // Use env variable?
        url: `/dashboard/issues?id=${issueRecord.id}`,
      };

      // Send to admins
      const adminResult = await sendNotifications(adminTokens, adminNotification, adminData, 'Admin');
      console.log(`Admin: ${adminResult.successCount} başarıyla gönderildi, ${adminResult.failureCount} başarısız.`);

      return NextResponse.json({
        success: true,
        sent: adminResult.successCount,
        failed: adminResult.failureCount,
        failedTokens: adminResult.failedTokens, // Optionally return failed tokens
      });

    } else if (target === 'teacher' && issueRecord) {
       // --- Add check for updater role --- 
       if (updaterRole !== 'admin') {
           console.log(`Skipping teacher notification for issue ${issueId} because update was not initiated by an admin (updater: ${updaterRole || 'unknown'}).`);
           return NextResponse.json({ success: true, message: 'Notification skipped: update not by admin.' });
       }
       // --- End check ---

       // Fetch teacher tokens (assuming user_id is stored with the token)
       if (!issueRecord.user_id) {
         return NextResponse.json({ success: false, error: 'Arıza kaydı için öğretmen ID bulunamadı' }, { status: 400 });
       }

      const { data: teacherTokensData, error: teacherTokensError } = await supabaseAdmin
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', issueRecord.user_id) // Assuming user_id links the issue to the teacher
        .eq('user_role', 'teacher');

      if (teacherTokensError) {
        console.error('Öğretmen tokenları alınamadı:', teacherTokensError);
        return NextResponse.json({ success: false, error: 'Öğretmen tokenları alınamadı' }, { status: 500 });
      }

      const teacherTokens = (teacherTokensData as FCMToken[] || []).map(item => item.token);

      // Prepare teacher notification
      let teacherNotificationTitle = 'Arıza Kaydı Güncellendi';
      if (issueRecord.status === 'cozuldu') {
          teacherNotificationTitle = 'Arıza Kaydınız Çözüldü!';
      }
      const teacherNotification = {
          title: teacherNotificationTitle,
          body: `"${issueRecord.device_name}" cihazı için durum "${issueRecord.status}" olarak güncellendi.`
      };
       const teacherData = {
        issueId: issueRecord.id.toString(),
        status: issueRecord.status,
        userRole: 'teacher',
        clickAction: 'https://atsis.husniyeozdilek.k12.tr/teacher/issues', // Use env variable?
        url: `/teacher/issues?id=${issueRecord.id}`,
        showToast: 'true' // Keep this if used on the client
      };

      // Send to teacher
       const teacherResult = await sendNotifications(teacherTokens, teacherNotification, teacherData, 'Öğretmen');
       console.log(`Öğretmen: ${teacherResult.successCount} başarıyla gönderildi, ${teacherResult.failureCount} başarısız.`);

      return NextResponse.json({
        success: true,
        sent: teacherResult.successCount,
        failed: teacherResult.failureCount,
        failedTokens: teacherResult.failedTokens, // Optionally return failed tokens
      });
    } else {
        return NextResponse.json({ success: false, error: 'Geçersiz hedef veya eksik arıza ID' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Bildirim API Hatası:', error);
    // Distinguish between client errors (4xx) and server errors (5xx)
    const statusCode = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: statusCode });
  }
}

// CORS ön kontrolü için
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 