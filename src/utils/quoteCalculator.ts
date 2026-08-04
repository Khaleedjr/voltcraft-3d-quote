import { Material, PrintSettings, QuoteResult, FileAnalysis } from '../types'

// Bambu Lab A1 build volume (256 x 256 x 256 mm)
export const BUILD_VOLUME = {
  x: 256,
  y: 256,
  z: 256
}

// Base labor cost in Naira
const BASE_LABOR_COST = 500
const LABOR_PER_HOUR = 300

// Calculate estimated print time based on volume and settings
export const calculatePrintTime = (
  volumeCm3: number,
  material: Material,
  settings: PrintSettings
): number => {
  // Base time calculation (empirical formula for FDM printing)
  const layerHeightFactor = 0.2 / settings.layerHeight // Relative to standard 0.2mm
  const infillFactor = settings.infillPercentage / 20 // Factor based on infill
  const supportFactor = settings.supportEnabled ? 1.3 : 1.0
  const speedFactor = 100 / material.printSpeed // Relative to base speed
  
  // Approximate print time in minutes
  // Volume in cm³ * base factor * adjustments
  const baseTimeMinutes = volumeCm3 * 8 // ~8 min per cm³ base
  
  const totalTime = baseTimeMinutes * 
    layerHeightFactor * 
    infillFactor * 
    supportFactor * 
    speedFactor

  return Math.ceil(totalTime * settings.quantity)
}

// Calculate material weight from volume.
// volumeCm3 is the true solid (mesh) volume of the model. A real slicer prints
// the outer walls and top/bottom layers nearly solid and fills the interior at
// the infill percentage, so we split the solid volume into a shell portion and
// an interior portion and weigh each with the material's own density.
export const calculateWeight = (
  volumeCm3: number,
  material: Material,
  settings: PrintSettings
): number => {
  // Material-specific density (g/cm³) instead of assuming PLA for everything
  const density = material.density || 1.24
  const infillMultiplier = 0.3 + (settings.infillPercentage / 100) * 0.7
  const supportMultiplier = settings.supportEnabled ? 1.15 : 1.0

  // Shell + infill weight estimation
  const shellWeight = volumeCm3 * 0.3 * density // Outer shell
  const infillWeight = volumeCm3 * 0.7 * density * infillMultiplier

  return (shellWeight + infillWeight) * supportMultiplier * settings.quantity
}

// Generate full quote
export const calculateQuote = (
  analysis: FileAnalysis,
  material: Material,
  settings: PrintSettings
): QuoteResult => {
  const weight = calculateWeight(analysis.volume, material, settings)
  const printTime = calculatePrintTime(analysis.volume, material, settings)
  
  const materialCost = weight * material.pricePerGram
  const laborCost = BASE_LABOR_COST + (printTime / 60) * LABOR_PER_HOUR
  
  const totalCost = materialCost + laborCost

  return {
    materialCost: Math.ceil(materialCost),
    printTime,
    laborCost: Math.ceil(laborCost),
    totalCost: Math.ceil(totalCost),
    weight: Math.round(weight * 10) / 10
  }
}

// Format time for display
export const formatPrintTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return `${days}d ${remainingHours}h`
}

// Format currency (Nigerian Naira)
export const formatPrice = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Validate if model fits in build volume
export const validateDimensions = (dimensions: { x: number; y: number; z: number }): boolean => {
  return (
    dimensions.x <= BUILD_VOLUME.x &&
    dimensions.y <= BUILD_VOLUME.y &&
    dimensions.z <= BUILD_VOLUME.z
  )
}

// Get recommended settings based on use case
export const getRecommendedSettings = (useCase: string): PrintSettings => {
  const presets: Record<string, PrintSettings> = {
    draft: {
      layerHeight: 0.28,
      infillPercentage: 15,
      supportEnabled: false,
      quantity: 1,
      color: 'Black'
    },
    standard: {
      layerHeight: 0.2,
      infillPercentage: 20,
      supportEnabled: false,
      quantity: 1,
      color: 'Black'
    },
    quality: {
      layerHeight: 0.12,
      infillPercentage: 25,
      supportEnabled: false,
      quantity: 1,
      color: 'Black'
    },
    functional: {
      layerHeight: 0.2,
      infillPercentage: 40,
      supportEnabled: false,
      quantity: 1,
      color: 'Black'
    },
    strong: {
      layerHeight: 0.16,
      infillPercentage: 60,
      supportEnabled: false,
      quantity: 1,
      color: 'Black'
    }
  }
  
  return presets[useCase] || presets.standard
}
