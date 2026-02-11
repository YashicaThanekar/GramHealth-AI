// ── Firebase – stripped of analytics to save ~50 KB ─────────────
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBhUJyCKYJ53bDUF0vkPMaOquYD1ITUhGY",
  authDomain: "gramhealth-ai.firebaseapp.com",
  projectId: "gramhealth-ai",
  storageBucket: "gramhealth-ai.appspot.com",
  messagingSenderId: "298979443390",
  appId: "1:298979443390:web:366c4b5e961d5c752c54ef",
  measurementId: "G-VLDGJ6V1BH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };
