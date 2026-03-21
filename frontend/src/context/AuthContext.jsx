import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Assicurati che 'db' sia esportato dal tuo file firebase.js
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Il tuo UID da Amministratore (lasciamolo come backup di sicurezza)
  const ADMIN_UID = "SpsrAyESGAM9ups61kfjUbEDKn72";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. Cerchiamo i dati extra (ruolo) nel database Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        const userDataFromDb = userDoc.exists() ? userDoc.data() : {};

        // 2. Creiamo l'oggetto utente completo
        const fullUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: userDataFromDb.name || firebaseUser.email.split('@')[0],
          // Ruolo: Admin se l'UID coincide O se è scritto nel DB. Altrimenti 'organizzatore' o 'user'.
          role: (firebaseUser.uid === ADMIN_UID || userDataFromDb.role === 'admin') 
                ? 'admin' 
                : (userDataFromDb.role || 'user')
        };
        
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // --- FUNZIONI DI ACCESSO ---

  // Login (Quella che mancava!)
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Registrazione (Per i nuovi organizzatori)
  const register = async (email, password, name) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    // Quando si registrano, creiamo il documento nel DB come 'user' (o 'organizzatore')
    await setDoc(doc(db, "users", res.user.uid), {
      name: name,
      email: email,
      role: 'organizzatore' // Default per i nuovi iscritti
    });
    return res;
  };

  const logout = () => signOut(auth);

  const value = {
    user,
    login, // Adesso LoginPage la troverà!
    register,
    logout,
    isAdmin: user?.role === 'admin',
    isOrganizzatore: user?.role === 'organizzatore' || user?.role === 'admin',
    getAuthHeaders: () => ({})
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
