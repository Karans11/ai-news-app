'use client';
import { useState, useEffect } from 'react';

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        // Show success message
        new Notification('🎉 Notifications Enabled!', {
          body: 'You\'ll now get notified about new AI articles',
          icon: '/icons/icon-192x192.png'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-medium">🔔 Push Notifications</h3>
          <p className="text-gray-400 text-sm">
            Get notified when new AI articles are published
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {permission === 'default' && (
            <button
              onClick={requestNotificationPermission}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
            >
              Enable
            </button>
          )}
          
          {permission === 'granted' && (
            <span className="text-green-400 text-sm">✅ Enabled</span>
          )}
          
          {permission === 'denied' && (
            <span className="text-red-400 text-sm">❌ Denied</span>
          )}
        </div>
      </div>
      
      {permission === 'denied' && (
        <div className="mt-2 p-2 bg-red-900/30 rounded text-red-300 text-xs">
          Notifications are blocked. Enable them in your browser settings to get updates about new articles.
        </div>
      )}
    </div>
  );
}

export default NotificationSetup;
