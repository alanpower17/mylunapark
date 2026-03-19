import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // IL TUO UID DA AMMINISTRATORE
  const ADMIN_UID = "h6XixRWQ8vXizjJXxApwZhk8vxm1";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Se l'utente è loggato, controlliamo se è l'admin
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.email.split('@')[0], // Usa la prima parte dell'email come nome
          role: firebaseUser.uid === ADMIN_UID ? 'admin' : 'user' 
        };
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const value = {
    user,
    logout,
    isAdmin: user?.role === 'admin',
    getAuthHeaders: () => ({}) // Per ora lo lasciamo vuoto, non serve più Axios
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
