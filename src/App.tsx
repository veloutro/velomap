/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore, RouteData } from './store';
import { MOCK_ROUTES } from './mockData';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap, LayersControl, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Bike, 
  Map as MapIcon, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Info, 
  Navigation, 
  Cloud, 
  Download,
  Layers,
  Search,
  MapPin,
  Settings,
  Plus,
  Trash2,
  X,
  List,
  Sun,
  Camera,
  Maximize2,
  Copy,
  Thermometer,
  CloudRain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from './lib/utils';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ROUTE_COLORS = {
  road: '#3B82F6', // Blue
  'cross-country': '#10B981', // Green
  gravel: '#F59E0B', // Orange
};

const TRANSLATIONS = {
  road: 'Шоссе',
  'cross-country': 'Кросс-кантри',
  gravel: 'Гравий',
  easy: 'Легкий',
  medium: 'Средний',
  hard: 'Сложный',
  perfect: 'Идеальное',
  good: 'Хорошее',
  bad: 'Плохое',
  terrible: 'Ужасное',
  landmark: 'Достопримечательность',
  rest: 'Место отдыха',
  shop: 'Магазин/Сервис',
  viewpoint: 'Смотровая площадка',
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: onMapClick,
  });
  return null;
};

const POIWeather = ({ lat, lon }: { lat: number, lon: number }) => {
  const [data, setData] = useState<{ temp: number; code: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const json = await res.json();
        if (json.current_weather) {
          setData({
            temp: Math.round(json.current_weather.temperature),
            code: json.current_weather.weathercode
          });
        }
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [lat, lon]);

  if (loading) return <div className="animate-pulse h-4 w-12 bg-white/5 rounded-md" />;
  if (!data) return null;

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    if (code <= 3) return <Cloud className="w-3.5 h-3.5 text-neutral-400" />;
    return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
  };

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
      {getWeatherIcon(data.code)}
      <span className="text-[11px] font-mono font-bold text-white">{data.temp}°C</span>
    </div>
  );
};

