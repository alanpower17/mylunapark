import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lunapark_token');
    const userData = localStorage.getItem('lunapark_user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        localStorage.removeItem('lunapark_token');
        localStorage.removeItem('lunapark_user');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('lunapark_token', token);
    localStorage.setItem('lunapark_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('lunapark_token');
    localStorage.removeItem('lunapark_user');
    setUser(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('lunapark_user', JSON.stringify(userData));
    setUser(userData);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('lunapark_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const toggleFavorite = async (parkId) => {
    if (!user) return;
    const favorites = user.favorite_parks || [];
    const isFavorite = favorites.includes(parkId);
    
    try {
      if (isFavorite) {
        await axios.delete(`${API}/auth/favorites/${parkId}`, { headers: getAuthHeaders() });
        const newFavorites = favorites.filter(id => id !== parkId);
        updateUser({ ...user, favorite_parks: newFavorites });
      } else {
        await axios.post(`${API}/auth/favorites/${parkId}`, {}, { headers: getAuthHeaders() });
        updateUser({ ...user, favorite_parks: [...favorites, parkId] });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getAuthHeaders, toggleFavorite, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
