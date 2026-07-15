import { FileAnalysis } from '../types'

// Parse binary STL file
const parseBinarySTL = (buffer: ArrayBuffer): FileAnalysis => {
  const dataView = new DataView(buffer)
  
  // Skip 80 byte header
  const headerTriangleCount = dataView.getUint32(80, true)
  
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  let volume = 0
  
  // Each triangle is 50 bytes (12 normal + 36 vertices + 2 attribute)
  const expectedSize = 84 + headerTriangleCount * 50

  // If file is smaller than the header says, try to infer triangle count from size.
  if (buffer.byteLength < 84) {
    return {
      volume: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      isValid: false,
      errors: ['Invalid STL: file too small to contain triangles']
    }
  }

  let triangleCount = headerTriangleCount

  if (buffer.byteLength !== expectedSize) {
    const inferred = Math.floor((buffer.byteLength - 84) / 50)
    if (inferred > 0) {
      // Use inferred count when header is unreliable; proceed rather than failing.
      console.warn('STL header mismatch: using inferred triangle count', { headerTriangleCount, inferred, byteLength: buffer.byteLength })
      triangleCount = inferred
    } else if (buffer.byteLength < expectedSize) {
      return {
        volume: 0,
        dimensions: { x: 0, y: 0, z: 0 },
        triangleCount: 0,
        isValid: false,
        errors: ['Invalid STL file: File size does not match triangle count']
      }
    }
  }

  // Ensure we do not read past buffer end; adjust loop upper bound if necessary
  const maxTrianglesBySize = Math.floor((buffer.byteLength - 84) / 50)
  const loopCount = Math.min(triangleCount, maxTrianglesBySize)

  for (let i = 0; i < loopCount; i++) {
    const offset = 84 + i * 50
    
    // Skip normal (12 bytes), read 3 vertices
    const vertices = []
    for (let v = 0; v < 3; v++) {
      const vOffset = offset + 12 + v * 12
      vertices.push({
        x: dataView.getFloat32(vOffset, true),
        y: dataView.getFloat32(vOffset + 4, true),
        z: dataView.getFloat32(vOffset + 8, true)
      })
    }
    
    // Update bounding box
    for (const v of vertices) {
      minX = Math.min(minX, v.x)
      minY = Math.min(minY, v.y)
      minZ = Math.min(minZ, v.z)
      maxX = Math.max(maxX, v.x)
      maxY = Math.max(maxY, v.y)
      maxZ = Math.max(maxZ, v.z)
    }
    
    // Calculate signed volume contribution of this triangle
    // Using the divergence theorem
    const v0 = vertices[0]
    const v1 = vertices[1]
    const v2 = vertices[2]
    
    volume += (
      v0.x * (v1.y * v2.z - v2.y * v1.z) +
      v1.x * (v2.y * v0.z - v0.y * v2.z) +
      v2.x * (v0.y * v1.z - v1.y * v0.z)
    ) / 6
  }
  
  // Dimensions in mm
  const dimensions = {
    x: Math.round((maxX - minX) * 100) / 100,
    y: Math.round((maxY - minY) * 100) / 100,
    z: Math.round((maxZ - minZ) * 100) / 100
  }
  
  // Convert volume from mm³ to cm³
  const volumeCm3 = Math.abs(volume) / 1000
  
  return {
    volume: Math.round(volumeCm3 * 100) / 100,
    dimensions,
    triangleCount,
    isValid: true,
    errors: []
  }
}

// Parse ASCII STL file
const parseAsciiSTL = (text: string): FileAnalysis => {
  const lines = text.split('\n')
  let triangleCount = 0
  
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  let volume = 0
  
  const vertices: { x: number; y: number; z: number }[] = []
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('vertex')) {
      const parts = trimmed.split(/\s+/)
      if (parts.length >= 4) {
        const v = {
          x: parseFloat(parts[1]),
          y: parseFloat(parts[2]),
          z: parseFloat(parts[3])
        }
        
        if (!isNaN(v.x) && !isNaN(v.y) && !isNaN(v.z)) {
          vertices.push(v)
          minX = Math.min(minX, v.x)
          minY = Math.min(minY, v.y)
          minZ = Math.min(minZ, v.z)
          maxX = Math.max(maxX, v.x)
          maxY = Math.max(maxY, v.y)
          maxZ = Math.max(maxZ, v.z)
          
          // Calculate volume when we have a complete triangle
          if (vertices.length === 3) {
            const [v0, v1, v2] = vertices
            volume += (
              v0.x * (v1.y * v2.z - v2.y * v1.z) +
              v1.x * (v2.y * v0.z - v0.y * v2.z) +
              v2.x * (v0.y * v1.z - v1.y * v0.z)
            ) / 6
            
            triangleCount++
            vertices.length = 0
          }
        }
      }
    }
  }
  
  if (triangleCount === 0) {
    return {
      volume: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      isValid: false,
      errors: ['Invalid STL file: No valid triangles found']
    }
  }
  
  const dimensions = {
    x: Math.round((maxX - minX) * 100) / 100,
    y: Math.round((maxY - minY) * 100) / 100,
    z: Math.round((maxZ - minZ) * 100) / 100
  }
  
  const volumeCm3 = Math.abs(volume) / 1000
  
  return {
    volume: Math.round(volumeCm3 * 100) / 100,
    dimensions,
    triangleCount,
    isValid: true,
    errors: []
  }
}

// Main STL parser function
export const parseSTL = async (file: File): Promise<FileAnalysis> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const result = event.target?.result
      
      if (!result) {
        resolve({
          volume: 0,
          dimensions: { x: 0, y: 0, z: 0 },
          triangleCount: 0,
          isValid: false,
          errors: ['Failed to read file']
        })
        return
      }
      
      // Try to detect if binary or ASCII
      if (result instanceof ArrayBuffer) {
        const headerBytes = new Uint8Array(result, 0, 80)
        const headerText = String.fromCharCode(...headerBytes)
        
        if (headerText.toLowerCase().includes('solid')) {
          // Could be ASCII, try to parse as text first
          const textDecoder = new TextDecoder()
          const text = textDecoder.decode(result)
          
          if (text.includes('vertex') && text.includes('facet')) {
            resolve(parseAsciiSTL(text))
            return
          }
        }
        
        // Parse as binary
        resolve(parseBinarySTL(result))
      }
    }
    
    reader.onerror = () => {
      resolve({
        volume: 0,
        dimensions: { x: 0, y: 0, z: 0 },
        triangleCount: 0,
        isValid: false,
        errors: ['Error reading file']
      })
    }
    
    reader.readAsArrayBuffer(file)
  })
}

// Validate file type
export const isValidFileType = (file: File): boolean => {
  const validExtensions = ['.stl', '.obj', '.3mf']
  const fileName = file.name.toLowerCase()
  return validExtensions.some(ext => fileName.endsWith(ext))
}

// Get file extension
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
