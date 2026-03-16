import { motion } from 'framer-motion'
import { Material } from '../types'
import { materials } from '../data/materials'
import { Check, Info } from 'lucide-react'

interface MaterialSelectorProps {
  selectedMaterial: Material
  onSelectMaterial: (material: Material) => void
}

const PropertyBar = ({ value, max = 5 }: { value: number; max?: number }) => (
  <div className="flex gap-1">
    {Array.from({ length: max }).map((_, i) => (
      <div
        key={i}
        className={`h-1.5 w-4 rounded-full ${
          i < value ? 'bg-voltcraft-primary' : 'bg-voltcraft-gray-700'
        }`}
      />
    ))}
  </div>
)

const MaterialSelector = ({ selectedMaterial, onSelectMaterial }: MaterialSelectorProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        Select Material
        <span className="text-sm font-normal text-gray-600 dark:text-voltcraft-gray-400">
          (affects price and durability)
        </span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {materials.map((material) => {
          const isSelected = selectedMaterial.id === material.id
          
          return (
            <motion.button
              key={material.id}
              onClick={() => onSelectMaterial(material)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-voltcraft-primary/10 border-2 border-voltcraft-primary'
                  : 'bg-white dark:bg-voltcraft-dark border-2 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:border-white/20'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-voltcraft-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-gray-900 dark:text-white" />
                </div>
              )}
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{material.shortName}</h4>
                  <p className="text-xs text-gray-600 dark:text-voltcraft-gray-400 mt-0.5 line-clamp-2">
                    {material.description.slice(0, 80)}...
                  </p>
                </div>
                
                {/* Price */}
                <div className="text-voltcraft-secondary font-semibold">
                  ₦{material.pricePerGram}/g
                </div>
                
                {/* Properties */}
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-voltcraft-gray-400">Strength</span>
                    <PropertyBar value={material.properties.strength} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-voltcraft-gray-400">Flexibility</span>
                    <PropertyBar value={material.properties.flexibility} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-voltcraft-gray-400">Heat Resist</span>
                    <PropertyBar value={material.properties.heatResistance} />
                  </div>
                </div>
                
                {/* Colors available */}
                <div className="flex gap-1 flex-wrap">
                  {material.colors.slice(0, 6).map((color) => (
                    <span
                      key={color}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-voltcraft-darker text-gray-600 dark:text-voltcraft-gray-400"
                    >
                      {color}
                    </span>
                  ))}
                  {material.colors.length > 6 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-voltcraft-darker text-gray-600 dark:text-voltcraft-gray-400">
                      +{material.colors.length - 6}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
      
      {/* Selected material details */}
      <motion.div
        key={selectedMaterial.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-white dark:bg-voltcraft-dark rounded-lg border border-gray-200 dark:border-white/10"
      >
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-voltcraft-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{selectedMaterial.name}</h4>
            <p className="text-sm text-gray-600 dark:text-voltcraft-gray-400 mt-1">
              {selectedMaterial.description}
            </p>
            <div className="mt-3">
              <span className="text-sm text-gray-500 dark:text-voltcraft-gray-500">Best for: </span>
              <span className="text-sm text-gray-700 dark:text-voltcraft-gray-300">
                {selectedMaterial.suitable.join(', ')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MaterialSelector
