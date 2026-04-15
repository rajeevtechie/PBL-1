// frontend/public/service-worker.js
/* eslint-env serviceworker */
/* global clients */

// 1. Listen for the Push Event from the Backend
self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/favicon.ico', // Replace with your actual app logo if you have one!
            badge: '/favicon.ico',
            vibrate: [200, 100, 200], // Makes Android phones buzz
            data: {
                url: data.url // The URL we passed from the backend
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// 2. Listen for the user clicking the notification
self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    // Grab the URL we saved in the options above
    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
            // If the app is already open, focus that tab and navigate
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    return client.navigate(urlToOpen);
                }
            }
            // If the app is closed, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});