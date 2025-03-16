export interface PlanetData {
  id: string;
  type: 'sphere' | 'ring';
  name: {
    ja: string;
    en: string;
  };
  radius: number;           // 半径 (km)
  distance: number;         // 太陽からの距離 (AU)
  orbitalPeriod: number;     // 公転周期 (日)
  orbitalTilt: number;      // 軌道傾斜角 (度)
  rotationPeriod: number;   // 自転周期 (時間)
  axisTilt: number;         // 自転軸傾斜角 (度)
  map?: {
    src?: string;            // 惑星のテクスチャ
    color?: number;          // 惑星の色
    emissive?: {
      color: number;        // 惑星の輝きの色
      intensity: number;    // 惑星の輝きの強さ
    };
  },
  satellites?: PlanetData[]
}

export const PLANET_DATA: PlanetData[] = [
  {
    id: 'sun',
    type: 'sphere',
    name: {
      ja: '太陽',
      en: 'Sun'
    },
    radius: 695000,
    distance: 0,
    orbitalPeriod: 0,
    orbitalTilt: 0,
    rotationPeriod: 30 * 24, // 25~36日を平均30日として計算
    axisTilt: 7.25,
    map: {
      src: 'textures/sun.webp',
      color: 0xffee00,
      emissive: {
        color: 0xffee00,
        intensity: 1.5,
      }
    }
  },
  {
    id: 'mercury',
    type: 'sphere',
    name: {
      ja: '水星',
      en: 'Mercury'
    },
    radius: 2440,
    distance: 0.39,
    orbitalPeriod: 88,
    orbitalTilt: 7.00,
    rotationPeriod: 58.6 * 24,
    axisTilt: 0.027,
    map: {
      src: 'textures/mercury.webp'
    }
  },
  {
    id: 'venus',
    type: 'sphere',
    name: {
      ja: '金星',
      en: 'Venus'
    },
    radius: 6052,
    distance: 0.72,
    orbitalPeriod: 225,
    orbitalTilt: 3.40,
    rotationPeriod: 243 * 24,
    axisTilt: 177.30,
    map: {
      src: 'textures/venus.webp'
    }
  },
  {
    id: 'earth',
    type: 'sphere',
    name: {
      ja: '地球',
      en: 'Earth'
    },
    radius: 6371,
    distance: 1.00,
    orbitalPeriod: 365.26,
    orbitalTilt: 0.00,
    rotationPeriod: 24,
    axisTilt: 23.44,
    map: {
      src: 'textures/earth.webp'
    },
    satellites: [
      {
        id: 'moon',
        type: 'sphere',
        name: {
          ja: '月',
          en: 'Moon'
        },
        radius: 1737,
        distance: 0.00257,
        orbitalPeriod: 27.3,
        orbitalTilt: 5.15,
        rotationPeriod: 27.3 * 24,
        axisTilt: 6.68,
        map: {
          src: 'textures/moon.webp'
        }
      }
    ]
  },
  {
    id: 'mars',
    type: 'sphere',
    name: {
      ja: '火星',
      en: 'Mars'
    },
    radius: 3396,
    distance: 1.52,
    orbitalPeriod: 687,
    orbitalTilt: 1.85,
    rotationPeriod: 24.6,
    axisTilt: 25.19,
    map: {
      src: 'textures/mars.webp'
    }
  },
  {
    id: 'jupiter',
    type: 'sphere',
    name: {
      ja: '木星',
      en: 'Jupiter'
    },
    radius: 69911,
    distance: 5.20,
    orbitalPeriod: 4333,
    orbitalTilt: 1.30,
    rotationPeriod: 9.9,
    axisTilt: 3.13,
    map: {
      src: 'textures/jupiter.webp'
    }
  },
  {
    id: 'saturn',
    type: 'sphere',
    name: {
      ja: '土星',
      en: 'Saturn'
    },
    radius: 58232,
    distance: 9.54,
    orbitalPeriod: 10759,
    orbitalTilt: 2.48,
    rotationPeriod: 10.2,
    axisTilt: 26.73,
    map: {
      src: 'textures/saturn.webp'
    },
    satellites: [
      {
        id: 'saturnRing',
        type: 'ring',
        name: {
          ja: '土星の輪',
          en: 'Sutrun\'s Ring'
        },
        radius: 58232,
        distance: 0,
        orbitalPeriod: 365,
        orbitalTilt: 0,
        rotationPeriod: 365 * 24,
        axisTilt: 90,
        map: {
          color: 0xcc9966
        }
      },
    ]
  },
  {
    id: 'uranus',
    type: 'ring',
    name: {
      ja: '天王星',
      en: 'Uranus'
    },
    radius: 25362,
    distance: 19.19,
    orbitalPeriod: 30687,
    orbitalTilt: 0.77,
    rotationPeriod: 17.2,
    axisTilt: 97.77,
    map: {
      src: 'textures/uranus.webp'
    },
    satellites: [
      {
        id: 'uranusRing',
        type: 'ring',
        name: {
          ja: '天王星の輪',
          en: 'Uranus\'s Ring'
        },
        radius: 25362,
        distance: 0,
        orbitalPeriod: 365,
        orbitalTilt: 0,
        rotationPeriod: 365 * 24,
        axisTilt: 0,
        map: {
          color: 0xeeddee
        }
      }
    ]
  },
  {
    id: 'neptune',
    type: 'sphere',
    name: {
      ja: '海王星',
      en: 'Neptune'
    },
    radius: 24622,
    distance: 30.07,
    orbitalPeriod: 60190,
    orbitalTilt: 1.77,
    rotationPeriod: 16.1,
    axisTilt: 28.32,
    map: {
      src: 'textures/neptune.webp'
    }
  }
];