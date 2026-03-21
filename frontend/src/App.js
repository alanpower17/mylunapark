import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import { Search, MapPin, Ticket, Clock, ChevronRight, User, LogOut, Settings, Home, Star, Menu, X, Check, AlertCircle, Loader2, Aperture, Shield, Building2, Gift, Users, BarChart3, Plus, Edit, Trash2, Eye, EyeOff, Upload, Camera, Image, Calendar, Heart, Facebook, Instagram, Info, PartyPopper, ExternalLink, KeyRound, FileSpreadsheet, Copy, Download } from "lucide-react";
import { AuthProvider, useAuth } from './context/AuthContext';
import { API } from './utils/constants';
import { getDeviceId, calculateDistance } from './utils/utils';

// Use Aperture as FerrisWheel icon alternative
const FerrisWheel = Aperture;

// Confetti Component
const Confetti = ({ show }) => {
  if (!show) return null;
  
  const colors = ['#fbbf24', '#ec4899', '#22d3ee', '#d946ef', '#22c55e'];
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)]
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {confetti.map((c) => (
        <div
          key={c.id}
          className="confetti"
          style={{
            left: `${c.left}%`,
            backgroundColor: c.color,
            animationDelay: `${c.delay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px'
          }}
        />
      ))}
    </div>
  );
};

// Header Component
const Header = ({ user, logout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isOrganizer = user?.role === 'organizzatore' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  console.log("Dati utente attuale:", user); // Questo ci dirà cosa vede l'app

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Effetto Glassmorphism: Sfondo semitrasparente sfocato */}
      <div className="bg-[#0f1628]/80 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_4px_30px_rgba(6,182,212,0.1)]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            
            {/* Logo e Titolo - Ingranditi e con Glow */}
            <Link to="/" className="flex items-center gap-4 group" data-testid="logo-link">
              <div className="relative">
                <img 
                  src="/logo.png" 
                  alt="MyLunaPark" 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-contain shadow-lg transition-transform duration-300 group-hover:scale-105" 
                  onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=MyLunaPark"; }}
                />
                <div className="absolute -inset-1 bg-cyan-500/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
              </div>
              <span className="font-extrabold text-2xl md:text-3xl metallic-text hidden sm:block tracking-tight">
                MyLunaPark
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/" className={`nav-link text-lg font-medium hover:text-cyan-400 transition-colors ${location.pathname === '/' ? 'text-cyan-400' : 'text-amber-100'}`} data-testid="nav-home">
                <Home className="w-5 h-5 inline mr-1" /> Home
              </Link>
              
              {isOrganizer && (
                <Link to="/dashboard" className={`nav-link text-lg font-medium hover:text-cyan-400 transition-colors ${location.pathname.startsWith('/dashboard') ? 'text-cyan-400' : 'text-amber-100'}`} data-testid="nav-dashboard">
                  <Settings className="w-5 h-5 inline mr-1" /> Dashboard
                </Link>
              )}
              
              {isAdmin && (
                <Link to="/admin" className={`nav-link text-lg font-medium hover:text-cyan-400 transition-colors ${location.pathname.startsWith('/admin') ? 'text-cyan-400' : 'text-amber-100'}`} data-testid="nav-admin">
                  <Shield className="w-5 h-5 inline mr-1 text-purple-400" /> Admin
                </Link>
              )}

              {/* Separatore Visivo */}
              <div className="h-8 w-px bg-cyan-500/30 mx-2"></div>

              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-amber-200 font-medium">Ciao, {user.name}</span>
                  <button onClick={logout} className="p-2 text-pink-400 hover:bg-pink-500/10 rounded-full transition-colors" data-testid="logout-btn" title="Esci">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link to="/login" className="text-amber-300 hover:text-amber-100 font-medium transition-colors" data-testid="login-btn">
                    Accedi
                  </Link>
                  {/* Tasto Iscriviti Premium (Stile Neon) */}
                  <Link to="/register" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2.5 rounded-full font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:scale-105 transition-all" data-testid="header-register-btn">
                    <Gift className="w-4 h-4 inline mr-2" /> Iscriviti Gratis
                  </Link>
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-amber-400 p-2 hover:bg-cyan-500/10 rounded-lg transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="mobile-menu-btn"
            >
              {menuOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          </div>

          {/* Mobile Nav Dropdown */}
          {menuOpen && (
            <nav className="md:hidden mt-4 pb-4 flex flex-col gap-3 border-t border-cyan-500/20 pt-4">
              <Link to="/" className="nav-link py-2 text-lg" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-home">
                <Home className="w-5 h-5 inline mr-3" /> Home
              </Link>
              {isOrganizer && (
                <Link to="/dashboard" className="nav-link py-2 text-lg" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-dashboard">
                  <Settings className="w-5 h-5 inline mr-3" /> Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="nav-link py-2 text-lg" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-admin">
                  <Shield className="w-5 h-5 inline mr-3" /> Admin
                </Link>
              )}
              {user ? (
                <button onClick={() => { logout(); setMenuOpen(false); }} className="nav-link py-2 text-left text-lg text-pink-400" data-testid="mobile-logout-btn">
                  <LogOut className="w-5 h-5 inline mr-3" /> Esci ({user.name})
                </button>
              ) : (
                <div className="flex flex-col gap-3 mt-2">
                  <Link to="/register" className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-center py-3 rounded-xl font-bold shadow-lg" onClick={() => setMenuOpen(false)} data-testid="mobile-register-link">
                    <Gift className="w-5 h-5 inline mr-2" /> Iscriviti Gratis
                  </Link>
                  <Link to="/login" className="border border-amber-400/50 text-amber-300 text-center py-3 rounded-xl font-bold" onClick={() => setMenuOpen(false)} data-testid="mobile-login-link">
                    <User className="w-5 h-5 inline mr-2" /> Accedi
                  </Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

// Home Page
const HomePage = () => {
  const [parks, setParks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const auth = useAuth();

  useEffect(() => {
    fetchParks();
    getUserLocation();
  }, []);

 const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.log('Geolocation not available')
      );
    }
  };

  const fetchParks = async (searchQuery = '') => {
    try {
      setLoading(true);
      const parksCollection = collection(db, "parks");
      const querySnapshot = await getDocs(parksCollection);
      const firebaseParks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const filtered = searchQuery 
        ? firebaseParks.filter(p => 
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.city?.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : firebaseParks;

      setParks(filtered);
    } catch (error) {
      console.error('Errore nel caricamento parchi da Firebase:', error);
      setParks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((e) => {
    const value = e.target.value;
    setSearch(value);
    const timeout = setTimeout(() => {
      fetchParks(value);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  // Ordina: preferiti prima, poi per distanza
  const sortedParks = [...parks].sort((a, b) => {
    const favorites = auth.user?.favorite_parks || [];
    const aFav = favorites.includes(a.id);
    const bFav = favorites.includes(b.id);
    
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    
    // Se entrambi sono preferiti o nessuno, ordina per distanza
    if (userLocation && a.latitude && b.latitude) {
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
      return distA - distB;
    }
    return 0;
  });

  return (
    <div className="min-h-screen starry-bg">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <img src="/logo.png" alt="MyLunaPark" className="w-24 h-24 mx-auto mb-6 rounded-2xl" />
          <h1 className="text-4xl md:text-6xl font-bold mb-4 metallic-text" data-testid="hero-title">
            MyLunaPark
          </h1>
          <p className="text-lg md:text-xl text-amber-100/80 mb-8">
            Trova coupon e sconti per le giostre dei migliori luna park d'Italia
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
            <input
              type="text"
              placeholder="Cerca luna park per nome o città..."
              className="search-input"
              value={search}
              onChange={handleSearch}
              data-testid="search-input"
            />
          </div>
        </div>
      </section>

      {/* Parks Grid */}
      <section className="px-4 pb-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-amber-300 mb-6 flex items-center gap-2">
            <Ticket className="w-6 h-6" />
            Luna Park disponibili
            {userLocation && <span className="text-sm font-normal text-amber-200/60 ml-2">(ordinati per distanza)</span>}
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner-luna" data-testid="loading-spinner"></div>
            </div>
          ) : sortedParks.length === 0 ? (
            <div className="text-center py-12 text-amber-200/60" data-testid="no-parks-message">
              <FerrisWheel className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nessun luna park trovato</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedParks.map((park) => (
                <ParkCard key={park.id} park={park} userLocation={userLocation} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Ad Placeholder */}
      <section className="px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="ad-placeholder">
            <p>Spazio pubblicitario</p>
          </div>
        </div>
      </section>
    </div>
  );
};

// Park Card Component
const ParkCard = ({ park, userLocation }) => {
  const auth = useAuth();
  const isFavorite = auth.user?.favorite_parks?.includes(park.id);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = userLocation && park.latitude 
    ? calculateDistance(userLocation.lat, userLocation.lng, park.latitude, park.longitude)
    : null;

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (auth.user) {
      auth.toggleFavorite(park.id);
    }
  };

  return (
    <Link to={`/park/${park.id}`} className="block relative" data-testid={`park-card-${park.id}`}>
      {/* Cuore preferiti */}
      {auth.user && (
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all ${
            isFavorite 
              ? 'bg-pink-500 text-white' 
              : 'bg-black/50 text-white/70 hover:text-pink-400'
          }`}
          data-testid={`favorite-btn-${park.id}`}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      )}

      <div className="ticket-card luna-card overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-purple-900/50 to-blue-900/50 relative">
          {park.image_url ? (
            <img src={park.image_url} alt={park.name} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Ticket className="w-16 h-16 text-amber-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e] to-transparent" />
          {isFavorite && (
            <div className="absolute top-3 left-3 bg-pink-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Heart className="w-3 h-3 fill-current" /> Preferito
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold text-amber-400 mb-2">{park.name}</h3>
          {park.description && (
            <p className="text-amber-100/70 text-sm mb-3 line-clamp-2">{park.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-amber-200/60">
            <MapPin className="w-4 h-4" />
            <span>{park.city}, {park.region}</span>
            {distance && (
              <span className="ml-auto text-cyan-400">
                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${Math.round(distance)}km`}
              </span>
            )}
          </div>
          {(park.opening_date || park.closing_date) && (
            <div className="flex items-center gap-2 text-sm text-amber-200/60 mt-1">
              <Calendar className="w-4 h-4" />
              <span>
                {park.opening_date && park.closing_date 
                  ? `${park.opening_date} - ${park.closing_date}`
                  : park.opening_date || park.closing_date
                }
              </span>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-pink-400">
              <Ticket className="w-4 h-4 inline mr-1" />
              Coupon disponibili
            </span>
            <ChevronRight className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>
    </Link>
  );
};

// Park Detail Page
const ParkDetailPage = () => {
  const { parkId } = useParams();
  const [park, setPark] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showEventsModal, setShowEventsModal] = useState(false);

  useEffect(() => {
    fetchParkDetails();
  }, [parkId]);

  const fetchParkDetails = async () => {
    try {
      setLoading(true);
      
      // Lettura del Parco specifico tramite l'ID dell'URL
      const parkRef = doc(db, "parks", parkId);
      const parkSnap = await getDoc(parkRef);
      
      if (parkSnap.exists()) {
        const parkData = { id: parkSnap.id, ...parkSnap.data() };
        setPark(parkData);

        // Lettura dei Coupon legati a questo parco
        const couponsRef = collection(db, "coupons");
        const q = query(couponsRef, where("parkId", "==", parkId));
        const querySnapshot = await getDocs(q);
        
        const realCoupons = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCoupons(realCoupons);
      } else {
        console.log("Nessun parco trovato con questo ID");
      }

    } catch (error) {
      console.error('Errore Firebase:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.ride_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.ride_number && c.ride_number.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-luna" data-testid="loading-spinner"></div>
      </div>
    );
  }

  if (!park) {
    return (
      <div className="min-h-screen flex items-center justify-center text-amber-200" data-testid="park-not-found">
        <p>Luna Park non trovato</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen starry-bg pb-8">
      {/* Park Header */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-purple-900/50 to-blue-900/50">
        {park.image_url && (
          <img src={park.image_url} alt={park.name} className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-amber-400" data-testid="park-name">
              {park.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-amber-200/80">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {park.city}, {park.region}
              </span>
              {park.opening_hours && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {park.opening_hours}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Coupons */}
      <div className="max-w-4xl mx-auto px-4 mt-6">
        {park.description && <p className="text-amber-100/70 mb-6">{park.description}</p>}

        {/* Social Links & Info Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {park.facebook_url && (
            <a href={park.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-xl transition-colors">
              <Facebook className="w-5 h-5" /> Facebook
            </a>
          )}
          {park.instagram_url && (
            <a href={park.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 px-4 py-2 rounded-xl transition-colors">
              <Instagram className="w-5 h-5" /> Instagram
            </a>
          )}
          {park.about_us && (
            <button onClick={() => setShowAboutModal(true)} className="flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-4 py-2 rounded-xl transition-colors">
              <Info className="w-5 h-5" /> Chi Siamo
            </button>
          )}
          {park.events && (
            <button onClick={() => setShowEventsModal(true)} className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-4 py-2 rounded-xl transition-colors">
              <PartyPopper className="w-5 h-5" /> Eventi
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/60" />
          <input
            type="text"
            placeholder="Cerca giostra per nome o numero..."
            className="search-input w-full pl-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="coupon-search-input"
          />
        </div>

        {/* Cooldown Info */}
        <div className="ticket-card p-4 mb-6 flex items-center gap-3">
          <Clock className="w-6 h-6 text-cyan-400 flex-shrink-0" />
          <div>
            <p className="text-amber-200 font-medium">Tempo di attesa tra coupon</p>
            <p className="text-amber-100/60 text-sm">
              Ogni coupon può essere usato ogni <span className="text-cyan-400 font-bold">{park.coupon_cooldown_hours || 24} ore</span>
            </p>
          </div>
        </div>

        {/* Coupons Grid */}
        <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Coupon disponibili ({filteredCoupons.length})
        </h2>

        {filteredCoupons.length === 0 ? (
          <div className="text-center py-8 text-amber-200/60" data-testid="no-coupons-message">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nessun coupon trovato</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} cooldownHours={park.coupon_cooldown_hours} />
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {filteredCoupons.length > 0 && (
          <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200/70 text-xs">
            I gestori si riservano il diritto di non accettare i coupon in caso di palese abuso, malfunzionamento tecnico del dispositivo o comportamenti non idonei. Lo sconto non è cumulabile con altre promozioni. La disponibilità delle promozioni è soggetta agli orari e alle condizioni di apertura.
          </div>
        )}

        {/* Ad Placeholder */}
        <div className="ad-placeholder mt-8">
          <p>Spazio pubblicitario</p>
        </div>
      </div>

      {/* Chi Siamo Modal */}
      {showAboutModal && park.about_us && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ticket-card max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                <Info className="w-5 h-5" /> Chi Siamo
              </h3>
              <button onClick={() => setShowAboutModal(false)} className="text-amber-400/60 hover:text-amber-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-amber-100/80 whitespace-pre-wrap">{park.about_us}</div>
          </div>
        </div>
      )}

      {/* Eventi Modal */}
      {showEventsModal && park.events && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="ticket-card max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <PartyPopper className="w-5 h-5" /> Eventi
              </h3>
              <button onClick={() => setShowEventsModal(false)} className="text-amber-400/60 hover:text-amber-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="text-amber-100/80 whitespace-pre-wrap">{park.events}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Coupon Card Component
const CouponCard = ({ coupon, cooldownHours }) => {
  const [availability, setAvailability] = useState({ available: true, message: '' });
  const [showModal, setShowModal] = useState(false);
  const [useResult, setUseResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const auth = useAuth();

  useEffect(() => {
    checkAvailability();
  }, [coupon.id]);

  const checkAvailability = async () => {
    try {
      const deviceId = getDeviceId();
      const response = await axios.get(`${API}/coupons/${coupon.id}/check-availability`, {
        params: { device_id: deviceId },
        headers: auth.getAuthHeaders()
      });
      setAvailability(response.data);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleUseNow = () => {
    setShowModal(true);
    setUseResult(null);
  };

  const confirmUse = async () => {
    try {
      setLoading(true);
      const deviceId = getDeviceId();
      const response = await axios.post(
        `${API}/coupons/${coupon.id}/use`,
        { device_id: deviceId },
        { headers: auth.getAuthHeaders() }
      );
      setUseResult(response.data);
      if (response.data.success) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        checkAvailability();
      }
    } catch (error) {
      setUseResult({ success: false, message: 'Errore durante l\'utilizzo del coupon' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Confetti show={showConfetti} />
      
      <div className={`ticket-card luna-card overflow-hidden ${useResult?.success ? 'coupon-success' : ''}`} data-testid={`coupon-card-${coupon.id}`}>
        {/* Immagine coupon con link */}
        {coupon.image_url && (
          coupon.link_url ? (
            <a href={coupon.link_url} target="_blank" rel="noopener noreferrer" className="block">
              <div className="h-32 relative">
                <img src={coupon.image_url} alt={coupon.ride_name} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Apri link
                </div>
              </div>
            </a>
          ) : (
            <div className="h-32">
              <img src={coupon.image_url} alt={coupon.ride_name} className="w-full h-full object-cover" />
            </div>
          )
        )}
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-amber-400">{coupon.ride_name}</h3>
              {coupon.ride_number && (
                <p className="text-amber-200/60 text-sm">Giostra N° {coupon.ride_number}</p>
              )}
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a0a1a] px-3 py-1 rounded-full font-bold text-lg">
              {coupon.discount_description}
            </div>
          </div>

          {coupon.owner_surname && (
            <p className="text-amber-100/70 text-sm mb-3">
              Titolare: <span className="text-amber-300">{coupon.owner_surname}</span>
            </p>
          )}

          {!availability.available && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mb-3 text-sm text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {availability.message}
            </div>
          )}

          <button
            onClick={handleUseNow}
            disabled={!availability.available}
            className="btn-use-now w-full"
            data-testid={`use-coupon-btn-${coupon.id}`}
          >
            {availability.available ? (
              <>
                <Ticket className="w-5 h-5 inline mr-2" />
                Usa Ora
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 inline mr-2" />
                Non disponibile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Use Confirmation Modal CORRETTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="coupon-modal">
          <div className="ticket-card max-w-md w-full p-6 relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-amber-400/60 hover:text-amber-400"
              data-testid="close-modal-btn"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-2xl font-bold text-amber-400 mb-4">Conferma Utilizzo</h3>
            
            {useResult ? (
              <div className="text-center py-4">
                {useResult.success ? (
                  <>
                    <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-green-400 mb-2">Coupon Validato!</p>
                    <p className="text-amber-100">Mostra questa schermata in cassa.</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-16 h-16 text-pink-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-pink-400 mb-2">Errore</p>
                    <p className="text-amber-100">{useResult.message}</p>
                  </>
                )}
                <button onClick={() => setShowModal(false)} className="mt-6 w-full py-2 rounded-xl border border-amber-500 text-amber-500 font-bold">
                  Chiudi
                </button>
              </div>
            ) : (
              <>
                <p className="text-amber-100 mb-6">
                  Vuoi usare il coupon per <strong className="text-amber-400">{coupon.ride_name}</strong>?<br/>
                  <span className="text-sm opacity-70 mt-2 block">Attenzione: l'operazione è irreversibile e il coupon non sarà più disponibile per {cooldownHours || 24} ore.</span>
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-amber-500 text-amber-500 font-bold">
                    Annulla
                  </button>
                  <button onClick={confirmUse} disabled={loading} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a0a1a] font-bold">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Conferma"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// --- COMPONENTE APP PRINCIPALE E ROTTE ---
function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <div className="app-container">
          <AuthContent />
        </div>
      </HashRouter>
    </AuthProvider>
  );
}

function AuthContent() {
  const { user, logout } = useAuth();
  
  return (
    <>
      <Header user={user} logout={logout} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/park/:parkId" element={<ParkDetailPage />} />
        {/* Se avevi altre pagine come Login, inseriscile qui sotto */}
        {/* <Route path="/login" element={<Login />} /> */}
        <Route path="*" element={<div className="text-white p-20 text-center text-2xl">Errore 404 - Pagina non trovata</div>} />
      </Routes>
    </>
  );
}

export default App;
