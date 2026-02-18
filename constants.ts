import { House, REQUIRED_DOCS } from './types';

// NOTA: Los enlaces de OneDrive/Google Drive no funcionan directamente porque son páginas web, no archivos de imagen.
// Usa enlaces directos (que terminen en .jpg, .png) o servicios como Unsplash/Imgur.
export const HOME_HERO_IMAGE = "https://i.imgur.com/t8UiUQc.jpg";

// Deterministic random for consistent demo data
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

const getStage = (id: number): 'Foundations' | 'Structure' | 'Installations' | 'Finishing' => {
  // Etapa 1: 1-34
  if (id <= 34) return 'Foundations';
  // Etapa 2: 35-63
  if (id <= 63) return 'Structure';
  // Etapa 3: 64-88
  if (id <= 88) return 'Installations';
  // Etapa 4: 89-114
  return 'Finishing';
};

const generateMockData = (): House[] => {
  const houses: House[] = [];
  
  for (let i = 1; i <= 114; i++) {
    const seed = i * 13;
    const isCompleted = seededRandom(seed) > 0.3; // ~70% completion rate varies
    
    // Generate docs status
    const documents = REQUIRED_DOCS.map(doc => {
      const isDocSubmitted = isCompleted || seededRandom(seed + doc.id.length) > 0.4;
      return {
        id: doc.id,
        name: doc.name,
        icon: doc.icon,
        isSubmitted: isDocSubmitted,
        status: isDocSubmitted ? 'approved' : 'pending',
        submissionDate: isDocSubmitted ? '2025-01-15' : undefined,
      } as const;
    });

    const submittedCount = documents.filter(d => d.isSubmitted).length;
    const progress = Math.round((submittedCount / REQUIRED_DOCS.length) * 100);

    // Mock last 4 houses as "Constructora" for demo purposes
    const isConstructora = i > 110;

    houses.push({
      id: i,
      houseNumber: i.toString().padStart(3, '0'), // 001, 002...
      ownerName: isConstructora ? 'Inmobiliaria Alcázar (Stock)' : `Propietario Casa ${i}`,
      phoneNumber: `59399${Math.floor(1000000 + seededRandom(seed) * 9000000)}`,
      stage: getStage(i),
      documents: documents as any,
      progress,
      lastActivity: 'Hace 2 horas',
      isConstructora: isConstructora,
      livesAbroad: false 
    });
  }

  // Force specific data for demo matching screenshots
  if (houses[41]) { // House 42 (index 41)
    houses[41].ownerName = 'Juan Pérez';
    houses[41].phoneNumber = '34600000000';
    houses[41].progress = 66; // 4 of 6
    houses[41].documents[0].isSubmitted = true; // Facade
    houses[41].documents[1].isSubmitted = true; // Meter
    houses[41].documents[2].isSubmitted = true; // Tax
    houses[41].documents[3].isSubmitted = false; // Lien (Pending Review in screen)
    houses[41].documents[3].status = 'pending'; 
    houses[41].documents[4].isSubmitted = false;
    houses[41].documents[5].isSubmitted = false;
    houses[41].isConstructora = false;
  }

  return houses;
};

export const MOCK_HOUSES = generateMockData();