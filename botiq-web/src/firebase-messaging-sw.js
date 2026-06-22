importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyAycow43y7mu4qK1CJB5Tr9w0g1fIC_exg",
    authDomain: "botiq-notifications.firebaseapp.com",
    projectId: "botiq-notifications",
    storageBucket: "botiq-notifications.firebasestorage.app",
    messagingSenderId: "1040133716977",
    appId: "1:1040133716977:web:5a62ef669a8e429ab82250"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {

    self.registration.showNotification(
        payload.notification.title,
        {
            body: payload.notification.body
        }
    );
});