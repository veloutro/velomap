import { RouteData } from './store';

export const MOCK_ROUTES: RouteData[] = [
  {
    id: 'route-1',
    name: 'Лесное приключение',
    description: 'Живописная поездка через старый сосновый бор с несколькими сложными подъемами.',
    type: 'cross-country',
    distance: 25.4,
    elevationGain: 450,
    difficulty: 'medium',
    surfaceCondition: 'good',
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [37.6173, 55.7558],
          [37.6273, 55.7658],
          [37.6373, 55.7558],
          [37.6473, 55.7458],
          [37.6573, 55.7558],
        ],
      },
    },
    elevationProfile: Array.from({ length: 20 }, (_, i) => ({
      distance: (i * 25.4) / 19,
      elevation: 150 + Math.sin(i * 0.5) * 50 + i * 5,
    })),
    pois: [
      {
        id: 'poi-1',
        name: 'Старый дуб',
        description: '300-летний дуб, идеальное место для отдыха и тени в жаркий день.',
        coordinates: [55.7658, 37.6273],
        category: 'landmark',
        images: ['https://picsum.photos/seed/oak/800/600'],
      },
      {
        id: 'poi-1-2',
        name: 'Лесной родник',
        description: 'Чистая питьевая вода прямо из земли. Обязательно пополните запасы!',
        coordinates: [55.7558, 37.6373],
        category: 'rest',
        images: ['https://picsum.photos/seed/spring/800/600'],
      },
    ],
  },
  {
    id: 'route-2',
    name: 'Городское кольцо',
    description: 'Гладкая асфальтовая поездка по достопримечательностям центра города.',
    type: 'road',
    distance: 12.0,
    elevationGain: 80,
    difficulty: 'easy',
    surfaceCondition: 'perfect',
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [37.6073, 55.7458],
          [37.5973, 55.7558],
          [37.6073, 55.7658],
          [37.6173, 55.7558],
        ],
      },
    },
    elevationProfile: Array.from({ length: 15 }, (_, i) => ({
      distance: (i * 12.0) / 14,
      elevation: 140 + Math.random() * 10,
    })),
    pois: [
      {
        id: 'poi-2',
        name: 'Центральная площадь',
        description: 'Сердце города с прекрасной архитектурой и уличными музыкантами.',
        coordinates: [55.7558, 37.5973],
        category: 'viewpoint',
        images: ['https://picsum.photos/seed/square/800/600'],
      },
      {
        id: 'poi-2-2',
        name: 'Вело-кафе "Цепь"',
        description: 'Лучший кофе для велосипедистов и быстрая мастерская.',
        coordinates: [55.7658, 37.6073],
        category: 'shop',
        images: ['https://picsum.photos/seed/cafe/800/600'],
      },
    ],
  },
  {
    id: 'route-3',
    name: 'Гравийный вызов',
    description: 'Пересеченная местность и крутые холмы для опытных райдеров.',
    type: 'gravel',
    distance: 45.0,
    elevationGain: 1200,
    difficulty: 'hard',
    surfaceCondition: 'bad',
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [37.6573, 55.7558],
          [37.6773, 55.7858],
          [37.7073, 55.7658],
          [37.7273, 55.7958],
        ],
      },
    },
    elevationProfile: Array.from({ length: 30 }, (_, i) => ({
      distance: (i * 45.0) / 29,
      elevation: 100 + Math.pow(i, 1.5) * 2,
    })),
    pois: [
      {
        id: 'poi-3',
        name: 'Вершина Холма',
        description: 'Панорамный вид на всю область. Тяжелый подъем стоит того!',
        coordinates: [55.7858, 37.6773],
        category: 'viewpoint',
        images: ['https://picsum.photos/seed/hill/800/600'],
      },
    ],
  },
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `route-extra-${i}`,
    name: `Маршрут #${i + 4}: ${['Северный', 'Южный', 'Западный', 'Восточный'][i % 4]} ${['путь', 'трек', 'круг', 'выезд'][i % 4]}`,
    description: 'Дополнительный маршрут для исследования окрестностей с интересными видами.',
    type: (['road', 'cross-country', 'gravel'] as const)[i % 3],
    distance: 10 + Math.floor(Math.random() * 60),
    elevationGain: 50 + Math.floor(Math.random() * 800),
    difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
    surfaceCondition: (['perfect', 'good', 'bad'] as const)[i % 3],
    geoJson: {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [37.6173 + (Math.random() - 0.5) * 0.1, 55.7558 + (Math.random() - 0.5) * 0.1],
          [37.6173 + (Math.random() - 0.5) * 0.1, 55.7558 + (Math.random() - 0.5) * 0.1],
          [37.6173 + (Math.random() - 0.5) * 0.1, 55.7558 + (Math.random() - 0.5) * 0.1],
        ],
      },
    },
    elevationProfile: Array.from({ length: 15 }, (_, j) => ({
      distance: j * 2,
      elevation: 150 + Math.random() * 100,
    })),
    pois: [],
  })),
];
