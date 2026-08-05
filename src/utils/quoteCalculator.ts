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

// Effective wall thickness of the printed shell: roughly two perimeters
// (~0.42 + 0.45 mm at a 0.4 nozzle) plus an allowance for the solid top and
// bottom skins. Calibrated against Bambu Studio slices.
const SHELL_THICKNESS_MM = 0.9

// Average volumetric throughput in mm³/s, i.e. how fast material actually goes
// down once travel, retraction and perimeter slowdowns are averaged in.
// Calibrated against two Bambu Studio slices of the same model (Bambu Lab A1,
// PLA): 5.29 mm³/s at a 0.12 mm layer and 5.23 mm³/s at 0.20 mm. Throughput
// barely moves with layer height because the stock profiles raise print speed
// as layers get thinner, so this is deliberately not scaled by layer height.
const BASE_FLOW_MM3_PER_SEC = 5.25

// Support structures print sparse, so they use far less material than the
// volume they occupy.
const FORCED_SUPPORT_FRACTION = 0.08

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

// Surface area in cm². Falls back to the bounding box (exact for the manual
// "enter dimensions" mode, which describes a solid box).
const getSurfaceArea = (analysis: FileAnalysis): number => {
  if (analysis.surfaceArea && analysis.surfaceArea > 0) {
    return analysis.surfaceArea
  }
  const { x, y, z } = analysis.dimensions
  if (x > 0 && y > 0 && z > 0) {
    return (2 * (x * y + y * z + z * x)) / 100 // mm² -> cm²
  }
  return 0
}

// Support material for one unit, in cm³.
export const getSupportVolume = (
  analysis: FileAnalysis,
  modelVolumeCm3: number,
  settings: PrintSettings
): number => {
  const detected = analysis.supportVolume || 0

  // Auto: only charge for support when the geometry actually needs it.
  if (!settings.supportEnabled) {
    return analysis.needsSupport ? detected : 0
  }

  // Forced on: always include something, even if no overhang was detected.
  return Math.max(detected, modelVolumeCm3 * FORCED_SUPPORT_FRACTION)
}

// Material actually extruded for one unit, in cm³ (model + support).
// A slicer prints the walls and top/bottom skins solid and fills only the
// interior at the infill percentage — so the split depends on the model's
// surface area, not a fixed ratio. Thin-walled or hollow models are almost
// entirely shell and come out much heavier than a flat 30/70 guess.
export const calculateMaterialVolume = (
  analysis: FileAnalysis,
  settings: PrintSettings
): { model: number; support: number; total: number } => {
  const volumeCm3 = Math.max(0, analysis.volume)
  const surfaceArea = getSurfaceArea(analysis)

  const shellVolume = surfaceArea > 0
    ? Math.min(volumeCm3, surfaceArea * SHELL_THICKNESS_MM * 0.1) // cm² × mm -> cm³
    : volumeCm3 * 0.3
  const interiorVolume = Math.max(0, volumeCm3 - shellVolume)

  const model = shellVolume + interiorVolume * (settings.infillPercentage / 100)
  const support = getSupportVolume(analysis, model, settings)

  return { model, support, total: model + support }
}

// Calculate estimated print time from the material actually extruded
export const calculatePrintTime = (
  materialVolumeCm3: number,
  material: Material,
  settings: PrintSettings
): number => {
  const speedFactor = material.printSpeed / 100
  const flow = clamp(BASE_FLOW_MM3_PER_SEC * speedFactor, 2, 16)

  const minutes = (materialVolumeCm3 * 1000) / flow / 60

  return Math.ceil(minutes * settings.quantity)
}

// Calculate printed weight (model + support) in grams, using the material's
// own density instead of assuming PLA for everything.
export const calculateWeight = (
  analysis: FileAnalysis,
  material: Material,
  settings: PrintSettings
): number => {
  const density = material.density || 1.24
  const { total } = calculateMaterialVolume(analysis, settings)

  return total * density * settings.quantity
}

// Generate full quote
export const calculateQuote = (
  analysis: FileAnalysis,
  material: Material,
  settings: PrintSettings
): QuoteResult => {
  const density = material.density || 1.24
  const { model, support, total } = calculateMaterialVolume(analysis, settings)

  const weight = total * density * settings.quantity
  const supportWeight = support * density * settings.quantity
  const printTime = calculatePrintTime(total, material, settings)

  const materialCost = weight * material.pricePerGram
  const laborCost = BASE_LABOR_COST + (printTime / 60) * LABOR_PER_HOUR

  const totalCost = materialCost + laborCost

  return {
    materialCost: Math.ceil(materialCost),
    printTime,
    laborCost: Math.ceil(laborCost),
    totalCost: Math.ceil(totalCost),
    weight: Math.round(weight * 10) / 10,
    supportWeight: Math.round(supportWeight * 10) / 10,
    hasSupport: support > 0,
    modelVolume: Math.round(model * 100) / 100
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
