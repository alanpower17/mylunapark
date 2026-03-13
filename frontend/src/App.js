import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { Search, MapPin, Ticket, Clock, ChevronRight, User, LogOut, Settings, Home, Star, Menu, X, Check, AlertCircle, Loader2, Aperture, Shield, Building2, Gift, Users, BarChart3, Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

// Use Aperture as FerrisWheel icon alternative
const FerrisWheel = Aperture;

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Device ID for non-registered users
const getDeviceId = () => {
  let deviceId = localStorage.getItem('lunapark_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('lunapark_device_id', deviceId);
  }
  return deviceId;
};

// Auth Context
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lunapark_token');
    const userData = localStorage.getItem('lunapark_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
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

  const getAuthHeaders = () => {
    const token = localStorage.getItem('lunapark_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return { user, loading, login, logout, getAuthHeaders };
};

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

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="bg-gradient-to-r from-[#1a0a2e]/95 via-[#0f1628]/95 to-[#1a0a2e]/95 backdrop-blur-md border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <FerrisWheel className="w-8 h-8 text-amber-400" />
              <span className="font-bold text-xl text-amber-400 text-glow-gold hidden sm:block">
                Luna Park Coupon
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-4">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} data-testid="nav-home">
                <Home className="w-4 h-4 inline mr-1" /> Home
              </Link>
              {isOrganizer && (
                <Link to="/dashboard" className={`nav-link ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`} data-testid="nav-dashboard">
                  <Settings className="w-4 h-4 inline mr-1" /> Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className={`nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`} data-testid="nav-admin">
                  <Shield className="w-4 h-4 inline mr-1" /> Admin
                </Link>
              )}
              {user ? (
                <div className="flex items-center gap-3">
                  <span className="text-amber-200 text-sm">{user.name}</span>
                  <button onClick={logout} className="nav-link text-pink-400 hover:text-pink-300" data-testid="logout-btn">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn-luna text-sm" data-testid="login-btn">
                  Accedi
                </Link>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-amber-400 p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="mobile-menu-btn"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Nav */}
          {menuOpen && (
            <nav className="md:hidden mt-4 pb-2 flex flex-col gap-2">
              <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-home">
                <Home className="w-4 h-4 inline mr-2" /> Home
              </Link>
              {isOrganizer && (
                <Link to="/dashboard" className="nav-link" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-dashboard">
                  <Settings className="w-4 h-4 inline mr-2" /> Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="nav-link" onClick={() => setMenuOpen(false)} data-testid="mobile-nav-admin">
                  <Shield className="w-4 h-4 inline mr-2" /> Admin
                </Link>
              )}
              {user ? (
                <button onClick={() => { logout(); setMenuOpen(false); }} className="nav-link text-left text-pink-400" data-testid="mobile-logout-btn">
                  <LogOut className="w-4 h-4 inline mr-2" /> Esci ({user.name})
                </button>
              ) : (
                <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)} data-testid="mobile-login-link">
                  <User className="w-4 h-4 inline mr-2" /> Accedi
                </Link>
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

  useEffect(() => {
    fetchParks();
  }, []);

  const fetchParks = async (searchQuery = '') => {
    try {
      setLoading(true);
      const params = searchQuery ? { search: searchQuery } : {};
      const response = await axios.get(`${API}/lunaparks`, { params });
      setParks(response.data);
    } catch (error) {
      console.error('Error fetching parks:', error);
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

  return (
    <div className="min-h-screen starry-bg">
      {/* Hero Section */}
      <section className="relative py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-amber-400 text-glow-gold mb-4" data-testid="hero-title">
            Risparmia al Luna Park!
          </h1>
          <p className="text-lg md:text-xl text-amber-100/80 mb-8">
            Trova coupon e sconti per le giostre dei migliori luna park d'Italia
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/60" />
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
            <FerrisWheel className="w-6 h-6" />
            Luna Park disponibili
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner-luna" data-testid="loading-spinner"></div>
            </div>
          ) : parks.length === 0 ? (
            <div className="text-center py-12 text-amber-200/60" data-testid="no-parks-message">
              <FerrisWheel className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Nessun luna park trovato</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parks.map((park) => (
                <ParkCard key={park.id} park={park} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-12 border-t border-amber-500/20">
        <div className="max-w-2xl mx-auto text-center">
          <Gift className="w-12 h-12 text-pink-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-amber-300 mb-3">
            Registrati per vantaggi esclusivi!
          </h3>
          <p className="text-amber-100/70 mb-6">
            Salva i tuoi coupon preferiti e ricevi notifiche sulle nuove offerte
          </p>
          <Link to="/register" className="btn-luna inline-block" data-testid="cta-register-btn">
            Iscriviti Gratis
          </Link>
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
const ParkCard = ({ park }) => {
  return (
    <Link to={`/park/${park.id}`} className="block" data-testid={`park-card-${park.id}`}>
      <div className="ticket-card luna-card overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-purple-900/50 to-blue-900/50 relative">
          {park.image_url ? (
            <img src={park.image_url} alt={park.name} className="w-full h-full object-cover opacity-80" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FerrisWheel className="w-16 h-16 text-amber-400/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0a2e] to-transparent" />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold text-amber-400 mb-2">{park.name}</h3>
          <p className="text-amber-100/70 text-sm mb-3 line-clamp-2">{park.description}</p>
          <div className="flex items-center gap-2 text-sm text-amber-200/60">
            <MapPin className="w-4 h-4" />
            <span>{park.city}, {park.region}</span>
          </div>
          {park.opening_hours && (
            <div className="flex items-center gap-2 text-sm text-amber-200/60 mt-1">
              <Clock className="w-4 h-4" />
              <span>{park.opening_hours}</span>
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

  useEffect(() => {
    fetchParkDetails();
  }, [parkId]);

  const fetchParkDetails = async () => {
    try {
      setLoading(true);
      const [parkRes, couponsRes] = await Promise.all([
        axios.get(`${API}/lunaparks/${parkId}`),
        axios.get(`${API}/lunaparks/${parkId}/coupons`)
      ]);
      setPark(parkRes.data);
      setCoupons(couponsRes.data);
    } catch (error) {
      console.error('Error fetching park details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.ride_name.toLowerCase().includes(search.toLowerCase()) ||
    c.ride_number.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-3xl md:text-4xl font-bold text-amber-400 text-glow-gold" data-testid="park-name">
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
        <p className="text-amber-100/70 mb-6">{park.description}</p>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/60" />
          <input
            type="text"
            placeholder="Cerca giostra per nome o numero..."
            className="search-input"
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
              Ogni coupon può essere usato ogni <span className="text-cyan-400 font-bold">{park.coupon_cooldown_hours} ore</span>
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

        {/* Ad Placeholder */}
        <div className="ad-placeholder mt-8">
          <p>Spazio pubblicitario</p>
        </div>
      </div>
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
      
      <div className={`ticket-card luna-card p-4 ${useResult?.success ? 'coupon-success' : ''}`} data-testid={`coupon-card-${coupon.id}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold text-amber-400">{coupon.ride_name}</h3>
            <p className="text-amber-200/60 text-sm">Giostra N° {coupon.ride_number}</p>
          </div>
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-[#0a0a1a] px-3 py-1 rounded-full font-bold text-lg">
            -{coupon.discount_description}
          </div>
        </div>

        <p className="text-amber-100/70 text-sm mb-3">
          Titolare: <span className="text-amber-300">{coupon.owner_surname}</span>
        </p>

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

      {/* Use Confirmation Modal */}
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

            {!useResult ? (
              <>
                <div className="text-center mb-6">
                  <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-amber-400 mb-2">Conferma utilizzo</h3>
                  <p className="text-amber-100/80">
                    Stai per usare il coupon per <span className="text-amber-300 font-bold">{coupon.ride_name}</span>
                  </p>
                  <p className="text-pink-400 mt-2 text-sm">
                    Non potrai usare questo coupon per le prossime <span className="font-bold">{cooldownHours} ore</span>
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 btn-luna-pink"
                    data-testid="cancel-use-btn"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmUse}
                    disabled={loading}
                    className="flex-1 btn-use-now"
                    data-testid="confirm-use-btn"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Conferma'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center">
                {useResult.success ? (
                  <>
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-12 h-12 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-400 mb-2">Coupon Utilizzato!</h3>
                    <p className="text-amber-100/80 mb-4">{useResult.message}</p>
                    <div className="bg-[#0a0a1a] rounded-xl p-6 mb-4 border-2 border-green-500/50">
                      <p className="text-amber-400 font-bold text-xl mb-1">{coupon.ride_name}</p>
                      <p className="text-amber-200">N° {coupon.ride_number}</p>
                      <p className="text-3xl font-bold text-green-400 mt-3">-{coupon.discount_description}</p>
                      <p className="text-amber-200/60 text-sm mt-2">Titolare: {coupon.owner_surname}</p>
                    </div>
                    <p className="text-amber-200/60 text-sm">
                      Mostra questa schermata alla cassa della giostra
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-12 h-12 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Ops!</h3>
                    <p className="text-amber-100/80 mb-4">{useResult.message}</p>
                  </>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-luna mt-4"
                  data-testid="close-result-btn"
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Login Page
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      auth.login(response.data, response.data.token);
      
      if (response.data.role === 'admin') {
        navigate('/admin');
      } else if (response.data.role === 'organizzatore') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen starry-bg flex items-center justify-center p-4">
      <div className="ticket-card max-w-md w-full p-6 md:p-8">
        <div className="text-center mb-8">
          <FerrisWheel className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-400 text-glow-gold">Accedi</h1>
          <p className="text-amber-100/70 mt-2">Entra nel mondo dei coupon</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <div>
            <label className="block text-amber-200 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="search-input rounded-xl"
              placeholder="email@esempio.it"
              required
              data-testid="login-email-input"
            />
          </div>

          <div>
            <label className="block text-amber-200 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="search-input rounded-xl pr-12"
                placeholder="••••••••"
                required
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400/60"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-luna w-full mt-6"
            data-testid="login-submit-btn"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-amber-100/60 text-sm">
            Non hai un account?{' '}
            <Link to="/register" className="text-amber-400 hover:underline" data-testid="register-link">
              Registrati
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
          <p className="text-amber-300 text-sm font-medium mb-2">Account Demo:</p>
          <p className="text-amber-100/70 text-xs">Admin: admin@lunapark.it / admin123</p>
          <p className="text-amber-100/70 text-xs">Organizzatore: organizzatore@lunapark.it / org123</p>
        </div>
      </div>
    </div>
  );
};

// Register Page
const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cliente'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      auth.login(response.data, response.data.token);
      
      if (formData.role === 'organizzatore') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen starry-bg flex items-center justify-center p-4">
      <div className="ticket-card max-w-md w-full p-6 md:p-8">
        <div className="text-center mb-8">
          <FerrisWheel className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-400 text-glow-gold">Registrati</h1>
          <p className="text-amber-100/70 mt-2">Unisciti alla community dei risparmiatori</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm" data-testid="register-error">
              {error}
            </div>
          )}

          <div>
            <label className="block text-amber-200 text-sm mb-2">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="search-input rounded-xl"
              placeholder="Il tuo nome"
              required
              data-testid="register-name-input"
            />
          </div>

          <div>
            <label className="block text-amber-200 text-sm mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="search-input rounded-xl"
              placeholder="email@esempio.it"
              required
              data-testid="register-email-input"
            />
          </div>

          <div>
            <label className="block text-amber-200 text-sm mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="search-input rounded-xl pr-12"
                placeholder="••••••••"
                required
                minLength={6}
                data-testid="register-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400/60"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-amber-200 text-sm mb-2">Tipo Account</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'cliente' })}
                className={`p-3 rounded-xl border-2 transition-all ${
                  formData.role === 'cliente'
                    ? 'border-amber-400 bg-amber-400/20'
                    : 'border-amber-400/30 hover:border-amber-400/50'
                }`}
                data-testid="role-cliente-btn"
              >
                <User className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                <span className="text-amber-200 text-sm">Cliente</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'organizzatore' })}
                className={`p-3 rounded-xl border-2 transition-all ${
                  formData.role === 'organizzatore'
                    ? 'border-pink-400 bg-pink-400/20'
                    : 'border-pink-400/30 hover:border-pink-400/50'
                }`}
                data-testid="role-organizzatore-btn"
              >
                <Building2 className="w-6 h-6 text-pink-400 mx-auto mb-1" />
                <span className="text-amber-200 text-sm">Organizzatore</span>
              </button>
            </div>
            {formData.role === 'organizzatore' && (
              <p className="text-amber-100/60 text-xs mt-2">
                Gli account organizzatore richiedono approvazione dell'admin
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-luna w-full mt-6"
            data-testid="register-submit-btn"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Registrati'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-amber-100/60 text-sm">
            Hai già un account?{' '}
            <Link to="/login" className="text-amber-400 hover:underline" data-testid="login-link">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Page (Organizer)
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [parks, setParks] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.user || (auth.user.role !== 'organizzatore' && auth.user.role !== 'admin')) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [auth.user]);

  const fetchData = async () => {
    try {
      const [statsRes, parksRes] = await Promise.all([
        axios.get(`${API}/organizer/stats`, { headers: auth.getAuthHeaders() }),
        axios.get(`${API}/organizer/lunaparks`, { headers: auth.getAuthHeaders() })
      ]);
      setStats(statsRes.data);
      setParks(parksRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-luna"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen starry-bg p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-400 text-glow-gold mb-8" data-testid="dashboard-title">
          Dashboard Organizzatore
        </h1>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="ticket-card p-4 text-center">
              <FerrisWheel className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-400">{stats.total_parks}</p>
              <p className="text-amber-200/60 text-sm">Luna Park</p>
            </div>
            <div className="ticket-card p-4 text-center">
              <Star className="w-8 h-8 text-pink-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-pink-400">{stats.total_rides}</p>
              <p className="text-amber-200/60 text-sm">Giostre</p>
            </div>
            <div className="ticket-card p-4 text-center">
              <Ticket className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-cyan-400">{stats.total_coupons}</p>
              <p className="text-amber-200/60 text-sm">Coupon</p>
            </div>
            <div className="ticket-card p-4 text-center">
              <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-400">{stats.total_usages}</p>
              <p className="text-amber-200/60 text-sm">Utilizzi</p>
            </div>
          </div>
        )}

        {/* Parks List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-amber-300">I tuoi Luna Park</h2>
          <Link to="/dashboard/park/new" className="btn-luna text-sm" data-testid="add-park-btn">
            <Plus className="w-4 h-4 inline mr-1" /> Aggiungi
          </Link>
        </div>

        {parks.length === 0 ? (
          <div className="ticket-card p-8 text-center" data-testid="no-parks-dashboard">
            <FerrisWheel className="w-16 h-16 text-amber-400/40 mx-auto mb-4" />
            <p className="text-amber-200/60">Non hai ancora aggiunto nessun luna park</p>
            <Link to="/dashboard/park/new" className="btn-luna mt-4 inline-block">
              Aggiungi il tuo primo Luna Park
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {parks.map((park) => (
              <div key={park.id} className="ticket-card p-4 flex items-center justify-between" data-testid={`dashboard-park-${park.id}`}>
                <div>
                  <h3 className="text-lg font-bold text-amber-400">{park.name}</h3>
                  <p className="text-amber-200/60 text-sm">{park.city}, {park.region}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                    park.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    park.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {park.status === 'approved' ? 'Approvato' : park.status === 'pending' ? 'In attesa' : 'Rifiutato'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link to={`/dashboard/park/${park.id}`} className="btn-luna text-sm" data-testid={`manage-park-${park.id}`}>
                    <Settings className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Park Management Page
const ParkManagementPage = () => {
  const { parkId } = useParams();
  const isNew = parkId === 'new';
  const [park, setPark] = useState(null);
  const [rides, setRides] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    region: '',
    phone: '',
    opening_hours: '',
    coupon_cooldown_hours: 24
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNew) {
      fetchParkData();
    }
  }, [parkId]);

  const fetchParkData = async () => {
    try {
      const [parkRes, ridesRes, couponsRes] = await Promise.all([
        axios.get(`${API}/lunaparks/${parkId}`, { headers: auth.getAuthHeaders() }),
        axios.get(`${API}/lunaparks/${parkId}/rides`, { headers: auth.getAuthHeaders() }),
        axios.get(`${API}/lunaparks/${parkId}/coupons`, { params: { active_only: false }, headers: auth.getAuthHeaders() })
      ]);
      setPark(parkRes.data);
      setFormData(parkRes.data);
      setRides(ridesRes.data);
      setCoupons(couponsRes.data);
    } catch (error) {
      console.error('Error fetching park:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePark = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isNew) {
        const response = await axios.post(`${API}/lunaparks`, formData, { headers: auth.getAuthHeaders() });
        navigate(`/dashboard/park/${response.data.id}`);
      } else {
        await axios.put(`${API}/lunaparks/${parkId}`, formData, { headers: auth.getAuthHeaders() });
        fetchParkData();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-luna"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen starry-bg p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard" className="text-amber-400 hover:text-amber-300">
            <ChevronRight className="w-6 h-6 rotate-180" />
          </Link>
          <h1 className="text-2xl font-bold text-amber-400" data-testid="park-management-title">
            {isNew ? 'Nuovo Luna Park' : park?.name}
          </h1>
        </div>

        {/* Tabs */}
        {!isNew && (
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {['info', 'giostre', 'coupon'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-amber-400 text-[#0a0a1a]'
                    : 'bg-amber-400/20 text-amber-400 hover:bg-amber-400/30'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab === 'info' ? 'Informazioni' : tab === 'giostre' ? 'Giostre' : 'Coupon'}
              </button>
            ))}
          </div>
        )}

        {/* Info Tab */}
        {(isNew || activeTab === 'info') && (
          <form onSubmit={handleSavePark} className="ticket-card p-6 space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-200 text-sm mb-2">Nome Luna Park *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="search-input rounded-xl"
                  required
                  data-testid="park-name-input"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm mb-2">Città *</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="search-input rounded-xl"
                  required
                  data-testid="park-city-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-amber-200 text-sm mb-2">Descrizione *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="search-input rounded-xl h-24 resize-none"
                required
                data-testid="park-description-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-amber-200 text-sm mb-2">Indirizzo *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="search-input rounded-xl"
                  required
                  data-testid="park-address-input"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm mb-2">Regione *</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="search-input rounded-xl"
                  required
                  data-testid="park-region-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-amber-200 text-sm mb-2">Telefono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="search-input rounded-xl"
                  data-testid="park-phone-input"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm mb-2">Orari apertura</label>
                <input
                  type="text"
                  value={formData.opening_hours}
                  onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                  className="search-input rounded-xl"
                  placeholder="es: 18:00 - 24:00"
                  data-testid="park-hours-input"
                />
              </div>
              <div>
                <label className="block text-amber-200 text-sm mb-2">Cooldown coupon (ore)</label>
                <input
                  type="number"
                  value={formData.coupon_cooldown_hours}
                  onChange={(e) => setFormData({ ...formData, coupon_cooldown_hours: parseInt(e.target.value) })}
                  className="search-input rounded-xl"
                  min="1"
                  data-testid="park-cooldown-input"
                />
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-luna" data-testid="save-park-btn">
              {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isNew ? 'Crea Luna Park' : 'Salva modifiche')}
            </button>
          </form>
        )}

        {/* Rides Tab */}
        {activeTab === 'giostre' && <RidesManager parkId={parkId} rides={rides} onUpdate={fetchParkData} auth={auth} />}

        {/* Coupons Tab */}
        {activeTab === 'coupon' && <CouponsManager parkId={parkId} rides={rides} coupons={coupons} onUpdate={fetchParkData} auth={auth} />}
      </div>
    </div>
  );
};

// Rides Manager Component
const RidesManager = ({ parkId, rides, onUpdate, auth }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRide, setEditingRide] = useState(null);
  const [formData, setFormData] = useState({ name: '', number: '', description: '', owner_surname: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingRide) {
        await axios.put(`${API}/rides/${editingRide.id}`, formData, { headers: auth.getAuthHeaders() });
      } else {
        await axios.post(`${API}/lunaparks/${parkId}/rides`, formData, { headers: auth.getAuthHeaders() });
      }
      setShowForm(false);
      setEditingRide(null);
      setFormData({ name: '', number: '', description: '', owner_surname: '' });
      onUpdate();
    } catch (error) {
      console.error('Error saving ride:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rideId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa giostra?')) return;
    try {
      await axios.delete(`${API}/rides/${rideId}`, { headers: auth.getAuthHeaders() });
      onUpdate();
    } catch (error) {
      console.error('Error deleting ride:', error);
    }
  };

  const startEdit = (ride) => {
    setEditingRide(ride);
    setFormData(ride);
    setShowForm(true);
  };

  return (
    <div className="ticket-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-amber-400">Giostre ({rides.length})</h3>
        <button onClick={() => { setShowForm(true); setEditingRide(null); setFormData({ name: '', number: '', description: '', owner_surname: '' }); }} className="btn-luna text-sm" data-testid="add-ride-btn">
          <Plus className="w-4 h-4 inline mr-1" /> Aggiungi
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-amber-400/10 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Nome giostra *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="search-input rounded-xl text-sm"
              required
              data-testid="ride-name-input"
            />
            <input
              type="text"
              placeholder="Numero *"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="search-input rounded-xl text-sm"
              required
              data-testid="ride-number-input"
            />
          </div>
          <input
            type="text"
            placeholder="Cognome titolare *"
            value={formData.owner_surname}
            onChange={(e) => setFormData({ ...formData, owner_surname: e.target.value })}
            className="search-input rounded-xl text-sm"
            required
            data-testid="ride-owner-input"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-luna-pink text-sm flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-luna text-sm flex-1" data-testid="save-ride-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingRide ? 'Salva' : 'Aggiungi')}
            </button>
          </div>
        </form>
      )}

      {rides.length === 0 ? (
        <p className="text-amber-200/60 text-center py-4">Nessuna giostra aggiunta</p>
      ) : (
        <div className="space-y-2">
          {rides.map((ride) => (
            <div key={ride.id} className="bg-amber-400/5 rounded-xl p-3 flex items-center justify-between" data-testid={`ride-item-${ride.id}`}>
              <div>
                <p className="text-amber-300 font-medium">{ride.name} <span className="text-amber-200/60">#{ride.number}</span></p>
                <p className="text-amber-200/60 text-sm">Titolare: {ride.owner_surname}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(ride)} className="text-amber-400 hover:text-amber-300 p-1" data-testid={`edit-ride-${ride.id}`}>
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(ride.id)} className="text-red-400 hover:text-red-300 p-1" data-testid={`delete-ride-${ride.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Coupons Manager Component
const CouponsManager = ({ parkId, rides, coupons, onUpdate, auth }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState({ ride_id: '', discount_amount: 1, discount_description: '1€ di sconto', is_active: true });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCoupon) {
        await axios.put(`${API}/coupons/${editingCoupon.id}`, formData, { headers: auth.getAuthHeaders() });
      } else {
        await axios.post(`${API}/lunaparks/${parkId}/coupons`, formData, { headers: auth.getAuthHeaders() });
      }
      setShowForm(false);
      setEditingCoupon(null);
      setFormData({ ride_id: '', discount_amount: 1, discount_description: '1€ di sconto', is_active: true });
      onUpdate();
    } catch (error) {
      console.error('Error saving coupon:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo coupon?')) return;
    try {
      await axios.delete(`${API}/coupons/${couponId}`, { headers: auth.getAuthHeaders() });
      onUpdate();
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  const startEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData(coupon);
    setShowForm(true);
  };

  return (
    <div className="ticket-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-amber-400">Coupon ({coupons.length})</h3>
        <button 
          onClick={() => { setShowForm(true); setEditingCoupon(null); setFormData({ ride_id: '', discount_amount: 1, discount_description: '1€ di sconto', is_active: true }); }} 
          className="btn-luna text-sm"
          disabled={rides.length === 0}
          data-testid="add-coupon-btn"
        >
          <Plus className="w-4 h-4 inline mr-1" /> Aggiungi
        </button>
      </div>

      {rides.length === 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-amber-300 text-sm">
          Aggiungi prima delle giostre per creare coupon
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-amber-400/10 rounded-xl p-4 mb-4 space-y-3">
          <select
            value={formData.ride_id}
            onChange={(e) => setFormData({ ...formData, ride_id: e.target.value })}
            className="search-input rounded-xl text-sm"
            required
            data-testid="coupon-ride-select"
          >
            <option value="">Seleziona giostra *</option>
            {rides.map((ride) => (
              <option key={ride.id} value={ride.id}>{ride.name} (#{ride.number})</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              step="0.5"
              min="0.5"
              placeholder="Sconto (€) *"
              value={formData.discount_amount}
              onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) })}
              className="search-input rounded-xl text-sm"
              required
              data-testid="coupon-amount-input"
            />
            <input
              type="text"
              placeholder="Descrizione sconto *"
              value={formData.discount_description}
              onChange={(e) => setFormData({ ...formData, discount_description: e.target.value })}
              className="search-input rounded-xl text-sm"
              required
              data-testid="coupon-description-input"
            />
          </div>
          <label className="flex items-center gap-2 text-amber-200">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4"
              data-testid="coupon-active-checkbox"
            />
            Coupon attivo
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-luna-pink text-sm flex-1">Annulla</button>
            <button type="submit" disabled={saving} className="btn-luna text-sm flex-1" data-testid="save-coupon-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (editingCoupon ? 'Salva' : 'Aggiungi')}
            </button>
          </div>
        </form>
      )}

      {coupons.length === 0 ? (
        <p className="text-amber-200/60 text-center py-4">Nessun coupon creato</p>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <div key={coupon.id} className={`bg-amber-400/5 rounded-xl p-3 flex items-center justify-between ${!coupon.is_active ? 'opacity-50' : ''}`} data-testid={`coupon-item-${coupon.id}`}>
              <div>
                <p className="text-amber-300 font-medium">{coupon.ride_name} <span className="text-amber-200/60">#{coupon.ride_number}</span></p>
                <p className="text-green-400 font-bold">-{coupon.discount_description}</p>
                <p className="text-amber-200/60 text-sm">Titolare: {coupon.owner_surname}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(coupon)} className="text-amber-400 hover:text-amber-300 p-1" data-testid={`edit-coupon-${coupon.id}`}>
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(coupon.id)} className="text-red-400 hover:text-red-300 p-1" data-testid={`delete-coupon-${coupon.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Admin Page
const AdminPage = () => {
  const [pendingParks, setPendingParks] = useState([]);
  const [allParks, setAllParks] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.user || auth.user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [auth.user]);

  const fetchData = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        axios.get(`${API}/admin/lunaparks/pending`, { headers: auth.getAuthHeaders() }),
        axios.get(`${API}/lunaparks`, { params: { status: 'approved' }, headers: auth.getAuthHeaders() })
      ]);
      setPendingParks(pendingRes.data);
      setAllParks(allRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (parkId) => {
    try {
      await axios.put(`${API}/admin/lunaparks/${parkId}/approve`, {}, { headers: auth.getAuthHeaders() });
      fetchData();
    } catch (error) {
      console.error('Error approving park:', error);
    }
  };

  const handleReject = async (parkId) => {
    if (!window.confirm('Sei sicuro di voler rifiutare questo luna park?')) return;
    try {
      await axios.put(`${API}/admin/lunaparks/${parkId}/reject`, {}, { headers: auth.getAuthHeaders() });
      fetchData();
    } catch (error) {
      console.error('Error rejecting park:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner-luna"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen starry-bg p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-amber-400 text-glow-gold mb-8" data-testid="admin-title">
          <Shield className="w-8 h-8 inline mr-2" />
          Pannello Admin
        </h1>

        {/* Pending Parks */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Luna Park in attesa di approvazione ({pendingParks.length})
          </h2>

          {pendingParks.length === 0 ? (
            <div className="ticket-card p-6 text-center text-amber-200/60" data-testid="no-pending-parks">
              <Check className="w-12 h-12 mx-auto mb-2 text-green-400" />
              Nessun luna park in attesa
            </div>
          ) : (
            <div className="space-y-4">
              {pendingParks.map((park) => (
                <div key={park.id} className="ticket-card p-4" data-testid={`pending-park-${park.id}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-amber-400">{park.name}</h3>
                      <p className="text-amber-200/60 text-sm">{park.address}, {park.city}, {park.region}</p>
                      <p className="text-amber-100/70 text-sm mt-2">{park.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleApprove(park.id)} className="btn-luna text-sm flex-1" data-testid={`approve-park-${park.id}`}>
                      <Check className="w-4 h-4 inline mr-1" /> Approva
                    </button>
                    <button onClick={() => handleReject(park.id)} className="btn-luna-pink text-sm flex-1" data-testid={`reject-park-${park.id}`}>
                      <X className="w-4 h-4 inline mr-1" /> Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All Parks */}
        <section>
          <h2 className="text-xl font-bold text-amber-300 mb-4 flex items-center gap-2">
            <FerrisWheel className="w-5 h-5" />
            Luna Park approvati ({allParks.length})
          </h2>

          <div className="space-y-2">
            {allParks.map((park) => (
              <div key={park.id} className="ticket-card p-4 flex items-center justify-between" data-testid={`approved-park-${park.id}`}>
                <div>
                  <h3 className="text-lg font-bold text-amber-400">{park.name}</h3>
                  <p className="text-amber-200/60 text-sm">{park.city}, {park.region}</p>
                </div>
                <Link to={`/park/${park.id}`} className="text-amber-400 hover:text-amber-300">
                  <ChevronRight className="w-6 h-6" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const auth = useAuth();

  // Seed data on first load
  useEffect(() => {
    const seedData = async () => {
      try {
        await axios.post(`${API}/seed`);
      } catch (error) {
        // Ignore errors - data might already be seeded
      }
    };
    seedData();
  }, []);

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="spinner-luna"></div>
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-[#0a0a1a]">
      <BrowserRouter>
        <Header user={auth.user} logout={auth.logout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/park/:parkId" element={<ParkDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/park/:parkId" element={<ParkManagementPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
