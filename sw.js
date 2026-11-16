'use strict'

/*
 * Салон АП — service worker «приложение открывается всегда» (план 12.11).
 * Симптом: у части пользователей маршрут «оператор → облачные диапазоны
 * Яндекса» флапает окнами — сайт целиком недоступен, потом оживает сам
 * (отчёт qa/runs/2026-11-12-apex-cdn). Сервер здесь бессилен, поэтому
 * гарантию переносим на устройство: после первой успешной загрузки сборка
 * живёт в кэше воркера и открывается без сети.
 *
 * Стратегии:
 *  - /assets/ и /fonts/ — cache-first: контент хэшированный/неизменяемый,
 *    устаревание невозможно по построению;
 *  - документ (навигация) и прочее — network-first: онлайн всегда свежий
 *    релиз (документ кладётся в кэш), офлайн — кэш; обложки не кэшируем
 *    воркером (десятки МБ — риск eviction localStorage).
 * Данные (Supabase, прокси) — cross-origin, воркер их не трогает: офлайн-
 * слой приложения (localStorage + синк с ретраями) работает как раньше.
 *
 * Версия: при необходимости полного сброса кэша поднять суффикс — activate
 * удалит все кэши salon-ap-* кроме текущего. Регистрация — только в
 * прод-сборке (main.tsx), в dev/e2e воркер не живёт.
 *
 * Тестируемость: файл исполняется юнитами в node:vm-песочнице — побочные
 * эффекты собраны под guard'ом self.addEventListener, чистая логика
 * выставляется через self.__swTest.
 */

const SW_VERSION = 'salon-ap-v1'
const CACHE = SW_VERSION
const CACHE_FIRST_PREFIXES = ['/assets/', '/fonts/']

/** Чистая стратегия запроса. pathname — путь от корня; navigation — режим navigate */
function pickStrategy(pathname, navigation) {
  void navigation
  for (let i = 0; i < CACHE_FIRST_PREFIXES.length; i++) {
    if (pathname.indexOf(CACHE_FIRST_PREFIXES[i]) === 0) return 'cache-first'
  }
  return 'network-first'
}

function onFetch(event) {
  const req = event.request
  if (req.method !== 'GET') return
  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return
  if (pickStrategy(url.pathname, req.mode === 'navigate') !== 'cache-first') {
    // network-first: онлайн — свежий ответ (документ кладём в кэш),
    // офлайн — последний закэшированный, чего нет — честная ошибка.
    // ignoreVary: записи добавлялись и воркером (запрос без Origin), и
    // запросами страницы (модульные скрипты/шрифты — с Origin): vary-сверка
    // режет match впустую, что и ломало офлайн-запуск в приёмке
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && req.mode === 'navigate') {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() =>
          caches
            .open(CACHE)
            .then((cache) => cache.match(req, { ignoreSearch: true, ignoreVary: true }))
            .then((hit) => hit || Response.error()),
        ),
    )
    return
  }
  // cache-first: неизменяемый контент — мгновенно из кэша, мимо — из сети и в кэш
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone())
            return res
          }),
        ),
      ),
  )
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('install', (event) => {
    // документ в кэш сразу на install: воркер регистрируется ПОСЛЕ первой
    // загрузки и навигацию не видел — без этого первый офлайн-запуск умирал
    event.waitUntil(
      Promise.all([self.skipWaiting(), caches.open(CACHE).then((cache) => cache.add('/'))]),
    )
  })
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys.filter((k) => k.indexOf('salon-ap-') === 0 && k !== CACHE).map((k) => caches.delete(k)),
          ),
        )
        .then(() => self.clients.claim()),
    )
  })
  self.addEventListener('fetch', onFetch)
  // страница докладывает свои стартовые ресурсы (performance entries) —
  // докэшируем: ассеты первого экрана могли загрузиться до того, как воркер
  // стал контролировать страницу
  self.addEventListener('message', (event) => {
    const data = event.data || {}
    if (data.type !== 'cache-startup' || !Array.isArray(data.urls) || data.urls.length === 0) return
    if (typeof event.waitUntil !== 'function') return
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => Promise.all(data.urls.map((u) => cache.add(u).catch(() => {}))))
        .catch(() => {}),
    )
  })
  self.__swTest = { pickStrategy, SW_VERSION, CACHE }
}
