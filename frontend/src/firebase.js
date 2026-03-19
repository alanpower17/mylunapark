import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCp-BCZU99cTUNXeUO3yLXOoJIIl0PHcrI",
    authDomain: "mylunapark-auth.firebaseapp.com",
    projectId: "mylunapark-auth",
    storageBucket: "mylunapark-auth.firebasestorage.app",
    messagingSenderId: "220230154621",
    appId: "1:220230154621:web:3a07a459bc2406494bb414"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
