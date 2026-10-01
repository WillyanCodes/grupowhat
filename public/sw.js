// Service worker mínimo, só pra habilitar a instalação do app (critério do Chrome/Android).
// Não faz cache agressivo de propósito — o GrupoWhat é em tempo real, sempre busca dado fresco da rede.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // handler vazio: exigido pra contar como "app instalável"
