// sw.js — Service Worker for The Process Admin PWA
const CACHE_NAME = 'process-admin-v1';

// ── Install ──
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

// ── Push Notifications ──
self.addEventListener('push', (e) => {
    let data = { title: '🛡️ The Process', body: 'إشعار جديد' };
    try {
        data = e.data.json();
    } catch (_) {
        try { data.body = e.data.text(); } catch (_) {}
    }

    e.waitUntil(
        self.registration.showNotification(data.title || '🛡️ The Process', {
            body: data.body || '',
            icon: data.icon || 'https://api.dicebear.com/7.x/bottts/svg?seed=process-admin',
            badge: 'https://api.dicebear.com/7.x/bottts/svg?seed=process-badge',
            tag: data.tag || 'process-notif',
            renotify: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: data.url || '/the-process-admin/admin.html' }
        })
    );
});

// ── Notification Click → فتح التطبيق ──
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const targetUrl = (e.notification.data && e.notification.data.url)
        ? e.notification.data.url
        : '/the-process-admin/admin.html';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const client of list) {
                if (client.url.includes('the-process-admin') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ── Message from page → show notification directly (بدون push server) ──
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = e.data;
        self.registration.showNotification(title || '🛡️ The Process', {
            body: body || '',
            icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=process-admin',
            tag: tag || 'process-notif',
            renotify: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: '/the-process-admin/admin.html' }
        });
    }
});
