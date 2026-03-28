const DEFAULT_SHIPPING_ZONES = [
  { id: 'abuja-jabi-zuba', label: 'Abuja (Jabi/Zuba)', fee: 2000, eta: '2-5 business days' },
  { id: 'adamawa-yola', label: 'Adamawa (Yola)', fee: 2000, eta: '2-5 business days' },
  { id: 'bauchi', label: 'Bauchi', fee: 2000, eta: '2-5 business days' },
  { id: 'benue-makurdi', label: 'Benue (Makurdi)', fee: 3000, eta: '2-5 business days' },
  { id: 'borno-maiduguri', label: 'Borno (Maiduguri)', fee: 2000, eta: '2-5 business days' },
  { id: 'cross-river-calabar', label: 'Cross River (Calabar)', fee: 4000, eta: '2-5 business days' },
  { id: 'gombe', label: 'Gombe', fee: 2000, eta: '2-5 business days' },
  { id: 'jigawa-dutse', label: 'Jigawa (Dutse)', fee: 3000, eta: '2-5 business days' },
  { id: 'kano-naibawa-kanoline', label: 'Kano (Naibawa/Kanoline)', fee: 1500, eta: '2-5 business days' },
  { id: 'katsina', label: 'Katsina', fee: 2000, eta: '2-5 business days' },
  { id: 'kebbi-birnin-kebbi', label: 'Kebbi (Birnin Kebbi)', fee: 2000, eta: '2-5 business days' },
  { id: 'kogi-lokoja', label: 'Kogi (Lokoja)', fee: 3000, eta: '2-5 business days' },
  { id: 'kwara-ilorin', label: 'Kwara (Ilorin)', fee: 4000, eta: '2-5 business days' },
  { id: 'lagos-iddo-agege', label: 'Lagos (Iddo/Agege)', fee: 4000, eta: '2-5 business days' },
  { id: 'nasarawa-keffi-lafia', label: 'Nasarawa (Keffi/Lafia)', fee: 2000, eta: '2-5 business days' },
  { id: 'niger-minna', label: 'Niger (Minna)', fee: 1500, eta: '2-5 business days' },
  { id: 'plateau-jos', label: 'Plateau (Jos)', fee: 2000, eta: '2-5 business days' },
  { id: 'rivers-portharcourt', label: 'Rivers (Portharcourt)', fee: 4000, eta: '2-5 business days' },
  { id: 'sokoto', label: 'Sokoto (Sokoto)', fee: 2000, eta: '2-5 business days' },
  { id: 'taraba-jalingo', label: 'Taraba (Jalingo)', fee: 2000, eta: '2-5 business days' },
  { id: 'yobe-damaturu', label: 'Yobe (Damaturu)', fee: 2000, eta: '2-5 business days' },
  { id: 'zamfara-gusau', label: 'Zamfara (Gusau)', fee: 1500, eta: '2-5 business days' },
  { id: 'zaria', label: 'Zaria', fee: 1500, eta: '2-5 business days' }
]

const DEFAULT_FREE_DELIVERY_THRESHOLD_NGN = 100000

const parseShippingZonesFromEnv = () => {
  const raw = process.env.SHIPPING_RATES_JSON

  if (!raw) {
    return DEFAULT_SHIPPING_ZONES
  }

  try {
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_SHIPPING_ZONES
    }

    const normalized = parsed
      .filter((zone) => zone && typeof zone.id === 'string' && typeof zone.label === 'string' && Number.isFinite(Number(zone.fee)))
      .map((zone) => ({
        id: zone.id,
        label: zone.label,
        fee: Number(zone.fee),
        eta: typeof zone.eta === 'string' ? zone.eta : '2-5 business days'
      }))

    return normalized.length > 0 ? normalized : DEFAULT_SHIPPING_ZONES
  } catch {
    return DEFAULT_SHIPPING_ZONES
  }
}

export const SHIPPING_ZONES = parseShippingZonesFromEnv()

export const FREE_DELIVERY_THRESHOLD_NGN = Number(process.env.FREE_DELIVERY_THRESHOLD_NGN || DEFAULT_FREE_DELIVERY_THRESHOLD_NGN)

export const getShippingZoneById = (zoneId) => {
  return SHIPPING_ZONES.find((zone) => zone.id === zoneId)
}
