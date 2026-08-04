import { Material } from '../types'

export const materials: Material[] = [
  {
    id: 'pla',
    name: 'PLA (Polylactic Acid)',
    shortName: 'PLA',
    description: 'The most popular 3D printing material. Eco-friendly, easy to print, and perfect for prototypes, display models, and decorative items.',
    pricePerGram: 80,
    density: 1.24,
    colors: ['Black', 'White'],
    properties: {
      strength: 3,
      flexibility: 2,
      heatResistance: 2,
      printability: 5
    },
    printSpeed: 100,
    bedTemp: 60,
    nozzleTemp: 210,
    suitable: ['Prototypes', 'Display Models', 'Figurines', 'Educational', 'Low-stress parts']
  },
  {
    id: 'petg',
    name: 'PETG (Polyethylene Terephthalate Glycol)',
    shortName: 'PETG',
    description: 'Excellent balance of strength, flexibility, and temperature resistance. Great for functional parts that need durability.',
    pricePerGram: 100,
    density: 1.27,
    colors: ['Red', 'Blue', 'Grey'],
    properties: {
      strength: 4,
      flexibility: 3,
      heatResistance: 3,
      printability: 4
    },
    printSpeed: 80,
    bedTemp: 80,
    nozzleTemp: 240,
    suitable: ['Functional Parts', 'Containers', 'Outdoor Use', 'Mechanical Components']
  }
]

export const getMaterialById = (id: string): Material | undefined => {
  return materials.find(m => m.id === id)
}

export const getDefaultMaterial = (): Material => {
  return materials[0]
}