const MapController = ({ center, selectedRoute, isMobile, drawerState }: { 
  center: [number, number], 
  selectedRoute: RouteData | null,
  isMobile: boolean,
  drawerState: 'peek' | 'full'
}) => {
  const map = useMap();
  useEffect(() => {
    if (selectedRoute) {
      const bounds = L.geoJSON(selectedRoute.geoJson).getBounds();
      
      // Вычисляем отступы так, чтобы трек не попадал под плашку
      // В режиме peek плашка занимает около 30-35% экрана снизу
      const bottomPadding = drawerState === 'peek' 
        ? (isMobile ? window.innerHeight * 0.35 : window.innerHeight * 0.4)
        : 50;

      map.fitBounds(bounds, { 
        paddingTopLeft: [50, 50], 
        paddingBottomRight: [50, bottomPadding],
        animate: true 
      });
    } else {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map, selectedRoute, isMobile, drawerState]);
  return null;
};

export default function App() {
  const { 
    routes,
    setRoutes,
    selectedRouteId, 
    setSelectedRouteId, 
    filters, 
    setFilters, 
    mapCenter, 
    setMapCenter,
    isAdminMode,
    setIsAdminMode,
    viewMode,
    setViewMode,
    addPhotoToPOI,
    addPOI
  } = useStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [weather, setWeather] = useState<{ temp: number; desc: string } | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [drawerState, setDrawerState] = useState<'peek' | 'full'>('peek');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [isAddingPOI, setIsAddingPOI] = useState(false);
  const [newPOICoords, setNewPOICoords] = useState<[number, number] | null>(null);
  const newMarkerRef = useRef<L.Marker>(null);

  useEffect(() => {
    if (newPOICoords && newMarkerRef.current) {
      newMarkerRef.current.openPopup();
    }
  }, [newPOICoords]);

  useEffect(() => {
    if (selectedRouteId) {
      setDrawerState('peek');
    }
  }, [selectedRouteId]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (routes.length === 0) {
      setRoutes(MOCK_ROUTES);
    }
  }, [routes, setRoutes]);

  const selectedRoute = routes.find(r => r.id === selectedRouteId);

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filters.type.includes(route.type);
    const matchesDistance = route.distance <= filters.maxDistance;
    const matchesElevation = route.elevationGain <= filters.maxElevation;
    return matchesSearch && matchesType && matchesDistance && matchesElevation;
  });

  useEffect(() => {
    const fetchMainWeather = async () => {
      if (!selectedRoute) {
        setWeather({ temp: 18, desc: 'Ясно' });
        return;
      }
      try {
        const [lon, lat] = selectedRoute.geoJson.geometry.coordinates[0];
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const json = await res.json();
        if (json.current_weather) {
          const code = json.current_weather.weathercode;
          let desc = 'Ясно';
          if (code > 0 && code <= 3) desc = 'Переменная облачность';
          if (code > 3) desc = 'Осадки';
          setWeather({ temp: Math.round(json.current_weather.temperature), desc });
        }
      } catch (err) {
        setWeather({ temp: 18, desc: 'Ясно' });
      }
    };
    fetchMainWeather();
  }, [selectedRouteId, selectedRoute]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);

  const handleRouteClick = (id: string) => {
    setSelectedRouteId(id);
    setIsEditing(false);
    const route = routes.find(r => r.id === id);
    if (route) {
      const coords = route.geoJson.geometry.coordinates[0];
      setMapCenter([coords[1], coords[0]]);
      setViewMode('map');
      if (isMobile) {
        setIsSidebarOpen(false);
      }
    }
  };

  const saveEditedRoute = () => {
    if (!editingRoute) return;
    setRoutes(routes.map(r => r.id === editingRoute.id ? editingRoute : r));
    setIsEditing(false);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setMapCenter([position.coords.latitude, position.coords.longitude]);
      });
    }
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<RouteData>>({
    name: '',
    type: 'road',
    difficulty: 'medium',
    distance: 25,
    elevationGain: 300,
    surfaceCondition: 'good'
  });

  const addRoute = () => {
    if (!newRoute.name) return;
    const routeToAdd: RouteData = {
      ...MOCK_ROUTES[0],
      ...newRoute,
      id: `route-${Date.now()}`,
      description: `Новый маршрут: ${newRoute.name}`,
      geoJson: MOCK_ROUTES[0].geoJson, // Mock geometry
      elevationProfile: MOCK_ROUTES[0].elevationProfile, // Mock profile
      pois: []
    } as RouteData;
    
    setRoutes([...routes, routeToAdd]);
    setNewRoute({
      name: '',
      type: 'road',
      difficulty: 'medium',
      distance: 25,
      elevationGain: 300,
      surfaceCondition: 'good'
    });
    setIsAddModalOpen(false);
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);

  const deleteRoute = () => {
    if (routeToDelete) {
      setRoutes(routes.filter(r => r.id !== routeToDelete));
      if (selectedRouteId === routeToDelete) setSelectedRouteId(null);
      setRouteToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] overflow-hidden font-sans text-white">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] rounded-[40px] p-10 w-full max-w-sm shadow-2xl text-center border border-white/10"
            >
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-serif italic mb-4 text-white">Удалить маршрут?</h2>
              <p className="text-neutral-500 text-sm leading-relaxed mb-8">Это действие нельзя будет отменить. Вы уверены?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-colors text-sm text-neutral-400"
                >
                  Отмена
                </button>
                <button 
                  onClick={deleteRoute}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors text-sm shadow-lg shadow-red-500/20"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#141414] rounded-[32px] p-8 md:p-10 w-full max-w-xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-3xl font-serif italic mb-8 text-white">Новый маршрут</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Название</label>
                  <input 
                    type="text" 
                    value={newRoute.name}
                    onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                    className="w-full p-4 bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 text-white"
                    placeholder="Напр: Горный спуск"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Тип</label>
                  <select 
                    value={newRoute.type}
                    onChange={(e) => setNewRoute({ ...newRoute, type: e.target.value as any })}
                    className="w-full p-4 bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 appearance-none text-white"
                  >
                    <option value="road" className="bg-[#141414]">Шоссе</option>
                    <option value="cross-country" className="bg-[#141414]">Кросс-кантри</option>
                    <option value="gravel" className="bg-[#141414]">Гравий</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Сложность</label>
                  <select 
                    value={newRoute.difficulty}
                    onChange={(e) => setNewRoute({ ...newRoute, difficulty: e.target.value as any })}
                    className="w-full p-4 bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 appearance-none text-white"
                  >
                    <option value="easy" className="bg-[#141414]">Легкий</option>
                    <option value="medium" className="bg-[#141414]">Средний</option>
                    <option value="hard" className="bg-[#141414]">Сложный</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Дистанция (км)</label>
                  <input 
                    type="number" 
                    value={newRoute.distance}
                    onChange={(e) => setNewRoute({ ...newRoute, distance: Number(e.target.value) })}
                    className="w-full p-4 bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">Набор высоты (м)</label>
                  <input 
                    type="number" 
                    value={newRoute.elevationGain}
                    onChange={(e) => setNewRoute({ ...newRoute, elevationGain: Number(e.target.value) })}
                    className="w-full p-4 bg-white/5 rounded-2xl outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 text-white"
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <p className="text-xs text-amber-500 leading-relaxed">
                    * В этой демо-версии геометрия и профиль будут скопированы из шаблона.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-4 border border-white/10 rounded-2xl font-bold hover:bg-white/5 transition-colors text-sm text-neutral-400"
                >
                  Отмена
                </button>
                <button 
                  onClick={addRoute}
                  className="flex-1 py-4 bg-white text-black rounded-2xl font-bold hover:bg-neutral-200 transition-colors text-sm shadow-lg shadow-white/5"
                >
                  Создать
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar (Filters & Search) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop for mobile */}
            {isMobile && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000]"
              />
            )}
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={cn(
                "fixed inset-y-0 left-0 z-[2001] bg-[#0A0A0A] border-r border-white/10 shadow-2xl flex flex-col",
                isMobile ? "w-full" : "w-[400px]"
              )}
            >
              <div className="p-6 md:p-10 flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-lg">
                      <Filter className="w-6 h-6 text-black" />
                    </div>
                    <h2 className="text-2xl font-serif italic tracking-tight text-white">Фильтры</h2>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-white/10 text-neutral-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Search & Filters */}
                <div className="space-y-10 flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Поиск</label>
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Название маршрута..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-white/20 transition-all outline-none text-sm text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Тип покрытия</label>
                    <div className="flex gap-2 flex-wrap">
                      {(['road', 'cross-country', 'gravel'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            const newTypes = filters.type.includes(type)
                              ? filters.type.filter(t => t !== type)
                              : [...filters.type, type];
                            setFilters({ type: newTypes });
                          }}
                          className={cn(
                            "px-5 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-wider border transition-all",
                            filters.type.includes(type) 
                              ? "bg-white text-black border-white shadow-lg" 
                              : "bg-transparent text-neutral-500 border-white/10 hover:border-white/30"
                          )}
                        >
                          {TRANSLATIONS[type]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-white/5">
                  <button 
                    onClick={() => {
                      setFilters({ type: ['road', 'cross-country', 'gravel'], maxDistance: 100, maxElevation: 2000 });
                      setSearchQuery('');
                    }}
                    className="w-full py-4 text-neutral-500 text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Сбросить все
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Desktop Header / Nav */}
        {!isMobile && (
          <header className="h-20 bg-[#0A0A0A] border-b border-white/10 px-8 flex items-center justify-between z-[1002] shrink-0">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white rounded-2xl shadow-lg shadow-white/5">
                  <Bike className="w-6 h-6 text-black" />
                </div>
                <h1 className="text-2xl font-serif italic tracking-tight text-white">VeloMap</h1>
              </div>

              <nav className="flex items-center bg-white/5 p-1.5 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    viewMode === 'map' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  <MapIcon className="w-4 h-4" />
                  Карта
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    viewMode === 'list' ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                  )}
                >
                  <List className="w-4 h-4" />
                  Список
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/10 text-neutral-500 flex items-center gap-3 px-5"
              >
                <Filter className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Фильтры</span>
              </button>
              
              <div className="h-8 w-px bg-white/10 mx-2" />

              <button 
                onClick={() => setIsAdminMode(!isAdminMode)}
                className={cn(
                  "p-3 rounded-2xl transition-all border flex items-center gap-3 px-5",
                  isAdminMode 
                    ? "bg-red-500/10 text-red-500 border-red-500/20" 
                    : "hover:bg-white/5 text-neutral-500 border-transparent hover:border-white/10"
                )}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Админ</span>
              </button>

              {isAdminMode && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="p-3 bg-white text-black rounded-2xl hover:bg-neutral-200 transition-all shadow-lg shadow-white/5 flex items-center gap-3 px-5"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Создать</span>
                </button>
              )}
            </div>
          </header>
        )}

        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-[#0A0A0A] border-b border-white/10 p-4 flex items-center justify-between z-[1000] shadow-sm sticky top-0 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white rounded-lg">
                <Bike className="w-4 h-4 text-black" />
              </div>
              <span className="font-serif italic text-xl text-white">VeloMap</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-neutral-400"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
          {/* Map Container */}
          <div className={cn(
            "absolute inset-0 z-0 transition-opacity duration-500",
            viewMode === 'list' ? "opacity-0 pointer-events-none" : "opacity-100"
          )}>
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            className="h-full w-full bg-[#0A0A0A]"
            zoomControl={false}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Dark Mode">
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="OpenStreetMap">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <MapController 
              center={mapCenter} 
              selectedRoute={selectedRoute || null} 
              isMobile={isMobile}
              drawerState={drawerState}
            />

            {isAddingPOI && (
              <MapClickHandler 
                onMapClick={(e) => {
                  setNewPOICoords([e.latlng.lat, e.latlng.lng]);
                  setDrawerState('full');
                }} 
              />
            )}

            {newPOICoords && (
              <Marker position={newPOICoords} ref={newMarkerRef}>
                <Popup className="custom-popup" minWidth={280}>
                  <div className="p-4 bg-[#141414] border border-white/10 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white">Новая точка</h4>
                      <button 
                        onClick={() => setNewPOICoords(null)}
                        className="p-1 hover:bg-white/5 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-neutral-500" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Название</p>
                        <input 
                          type="text" 
                          defaultValue="Новая точка"
                          placeholder="Название места"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors"
                          id="map-poi-name"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Описание</p>
                        <textarea 
                          placeholder="Краткое описание"
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20 transition-colors h-20 resize-none"
                          id="map-poi-desc"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-500 uppercase tracking-widest py-1">
                        <MapPin className="w-3 h-3" />
                        {newPOICoords[0].toFixed(4)}, {newPOICoords[1].toFixed(4)}
                      </div>
                      <button 
                        onClick={() => {
                          const name = (document.getElementById('map-poi-name') as HTMLInputElement).value;
                          const desc = (document.getElementById('map-poi-desc') as HTMLTextAreaElement).value;
                          if (name && selectedRouteId && newPOICoords) {
                            addPOI(selectedRouteId, {
                              id: Math.random().toString(36).substr(2, 9),
                              name,
                              description: desc || "Без описания",
                              coordinates: newPOICoords,
                              images: [`https://picsum.photos/seed/${Math.random()}/800/600`],
                              category: 'landmark'
                            });
                            setIsAddingPOI(false);
                            setNewPOICoords(null);
                          }
                        }}
                        className="w-full bg-white text-black py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-200 transition-colors mt-2"
                      >
                        Подтвердить
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {filteredRoutes.map(route => (
              <GeoJSON
                key={route.id}
                data={route.geoJson}
                style={{
                  color: ROUTE_COLORS[route.type],
                  weight: selectedRouteId === route.id ? 8 : 5,
                  opacity: selectedRouteId === route.id ? 1 : 0.4,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: () => handleRouteClick(route.id)
                }}
              />
            ))}

            {selectedRoute?.pois.map(poi => (
              <Marker key={poi.id} position={poi.coordinates}>
                <Popup className="custom-popup">
                  <div className="w-80 p-0 overflow-hidden rounded-2xl bg-[#141414] border border-white/10">
                    {/* Gallery Section */}
                    <div className="relative h-48 bg-black/20">
                      <div className="flex overflow-x-auto snap-x snap-mandatory h-full custom-scrollbar">
                        {poi.images.map((img, idx) => (
                          <div key={idx} className="flex-shrink-0 w-full h-full snap-center relative group/img">
                            <img 
                              src={img} 
                              alt={`${poi.name} ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              <button 
                                onClick={() => setFullScreenImage(img)}
                                className="p-2.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all border border-white/20"
                                title="Просмотр"
                              >
                                <Maximize2 className="w-5 h-5 text-white" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Upload Button Overlay */}
                      <div className="absolute top-3 right-3 z-10">
                        <label className="cursor-pointer p-2 bg-black/60 backdrop-blur-md rounded-full hover:bg-black/80 transition-all border border-white/10 flex items-center justify-center">
                          <Camera className="w-4 h-4 text-white" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && selectedRouteId) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  addPhotoToPOI(selectedRouteId, poi.id, reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Photo Count Indicator */}
                      <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold uppercase tracking-widest text-white z-10 pointer-events-none">
                        {poi.images.length} фото • листайте →
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-serif italic text-xl text-white">{poi.name}</h4>
                        <POIWeather lat={poi.coordinates[0]} lon={poi.coordinates[1]} />
                      </div>
                      <p className="text-sm text-neutral-500 leading-relaxed mb-4 line-clamp-2">{poi.description}</p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-300 uppercase tracking-widest">
                          <MapPin className="w-3 h-3" />
                          {poi.coordinates[0].toFixed(4)}, {poi.coordinates[1].toFixed(4)}
                        </div>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${poi.coordinates[0]},${poi.coordinates[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Открыть в Maps
                        </a>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Controls */}
          <div className={cn(
            "absolute right-6 md:right-8 z-[1000] flex flex-col gap-4 transition-all duration-500",
            selectedRouteId 
              ? (drawerState === 'full' 
                  ? (isMobile ? "bottom-[87vh]" : "bottom-[77vh]") 
                  : (isMobile ? "bottom-[32vh]" : "bottom-[37vh]"))
              : (isMobile ? "bottom-28" : "bottom-8")
          )}>
            <button 
              onClick={getUserLocation}
              className="p-4 bg-[#141414] shadow-2xl rounded-2xl hover:bg-white/5 transition-all border border-white/10 group text-white"
              title="Мое местоположение"
            >
              <Navigation className="w-6 h-6 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

          {/* Unified List View (Desktop & Mobile) */}
          <div className={cn(
            "absolute inset-0 z-10 bg-[#0A0A0A] overflow-y-auto custom-scrollbar transition-opacity duration-500",
            viewMode === 'map' ? "opacity-0 pointer-events-none" : "opacity-100"
          )}>
            <div className="max-w-7xl mx-auto p-6 md:p-12 lg:p-16 space-y-12 pb-32">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl md:text-6xl font-serif italic mb-4 text-white">Маршруты</h2>
                  <p className="text-neutral-500 text-sm md:text-base max-w-md leading-relaxed">
                    Исследуйте лучшие велосипедные пути, от спокойных шоссе до захватывающих горных спусков.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Найдено</p>
                    <p className="text-2xl font-mono font-bold text-white">{filteredRoutes.length}</p>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm hover:bg-white/10 transition-all flex items-center gap-3 px-6 text-white"
                  >
                    <Filter className="w-5 h-5 text-neutral-500" />
                    <span className="text-xs font-bold uppercase tracking-widest">Фильтры</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredRoutes.map(route => (
                  <motion.div
                    key={route.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleRouteClick(route.id)}
                    className="p-8 md:p-10 bg-[#141414] rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden group hover:-translate-y-1 transition-all cursor-pointer"
                  >
                    <div 
                      className="absolute top-0 left-0 w-2 h-full" 
                      style={{ backgroundColor: ROUTE_COLORS[route.type] }}
                    />
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="font-bold text-2xl md:text-3xl tracking-tight mb-3 text-white group-hover:text-neutral-400 transition-colors">{route.name}</h3>
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROUTE_COLORS[route.type] }} />
                          {TRANSLATIONS[route.type]}
                        </div>
                      </div>
                      {isAdminMode && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRouteToDelete(route.id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-3.5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Дистанция</p>
                        <div className="flex items-center gap-2 text-lg font-mono text-white">
                          <Navigation className="w-4 h-4 opacity-30" /> {route.distance} км
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Набор высоты</p>
                        <div className="flex items-center gap-2 text-lg font-mono text-white">
                          <MapIcon className="w-4 h-4 opacity-30" /> +{route.elevationGain} м
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        route.difficulty === 'easy' ? "bg-green-500/10 text-green-500" :
                        route.difficulty === 'medium' ? "bg-blue-500/10 text-blue-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {TRANSLATIONS[route.difficulty]}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                        <span>На карту</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 z-[2000] bg-[#0A0A0A]/80 backdrop-blur-2xl border-t border-white/10 p-4 flex justify-around items-center shadow-2xl">
            <button 
              onClick={() => setViewMode('map')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                viewMode === 'map' ? "text-white" : "text-neutral-600"
              )}
            >
              <MapIcon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Карта</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                viewMode === 'list' ? "text-white" : "text-neutral-600"
              )}
            >
              <List className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Список</span>
            </button>
            {isAdminMode && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black shadow-lg shadow-white/10 -mt-8 border-4 border-[#0A0A0A]"
              >
                <Plus className="w-6 h-6" />
              </button>
            )}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col items-center gap-1 text-neutral-600"
            >
              <Search className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Поиск</span>
            </button>
            <button 
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isAdminMode ? "text-red-500" : "text-neutral-600"
              )}
            >
              <Settings className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Админ</span>
            </button>
          </div>
        )}

        {/* Route Detail Panel */}
        <AnimatePresence>
          {selectedRoute && viewMode === 'map' && (
            <motion.div
              initial={{ y: '100%' }}
              animate={drawerState === 'peek' ? { y: isMobile ? '70%' : '65%' } : { y: 0 }}
              exit={{ y: '100%' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => {
                if (info.offset.y < -50) setDrawerState('full');
                if (info.offset.y > 50) setDrawerState('peek');
                if (info.offset.y > 200) setSelectedRouteId(null);
              }}
              className={cn(
                "absolute bottom-0 left-0 right-0 z-[1001] bg-[#141414]/95 backdrop-blur-3xl border-t border-white/10 shadow-2xl rounded-t-[40px] md:rounded-t-[64px] flex flex-col",
                drawerState === 'full' ? "h-[85vh] md:h-[75vh]" : "h-[85vh] md:h-[75vh]"
              )}
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-white/20 rounded-full" />
              </div>

              <div className={cn(
                "flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 lg:px-12 pb-24 md:pb-12",
                drawerState === 'peek' && "overflow-hidden"
              )}>
                <div className="max-w-7xl mx-auto">
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-6 md:mb-8">
                        <div className="flex-1 pr-8">
                          {isEditing ? (
                            <input 
                              value={editingRoute?.name}
                              onChange={(e) => setEditingRoute(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="text-3xl md:text-4xl font-serif italic mb-3 bg-white/5 p-2 rounded-xl w-full border border-white/10 outline-none focus:ring-2 focus:ring-white/20 text-white"
                            />
                          ) : (
                            <div className="flex items-center gap-4 mb-3">
                              <h2 className="text-3xl md:text-5xl font-serif italic tracking-tight leading-tight text-white">{selectedRoute.name}</h2>
                              {drawerState === 'peek' && (
                                <button 
                                  onClick={() => setDrawerState('full')}
                                  className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
                                >
                                  Подробности
                                </button>
                              )}
                            </div>
                          )}
                          
                          {(isEditing || drawerState === 'full') && (
                            isEditing ? (
                              <textarea 
                                value={editingRoute?.description}
                                onChange={(e) => setEditingRoute(prev => prev ? { ...prev, description: e.target.value } : null)}
                                className="text-neutral-400 text-sm md:text-base leading-relaxed w-full bg-white/5 p-3 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-white/20 h-24 text-white"
                              />
                            ) : (
                              <p className="text-neutral-400 text-sm md:text-base leading-relaxed max-w-2xl">{selectedRoute.description}</p>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdminMode && (
                            <button 
                              onClick={() => {
                                if (isEditing) {
                                  saveEditedRoute();
                                } else {
                                  setEditingRoute(selectedRoute);
                                  setIsEditing(true);
                                  setDrawerState('full');
                                }
                              }}
                              className={cn(
                                "p-3 rounded-full transition-all border",
                                isEditing ? "bg-green-500 text-white border-green-600" : "bg-white/5 text-neutral-500 border-white/10 hover:bg-white/10"
                              )}
                            >
                              {isEditing ? <Download className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedRouteId(null);
                              setIsEditing(false);
                            }}
                            className="p-3 hover:bg-white/5 rounded-full transition-colors"
                          >
                            <X className="w-6 h-6 text-neutral-600" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4 mb-8">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Дистанция</p>
                          <p className="text-xl font-mono text-white">{selectedRoute.distance} <span className="text-[10px] uppercase opacity-40">км</span></p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Набор</p>
                          <p className="text-xl font-mono text-white">+{selectedRoute.elevationGain} <span className="text-[10px] uppercase opacity-40">м</span></p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Сложность</p>
                          <p className="text-sm font-bold text-white">{TRANSLATIONS[selectedRoute.difficulty]}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Покрытие</p>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              selectedRoute.surfaceCondition === 'perfect' && "bg-green-500",
                              selectedRoute.surfaceCondition === 'good' && "bg-blue-500",
                              selectedRoute.surfaceCondition === 'bad' && "bg-orange-500",
                              selectedRoute.surfaceCondition === 'terrible' && "bg-red-500",
                            )} />
                            <p className="text-[11px] font-bold text-white">{TRANSLATIONS[selectedRoute.surfaceCondition]}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 shadow-sm">
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-1.5">Погода</p>
                          <div className="flex items-center gap-2 text-white">
                            <Sun className="w-4 h-4 text-amber-400" />
                            <p className="text-xl font-mono">{weather?.temp}°C</p>
                          </div>
                        </div>
                      </div>

                      {drawerState === 'full' && (
                        <>
                          <div className="flex gap-3 mb-8">
                            <button className="flex-1 bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-200 transition-all shadow-xl shadow-white/5 hover:-translate-y-0.5 active:translate-y-0 text-sm">
                              <Navigation className="w-5 h-5" /> Начать навигацию
                            </button>
                            <button className="px-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-all hover:border-white/20">
                              <Download className="w-5 h-5 text-neutral-500" />
                            </button>
                          </div>

                          {/* POI Section */}
                          <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest">Интересные места</p>
                              {isAdminMode && (
                                <button 
                                  onClick={() => setIsAddingPOI(!isAddingPOI)}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                                    isAddingPOI 
                                      ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                      : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10"
                                  )}
                                >
                                  {isAddingPOI ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                  {isAddingPOI ? "Отмена" : "Добавить точку"}
                                </button>
                              )}
                            </div>

                            {isAddingPOI && !newPOICoords && (
                              <div className="mb-6 p-5 bg-white/5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                                <p className="text-[10px] text-neutral-400 font-medium text-center">
                                  Кликните на карту, чтобы выбрать местоположение новой точки
                                </p>
                              </div>
                            )}

                            {selectedRoute.pois.length > 0 ? (
                              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                                {selectedRoute.pois.map(poi => (
                                  <div 
                                    key={poi.id}
                                    onClick={() => setMapCenter(poi.coordinates)}
                                    className="flex-shrink-0 w-64 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer group"
                                  >
                                    <div className="relative h-32 overflow-hidden group/img">
                                      <img 
                                        src={poi.images[poi.images.length - 1]} 
                                        alt={poi.name} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFullScreenImage(poi.images[poi.images.length - 1]);
                                          }}
                                          className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-all border border-white/20"
                                        >
                                          <Maximize2 className="w-4 h-4 text-white" />
                                        </button>
                                      </div>
                                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold uppercase tracking-widest text-white">
                                        {TRANSLATIONS[poi.category] || poi.category}
                                      </div>
                                      {poi.images.length > 1 && (
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold uppercase tracking-widest text-white">
                                          +{poi.images.length - 1} фото
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-4">
                                      <div className="flex items-start justify-between mb-1">
                                        <h4 className="font-serif italic text-lg text-white">{poi.name}</h4>
                                        <POIWeather lat={poi.coordinates[0]} lon={poi.coordinates[1]} />
                                      </div>
                                      <p className="text-xs text-neutral-500 line-clamp-2 mb-3">{poi.description}</p>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                                          <MapPin className="w-3 h-3" />
                                          {poi.coordinates[0].toFixed(4)}, {poi.coordinates[1].toFixed(4)}
                                        </div>
                                        <div className="flex gap-2">
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(`${poi.coordinates[0]}, ${poi.coordinates[1]}`);
                                            }}
                                            className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                                            title="Копировать координаты"
                                          >
                                            <Copy className="w-3 h-3 text-neutral-400" />
                                          </button>
                                          <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${poi.coordinates[0]},${poi.coordinates[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
                                            title="Maps"
                                          >
                                            <Navigation className="w-3 h-3 text-blue-400" />
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                                <p className="text-xs text-neutral-500 uppercase tracking-widest font-bold">Нет точек интереса</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {drawerState === 'full' && (
                      <div className="flex-1 h-48 lg:h-auto min-h-[200px] flex flex-col">
                        <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest mb-4">Профиль высот</p>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={selectedRoute.elevationProfile}>
                              <defs>
                                <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={ROUTE_COLORS[selectedRoute.type]} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={ROUTE_COLORS[selectedRoute.type]} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="distance" hide />
                              <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                              <Tooltip 
                                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    return (
                                      <div className="bg-neutral-900 text-white p-3 rounded-2xl text-[10px] font-mono shadow-2xl border border-white/10">
                                        <p className="mb-1">{payload[0].value} М</p>
                                        <p className="opacity-40">{Number(payload[0].payload.distance).toFixed(1)} КМ</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="elevation" 
                                stroke={ROUTE_COLORS[selectedRoute.type]} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorElev)" 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Screen Image Viewer */}
        <AnimatePresence>
          {fullScreenImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4 md:p-12"
              onClick={() => setFullScreenImage(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-7xl max-h-full"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={fullScreenImage} 
                  alt="Full screen" 
                  className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setFullScreenImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .leaflet-container { background: #0A0A0A; }
          .custom-popup .leaflet-popup-content-wrapper {
            border-radius: 32px; padding: 0; overflow: hidden;
            box-shadow: 0 40px 80px -20px rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            background: #141414;
            color: white;
          }
          .custom-popup .leaflet-popup-content { margin: 0; min-width: 320px; }
          .custom-popup .leaflet-popup-tip { box-shadow: none; background: #141414; }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        `}</style>
      </main>
    </div>
  );
}
