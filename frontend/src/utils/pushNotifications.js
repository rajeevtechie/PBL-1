// frontend/src/utils/pushNotifications.js
import axios from 'axios';

// Helper to convert the base64 VAPID key into the format the browser needs
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const subscribeToPushNotifications = async () => {
  // 1. Check if the browser supports Service Workers and Push
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log("Push notifications are not supported by this browser.");
    return;
  }

  try {
    // 2. Ask the user for permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log("Push permission denied.");
      return;
    }

    // 3. Register the Service Worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log("Service Worker registered!");

    // 4. Wait for the Service Worker to be ready
    await navigator.serviceWorker.ready;

    // 5. Subscribe to Push Notifications
    const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 6. Send the subscription to your backend
    await axios.post('http://localhost:5000/api/push/subscribe', subscription, {
      withCredentials: true
    });
    
    console.log("Successfully subscribed to push notifications!");

  } catch (error) {
    console.error("Failed to subscribe to push notifications:", error);
  }
};