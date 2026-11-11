import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAjscFYnfrZw5DOXdeD-IX4H1BY46mgbmE",
  authDomain: "buildicy-team.firebaseapp.com",
  projectId: "buildicy-team",
  storageBucket: "buildicy-team.firebasestorage.app",
  messagingSenderId: "57577879488",
  appId: "1:57577879488:web:e0b3132ed325628b8cfa25",
};

const VAPID_KEY = "BJbJ5ooWFio7Jg_b126Xlf1wbzBTpx6Ya9A_-6sTUZKnwcfD7nD66qLoJAXXhj8RLZaQyAHWlAJNmq5152Ngb8E";

const app = initializeApp(firebaseConfig);

export const messaging = typeof window !== "undefined" ? getMessaging(app) : null;

/** Request permission + get FCM token for this device */
export async function requestPushPermission(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
    });
    return token || null;
  } catch (err) {
    console.warn("[FCM] Token error:", err);
    return null;
  }
}

/** Send push notification to a specific FCM token via Firebase REST API */
export async function sendPushToToken(token: string, title: string, body: string) {
  try {
    await fetch(`https://fcm.googleapis.com/v1/projects/buildicy-team/messages:send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAccessToken()}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          webpush: {
            notification: {
              title,
              body,
              icon: "/buildicy-mark.png",
              badge: "/buildicy-mark.png",
              vibrate: [200, 100, 200],
            },
          },
        },
      }),
    });
  } catch (err) {
    console.warn("[FCM] Send error:", err);
  }
}

/** Listen for foreground messages */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) return;
  onMessage(messaging, callback);
}

// FCM v1 requires OAuth2 — use service account via Supabase edge or store server key
// For client-side we use the legacy server key approach via a proxy
async function getAccessToken(): Promise<string> {
  // Returns empty — actual sending is done via Supabase edge function
  return "";
}
