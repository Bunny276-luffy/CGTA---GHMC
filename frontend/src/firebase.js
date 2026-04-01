import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCmA2YdiDTj5YzLZH5py53W7q8zY85HHiY",
    authDomain: "cgta-7cefd.firebaseapp.com",
    projectId: "cgta-7cefd",
    storageBucket: "cgta-7cefd.firebasestorage.app",
    messagingSenderId: "25662170005",
    appId: "1:25662170005:web:a36d4ca93be7784c2dcc9c",
    measurementId: "G-HFBY1DGDEE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with long polling to prevent websocket timeout hangs
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Export services for use in your components
export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);
export default app;
