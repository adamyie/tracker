// Tiny IndexedDB wrapper. Entries live in their own stores; lists, settings and deposits in "kv".
// It opens whatever version already exists and never changes the schema for existing installs, so an
// old copy of the app left open in another tab can't block it.
const DB_NAME = "aio-tracker";
export const STORES = ["events", "gym_sets", "habits"];
const CREATE = [...STORES, "deposits"];

function openWith(version) {
  return new Promise((resolve, reject) => {
    const r = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);
    r.onupgradeneeded = () => {
      const d = r.result;
      for (const s of CREATE) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" });
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error("blocked"));
  });
}

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = (async () => {
    let d = await openWith();
    if ([...STORES, "kv"].some((s) => !d.objectStoreNames.contains(s))) {
      const v = d.version + 1;
      d.close();
      d = await openWith(v);
    }
    d.onversionchange = () => d.close();
    return d;
  })();
  dbp.catch(() => (dbp = null));
  return dbp;
}

const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

async function write(store, fn) {
  const d = await open();
  return new Promise((res, rej) => {
    const t = d.transaction(store, "readwrite");
    fn(t.objectStore(store));
    t.oncomplete = () => res();
    t.onerror = t.onabort = () => rej(t.error);
  });
}

export async function hasStore(name) { const d = await open(); return d.objectStoreNames.contains(name); }
export async function all(store) { const d = await open(); return req(d.transaction(store).objectStore(store).getAll()); }
export const put = (store, obj) => write(store, (s) => s.put(obj));
export const putMany = (store, arr) => write(store, (s) => arr.forEach((o) => s.put(o)));
export const del = (store, id) => write(store, (s) => s.delete(id));
export const delMany = (store, ids) => write(store, (s) => ids.forEach((id) => s.delete(id)));
export const clear = (store) => write(store, (s) => s.clear());
export async function kvGet(key) { const d = await open(); return req(d.transaction("kv").objectStore("kv").get(key)); }
export const kvSet = (key, val) => write("kv", (s) => s.put(val, key));
