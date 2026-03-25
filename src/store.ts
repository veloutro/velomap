import { create } from 'zustand';

export type RouteType = 'road' | 'cross-country' | 'gravel';
export type SurfaceCondition = 'perfect' | 'good' | 'bad' | 'terrible';

export interface POI {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number];
  category: 'landmark' | 'rest' | 'shop' | 'viewpoint';
  images: string[];
}

export interface RouteData {
  id: string;
  name: string;
  description: string;
  type: RouteType;
  distance: number; // km
  elevationGain: number; // m
  difficulty: 'easy' | 'medium' | 'hard';
  geoJson: any; // GeoJSON object
  elevationProfile: { distance: number; elevation: number }[];
  pois: POI[];
  surfaceCondition: SurfaceCondition;
}

interface AppState {
  routes: RouteData[];
  setRoutes: (routes: RouteData[]) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string | null) => void;
  filters: {
    type: RouteType[];
    maxDistance: number;
    maxElevation: number;
  };
  setFilters: (filters: Partial<AppState['filters']>) => void;
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  isAdminMode: boolean;
  setIsAdminMode: (isAdmin: boolean) => void;
  viewMode: 'map' | 'list';
  setViewMode: (mode: 'map' | 'list') => void;
  addPhotoToPOI: (routeId: string, poiId: string, photoUrl: string) => void;
  addPOI: (routeId: string, poi: POI) => void;
}

export const useStore = create<AppState>((set) => ({
  routes: [],
  setRoutes: (routes) => set({ routes }),
  selectedRouteId: null,
  setSelectedRouteId: (id) => set({ selectedRouteId: id }),
  filters: {
    type: ['road', 'cross-country', 'gravel'],
    maxDistance: 100,
    maxElevation: 2000,
  },
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  mapCenter: [55.7558, 37.6173],
  setMapCenter: (center) => set({ mapCenter: center }),
  isAdminMode: false,
  setIsAdminMode: (isAdmin) => set({ isAdminMode: isAdmin }),
  viewMode: 'map',
  setViewMode: (mode) => set({ viewMode: mode }),
  addPhotoToPOI: (routeId, poiId, photoUrl) => set((state) => ({
    routes: state.routes.map(route => 
      route.id === routeId 
        ? {
            ...route,
            pois: route.pois.map(poi => 
              poi.id === poiId 
                ? { ...poi, images: [...poi.images, photoUrl] }
                : poi
            )
          }
        : route
    )
  })),
  addPOI: (routeId, poi) => set((state) => ({
    routes: state.routes.map(route =>
      route.id === routeId
        ? { ...route, pois: [...route.pois, poi] }
        : route
    )
  })),
}));
