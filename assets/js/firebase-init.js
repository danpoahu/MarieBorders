/* Marie Borders — Firebase initialization (Phase 3)
 *
 * Loads the modular Firebase v10 SDK from gstatic and exposes a single,
 * shared handle as `window.MB.firebase` for the rest of the site:
 *
 *   window.MB.firebase = { app, db, auth, storage, ready }
 *
 * `ready` is a Promise that resolves once the SDK has finished initializing —
 * other modules should `await window.MB.firebase.ready` before issuing queries
 * so they don't race the dynamic import.
 *
 * Each page that needs Firebase loads THIS file as `<script type="module">`.
 * The existing site.js / listings.js / contact.js are classic scripts and that
 * is fine — they do not import Firebase directly; they read off the global
 * window.MB.firebase handle.
 *
 * The apiKey below is safe to commit publicly. Firestore + Storage security
 * rules (firestore.rules / storage.rules at repo root) protect data, not the
 * apiKey. See https://firebase.google.com/docs/projects/api-keys
 *
 * Analytics is intentionally NOT initialized:
 *   - the STAGE site is noindex
 *   - we don't want to ship the analytics SDK weight to every visitor
 *   - measurementId is kept in config in case we re-enable later
 *
 * Persistence note (Daniel's memo: feedback_safari-persistence):
 *   Across his projects Safari has chronically misbehaved with Firestore's
 *   IndexedDB persistence — quota errors in private mode, stale-cache reads,
 *   and outright "Persistence is not supported" rejections. The decision
 *   across LDAH / LetsShop / DM / Marie Borders is: skip persistence on
 *   Safari, enable on everyone else. Chrome (incl. on iPad), Firefox, Edge,
 *   and Brave all behave. This block sniffs the UA before flipping the
 *   switch.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDV0gn8txrIAgl6Iw-oCyuNK0QkSoIlhlM',
  authDomain: 'mbreal-83286.firebaseapp.com',
  projectId: 'mbreal-83286',
  storageBucket: 'mbreal-83286.firebasestorage.app',
  messagingSenderId: '884218966489',
  appId: '1:884218966489:web:bfb1ed0276a7622a30a9c8',
  measurementId: 'G-NLXR9XZ216'
};

// Safari sniff — UA-based, intentionally narrow. Chrome on iOS reports
// "Safari" too, so we explicitly exclude Chrome / CriOS / Edg / Firefox.
function isSafari() {
  try {
    const ua = navigator.userAgent || '';
    if (/Chrome|CriOS|Chromium|Edg|EdgiOS|Firefox|FxiOS|OPR|OPiOS/i.test(ua)) return false;
    return /Safari/i.test(ua);
  } catch (e) {
    return false;
  }
}

const app = initializeApp(firebaseConfig);

// Pick cache strategy: persistent IndexedDB for non-Safari, in-memory for Safari.
// See header comment for rationale.
const db = initializeFirestore(app, {
  localCache: isSafari()
    ? memoryLocalCache()
    : persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const auth = getAuth(app);
const storage = getStorage(app);

window.MB = window.MB || {};
window.MB.firebase = {
  app,
  db,
  auth,
  storage,
  ready: Promise.resolve(),
  // Firestore helpers re-exported for classic scripts (listings.js, contact.js)
  // that can't `import` directly.
  fs: {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
  },
  authApi: {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
  },
  storageApi: {
    storageRef,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject
  }
};

// Signal: any classic script can poll `window.MB.firebase` then check `ready`.
window.dispatchEvent(new CustomEvent('mb:firebase-ready'));
