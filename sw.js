const CACHE="auxiliar-cm-2026-v3";
const ASSETS=[
  "./","./index.html","./styles.css","./app.js","./questions.js","./manifest.json",
  "./icons/icon-192.png","./icons/icon-512.png",
  "./stickers/cat_nice.gif","./stickers/dog_case_closed.gif","./stickers/cat_oops.gif",
  "./stickers/dog_nope.gif","./stickers/cat_you_can.gif","./stickers/dog_keep_going.gif"
];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html"))));
});