importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCrBR7YRd-_dob83dDFEKcNY2b7RlZIssA",
  authDomain: "delulu-diaries.firebaseapp.com",
  projectId: "delulu-diaries",
  storageBucket: "delulu-diaries.firebasestorage.app",
  messagingSenderId: "539993988952",
  appId: "1:539993988952:web:9160c9a9b6b9b64481cf2d",
  measurementId: "G-HXBKJND3DC"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png' 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});S