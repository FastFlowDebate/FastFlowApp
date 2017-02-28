var staticCacheName = 'flowCache';
var version = 'v1.6.1::';

self.addEventListener('install', function(event) {
  event.waitUntil(updateStaticCache())
  self.skipWaiting()
})

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request)
    })
  )
})

function updateStaticCache() {
  return caches.open(version + staticCacheName)
    .then(function (cache) {
      return cache.addAll([
        '/',
        'build/bundle.js',
        'arrow.svg',
        'templates/arg.html',
        'templates/box.html',
        'templates/contention.html',
        'templates/flow.html'
      ])
    })
}

self.addEventListener('activate', function (event) {
  console.log(version + ' activated')
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys
          .filter(function (key) {
            return key.indexOf(version) !== 0
          })
          .map(function (key) {
            return caches.delete(key)
          })
        )
      })
  )
  return self.clients.claim()
})
