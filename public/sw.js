/**
 * 足迹 · Footprints - Service Worker
 * 缓存静态资源和字体 CDN
 */

const CACHE_NAME = 'travel-footprints-v1';

// 需要预缓存的资源
const PRECACHE_URLS = [
  '/',
  '/css/style.css',
  '/js/animations.js',
  '/js/gallery.js',
  '/js/map.js',
  '/js/admin.js',
  '/js/custom-select.js',
  'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js'
];

// 安装时预缓存
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// 激活时清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
});

// 网络优先策略（静态资源走缓存）
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // 只处理 http/https 请求（排除 chrome-extension:// 等）
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // API 请求不缓存
  if (url.pathname.startsWith('/api/')) return;

  // 图片上传目录不缓存
  if (url.pathname.startsWith('/uploads/')) return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      // 有缓存且是静态资源则使用缓存
      if (cached && (
        url.pathname.match(/\.(css|js|json|png|jpg|jpeg|gif|svg|woff2?)$/) ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com' ||
        url.hostname === 'cdn.jsdelivr.net'
      )) {
        return cached;
      }

      // 否则网络优先
      return fetch(event.request).then(function(response) {
        // 只缓存成功的 GET 请求
        if (event.request.method === 'GET' && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function() {
        // 离线时返回缓存
        return cached || new Response('离线', { status: 503 });
      });
    })
  );
});
