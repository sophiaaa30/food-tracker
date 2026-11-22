// 本機 IndexedDB 包裝：不與任何伺服器同步。
const DB_NAME = 'daily-food-journal';
const VERSION = 1;
let dbPromise;

export function openDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('此瀏覽器不支援 IndexedDB'));
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => { const db = req.result; db.onversionchange = () => db.close(); resolve(db); };
    req.onerror = () => { dbPromise = null; reject(req.error); };
    req.onblocked = () => { dbPromise = null; reject(new Error('請關閉其他已開啟的舊版分頁後重試')); };
  });
  return dbPromise;
}
function requestPromise(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
async function txRequest(storeName, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('資料庫操作失敗'));
    tx.onabort = () => reject(tx.error || new Error('資料庫交易中斷'));
    const req = operation(tx.objectStore(storeName));
    if (req) req.onsuccess = () => { result = req.result; };
  });
}
export const getAllEntries = () => txRequest('entries', 'readonly', s => s.getAll());
export const getEntriesByDate = date => txRequest('entries', 'readonly', s => s.index('date').getAll(date));
export const putEntry = entry => txRequest('entries', 'readwrite', s => s.put(entry));
export const deleteEntry = id => txRequest('entries', 'readwrite', s => s.delete(id));
export const getTargets = async () => (await txRequest('settings', 'readonly', s => s.get('targets')))?.value || null;
export const saveTargets = targets => txRequest('settings', 'readwrite', s => s.put({ key: 'targets', value: targets }));
export async function replaceAllData(entries, targets) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['entries', 'settings'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('匯入失敗'));
    tx.onabort = () => reject(tx.error || new Error('匯入已取消'));
    tx.objectStore('entries').clear();
    tx.objectStore('settings').clear();
    for (const entry of entries) tx.objectStore('entries').put(entry);
    tx.objectStore('settings').put({ key: 'targets', value: targets });
  });
}
