// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web config is public by design — it identifies the project, it is
// not a secret. Data is protected by Firestore security rules (firestore.rules)
// and the authorised domains list in the Firebase console. The AI provider keys
// live only on the server (backend/), never in this bundle.
const firebaseConfig = {
  apiKey: "AIzaSyAgcAidLiqWxci-2kMC36_YmuCi1prnT-I",
  authDomain: "studymate-e4ecb.firebaseapp.com",
  projectId: "studymate-e4ecb",
  storageBucket: "studymate-e4ecb.appspot.com",
  messagingSenderId: "52245784255",
  appId: "1:52245784255:web:ac67d1e5bdfed5d0c5c80a",
  measurementId: "G-4E9NP26JRR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);