// sw.js — Service Worker for The Process Admin PWA
// يستمع لـ Firebase مباشرة — يبعت إشعارات حتى لو التطبيق مسكر

const DB_URL = 'https://the-process-5d196-default-rtdb.firebaseio.com';
const ICON   = 'https://api.dicebear.com/7.x/bottts/svg?seed=process-admin';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// ── Firebase polling كل 30 ثانية في الخلفية ──
let lastBlockedIds = null; // null = أول تشغيل، مش هنبعت إشعارات للقديم

async function checkBlocked() {
    try {
        const res  = await fetch(`${DB_URL}/blockedAttempts.json`);
        const data = await res.json();
        if (!data) return;

        const currentIds = new Set();
        Object.values(data).forEach(entries =>
            Object.keys(entries || {}).forEach(id => currentIds.add(id))
        );

        if (lastBlockedIds === null) {
            // أول مرة — نحفظ الموجود بس مش نبعت إشعارات
            lastBlockedIds = currentIds;
            return;
        }

        // إشعار بس للجديد
        const newOnes = [];
        Object.entries(data).forEach(([code, entries]) => {
            Object.entries(entries || {}).forEach(([id, entry]) => {
                if (!lastBlockedIds.has(id)) {
                    newOnes.push({ code, entry });
                }
            });
        });

        for (const { code, entry } of newOnes) {
            await self.registration.showNotification('🚨 محاولة دخول مرفوضة', {
                body: `الكود "${code}" (${entry.studentName || code}) — IP: ${entry.ip || '—'}`,
                icon: ICON,
                tag: `blocked-${code}`,
                renotify: true,
                dir: 'rtl',
                lang: 'ar',
                vibrate: [200, 100, 200],
                data: { url: self.registration.scope }
            });
        }

        lastBlockedIds = currentIds;
    } catch (e) { /* network error — ignore */ }
}

// ── Periodic polling (كل 30 ثانية) ──
self.addEventListener('periodicsync', (e) => {
    if (e.tag === 'check-blocked') e.waitUntil(checkBlocked());
});

// ── Fallback: setInterval من الصفحة ──
self.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'TICK') checkBlocked();

    if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag } = e.data;
        self.registration.showNotification(title || '🛡️ The Process', {
            body: body || '',
            icon: ICON,
            tag: tag || 'process-notif',
            renotify: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            data: { url: self.registration.scope }
        });
    }
});

// ── Push من سيرفر (مستقبلاً) ──
self.addEventListener('push', (e) => {
    let data = { title: '🛡️ The Process', body: 'إشعار جديد' };
    try { data = e.data.json(); } catch (_) {}
    e.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: ICON,
            tag: data.tag || 'process-notif',
            renotify: true,
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200]
        })
    );
});

// ── Click على الإشعار ──
self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || self.registration.scope;
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.includes('the-process-admin') && 'focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});
