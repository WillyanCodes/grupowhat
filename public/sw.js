// Service worker do GrupoWhat: recebe as notificações push e abre o grupo quando você toca nelas.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    // se o app está aberto e em foco, não precisa de notificação (a lista já mostra a mensagem nova)
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible' && w.focused)) return;
    await self.registration.showNotification(data.title || 'GrupoWhat', {
      body: data.body || 'Nova mensagem',
      tag: data.tag || 'grupowhat',   // várias mensagens do mesmo grupo viram uma só notificação
      renotify: true,
      icon: '/notif-icon.png',
      badge: '/notif-badge.png',
      data: { gid: data.gid || null },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const gid = event.notification.data && event.notification.data.gid;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) { await w.focus(); w.postMessage({ type: 'open-group', gid }); return; }
    }
    await self.clients.openWindow(gid ? `/?g=${gid}` : '/');
  })());
});
