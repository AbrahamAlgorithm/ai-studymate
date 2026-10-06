import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// the go server (vite in dev) puts this on the page from backend/.env, so it never sits in the repo
const firebaseConfig = window.__FIREBASE_CONFIG__;
if (!firebaseConfig?.apiKey) {
  throw new Error("Firebase config missing, set FIREBASE_PROJECT_ID and FIREBASE_WEB_API_KEY in backend/.env");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// history also lives in the browser's cache, so it shows up instantly on refresh and survives going offline
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
