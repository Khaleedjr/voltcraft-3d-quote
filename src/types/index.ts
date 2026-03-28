// Material configurations for Bambu Lab A1
export interface Material {
  id: string
  name: string
  shortName: string
  description: string
  pricePerGram: number // in Naira
  colors: string[]
  properties: {
    strength: number // 1-5
    flexibility: number // 1-5
    heatResistance: number // 1-5
    printability: number // 1-5
  }
  printSpeed: number // mm/s base speed
  bedTemp: number // °C
  nozzleTemp: number // °C
  suitable: string[]
  image?: string
}

export interface PrintSettings {
  layerHeight: number // mm
  infillPercentage: number // 0-100
  supportEnabled: boolean
  quantity: number
  color: string
}

export interface QuoteResult {
  materialCost: number
  printTime: number // in minutes
  laborCost: number
  totalCost: number
  weight: number // in grams
}

export interface FileAnalysis {
  volume: number // cm³
  dimensions: {
    x: number
    y: number
    z: number
  }
  triangleCount: number
  isValid: boolean
  errors: string[]
}

export interface PrintRequest {
  id: string
  fileName: string
  fileSize: number
  material: Material
  settings: PrintSettings
  quote: QuoteResult
  customerInfo: CustomerInfo
  status: 'pending' | 'reviewing' | 'approved' | 'printing' | 'completed' | 'cancelled'
  createdAt: Date
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  notes?: string
}

