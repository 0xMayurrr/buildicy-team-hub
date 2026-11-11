importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAjscFYnfrZw5DOXdeD-IX4H1BY46mgbmE",
  authDomain: "buildicy-team.firebaseapp.com",
  projectId: "buildicy-team",
  storageBucket: "buildicy-team.firebasestorage.app",
  messagingSenderId: "57577879488",
  appId: "1:57577879488:web:e0b3132ed325628b8cfa25",
});

const messaging = firebase.messaging();

// Handle background messages (app closed / minimized)
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Buildicy";
  const body = payload.notification?.body || "You have a new notification";

  self.registration.showNotification(title, {
    body,
    icon: "/buildicy-mark.png",
    badge: "/buildicy-mark.png",
    vibrate: [200, 100, 200],
    data: payload.data || {},
  });
});

// Click on notification → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("/");
    }),
  );
});
