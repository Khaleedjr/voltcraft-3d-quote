import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import * as fflate from 'three/examples/jsm/libs/fflate.module.js'
import { FileAnalysis } from '../types'

const unzipSyncFn = (fflate as unknown as { unzipSync: (data: Uint8Array) => Record<string, Uint8Array> }).unzipSync

export type SupportedModelFormat = 'stl' | 'obj' | '3mf'

export const getFileExtension = (fileName: string): SupportedModelFormat | '' => {
  const parts = fileName.split('.')
  const extension = parts.length > 1 ? parts.pop()!.toLowerCase() : ''
  return extension === 'stl' || extension === 'obj' || extension === '3mf' ? extension : ''
}

export const isValidFileType = (file: File): boolean => {
  return Boolean(getFileExtension(file.name))
}

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (result instanceof ArrayBuffer) {
        resolve(result)
      } else {
        reject(new Error('Failed to read model file as binary data.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read model file.'))
    reader.readAsArrayBuffer(file)
  })
}

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read model file as text.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read model file.'))
    reader.readAsText(file)
  })
}

const triangleVolume = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): number => {
  return (
    a.x * (b.y * c.z - c.y * b.z) +
    b.x * (c.y * a.z - a.y * c.z) +
    c.x * (a.y * b.z - b.y * a.z)
  ) / 6
}

interface ThreeMFFallbackResult {
  geometry: THREE.BufferGeometry
  analysis: FileAnalysis
}

const parseThreeMFWithXmlFallback = (buffer: ArrayBuffer): ThreeMFFallbackResult => {
  const zip = unzipSyncFn(new Uint8Array(buffer))
  const modelEntries = Object.keys(zip).filter((entry) => /^3D\/.*\.model$/i.test(entry))

  if (modelEntries.length === 0) {
    throw new Error('Unsupported 3MF file: no model entries found.')
  }

  const decoder = new TextDecoder()
  const allPositions: number[] = []
  const bbox = new THREE.Box3(
    new THREE.Vector3(Infinity, Infinity, Infinity),
    new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  )

  let volume = 0
  let triangleCount = 0
  let partCount = 0

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()

  for (const entry of modelEntries) {
    const xml = decoder.decode(zip[entry])
    const xmlDoc = new DOMParser().parseFromString(xml, 'application/xml')

    const objectNodes = Array.from(xmlDoc.getElementsByTagName('*')).filter((node) => node.localName === 'object')

    for (const objectNode of objectNodes) {
      const meshNode = Array.from(objectNode.childNodes).find(
        (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === 'mesh'
      ) as Element | undefined

      if (!meshNode) {
        continue
      }

      const verticesNode = Array.from(meshNode.childNodes).find(
        (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === 'vertices'
      ) as Element | undefined

      const trianglesNode = Array.from(meshNode.childNodes).find(
        (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === 'triangles'
      ) as Element | undefined

      if (!verticesNode || !trianglesNode) {
        continue
      }

      const vertexElements = Array.from(verticesNode.children).filter((node) => node.localName === 'vertex')
      const triangleElements = Array.from(trianglesNode.children).filter((node) => node.localName === 'triangle')

      if (vertexElements.length === 0 || triangleElements.length === 0) {
        continue
      }

      const vertices = vertexElements.map((vertexElement) => {
        const x = Number(vertexElement.getAttribute('x') || 0)
        const y = Number(vertexElement.getAttribute('y') || 0)
        const z = Number(vertexElement.getAttribute('z') || 0)
        return new THREE.Vector3(x, y, z)
      })

      partCount += 1

      for (const triangleElement of triangleElements) {
        const v1 = Number(triangleElement.getAttribute('v1'))
        const v2 = Number(triangleElement.getAttribute('v2'))
        const v3 = Number(triangleElement.getAttribute('v3'))

        if (!Number.isInteger(v1) || !Number.isInteger(v2) || !Number.isInteger(v3)) {
          continue
        }

        const p1 = vertices[v1]
        const p2 = vertices[v2]
        const p3 = vertices[v3]

        if (!p1 || !p2 || !p3) {
          continue
        }

        allPositions.push(
          p1.x, p1.y, p1.z,
          p2.x, p2.y, p2.z,
          p3.x, p3.y, p3.z
        )

        bbox.expandByPoint(p1)
        bbox.expandByPoint(p2)
        bbox.expandByPoint(p3)

        a.copy(p1)
        b.copy(p2)
        c.copy(p3)
        volume += triangleVolume(a, b, c)
        triangleCount += 1
      }
    }
  }

  if (allPositions.length === 0 || triangleCount === 0) {
    throw new Error('Unsupported 3MF mesh structure. Please export this file as STL for now.')
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
  geometry.computeVertexNormals()

  const size = new THREE.Vector3()
  bbox.getSize(size)

  return {
    geometry,
    analysis: {
      volume: Math.round((Math.abs(volume) / 1000) * 100) / 100,
      dimensions: {
        x: Math.round(size.x * 100) / 100,
        y: Math.round(size.y * 100) / 100,
        z: Math.round(size.z * 100) / 100
      },
      triangleCount,
      partCount,
      format: '3mf',
      isValid: true,
      errors: []
    }
  }
}

// ---------------------------------------------------------------------------
// Production-extension-aware 3MF parser
//
// Real-world 3MF files (Bambu Studio, PrusaSlicer, Cura, …) commonly use the
// 3MF "production" extension: the actual mesh geometry lives in separate
// `3D/Objects/object_*.model` files, referenced from the root model through
// <components> (each with its own transform), and every printable copy on the
// plate is placed by a <build> <item> with a transform. A single mesh is often
// referenced many times at different positions/orientations.
//
// The naive readers below (three.js ThreeMFLoader / the XML fallback) ignore
// those component + build transforms, so a multi-part plate collapses into one
// overlapping "chunk" and the reported volume only counts each distinct mesh
// once. This parser resolves the full graph so both the preview and the volume
// reflect every placed part.
// ---------------------------------------------------------------------------

interface Parsed3MFObject {
  vertices?: Float32Array
  indices?: Uint32Array
  components?: Array<{ path: string | null; objectid: number; matrix: THREE.Matrix4 }>
}

interface Parsed3MFDoc {
  unitScale: number
  objects: Map<number, Parsed3MFObject>
  buildItems: Array<{ objectid: number; matrix: THREE.Matrix4 }>
}

const UNIT_TO_MM: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  meter: 1000,
  inch: 25.4,
  foot: 304.8
}

const normalizeEntryPath = (p: string): string => p.replace(/^\/+/, '')

// Read an attribute by qualified name, falling back to matching localName so
// namespaced attributes (e.g. p:path) are found regardless of prefix.
const getAttr = (el: Element, name: string): string | null => {
  const direct = el.getAttribute(name)
  if (direct !== null) return direct
  const local = name.includes(':') ? name.split(':').pop()! : name
  for (let i = 0; i < el.attributes.length; i += 1) {
    const attr = el.attributes[i]
    if (attr.localName === local) return attr.value
  }
  return null
}

// 3MF stores a transform as 12 numbers describing a row-major affine matrix
// (the last triple is translation). Convert to a THREE.Matrix4 that transforms
// column vectors.
const parseThreeMFTransform = (value: string | null): THREE.Matrix4 => {
  const matrix = new THREE.Matrix4()
  if (!value) return matrix
  const n = value.trim().split(/\s+/).map(Number)
  if (n.length < 12 || n.some((x) => !Number.isFinite(x))) return matrix
  matrix.set(
    n[0], n[3], n[6], n[9],
    n[1], n[4], n[7], n[10],
    n[2], n[5], n[8], n[11],
    0, 0, 0, 1
  )
  return matrix
}

const findChild = (parent: Node, localName: string): Element | undefined =>
  Array.from(parent.childNodes).find(
    (node) => node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === localName
  ) as Element | undefined

const parseThreeMFDocument = (xml: string): Parsed3MFDoc => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const allElements = Array.from(doc.getElementsByTagName('*'))

  const modelEl = allElements.find((node) => node.localName === 'model') as Element | undefined
  const unit = (modelEl && getAttr(modelEl, 'unit')) || 'millimeter'
  const unitScale = UNIT_TO_MM[unit.toLowerCase()] ?? 1

  const objects = new Map<number, Parsed3MFObject>()

  for (const objEl of allElements.filter((node) => node.localName === 'object')) {
    const idStr = getAttr(objEl as Element, 'id')
    if (idStr === null) continue
    const id = Number(idStr)
    if (!Number.isInteger(id)) continue

    const parsed: Parsed3MFObject = {}

    const meshEl = findChild(objEl, 'mesh')
    if (meshEl) {
      const verticesEl = findChild(meshEl, 'vertices')
      const trianglesEl = findChild(meshEl, 'triangles')
      if (verticesEl && trianglesEl) {
        const vertexEls = Array.from(verticesEl.children).filter((n) => n.localName === 'vertex')
        const triangleEls = Array.from(trianglesEl.children).filter((n) => n.localName === 'triangle')
        if (vertexEls.length > 0 && triangleEls.length > 0) {
          const vertices = new Float32Array(vertexEls.length * 3)
          for (let k = 0; k < vertexEls.length; k += 1) {
            vertices[k * 3] = Number(vertexEls[k].getAttribute('x') || 0)
            vertices[k * 3 + 1] = Number(vertexEls[k].getAttribute('y') || 0)
            vertices[k * 3 + 2] = Number(vertexEls[k].getAttribute('z') || 0)
          }
          const indices = new Uint32Array(triangleEls.length * 3)
          let valid = 0
          for (let k = 0; k < triangleEls.length; k += 1) {
            const v1 = Number(triangleEls[k].getAttribute('v1'))
            const v2 = Number(triangleEls[k].getAttribute('v2'))
            const v3 = Number(triangleEls[k].getAttribute('v3'))
            if (!Number.isInteger(v1) || !Number.isInteger(v2) || !Number.isInteger(v3)) continue
            indices[valid * 3] = v1
            indices[valid * 3 + 1] = v2
            indices[valid * 3 + 2] = v3
            valid += 1
          }
          if (valid > 0) {
            parsed.vertices = vertices
            parsed.indices = valid === triangleEls.length ? indices : indices.slice(0, valid * 3)
          }
        }
      }
    }

    const componentsEl = findChild(objEl, 'components')
    if (componentsEl) {
      const components = Array.from(componentsEl.children)
        .filter((n) => n.localName === 'component')
        .map((cEl) => {
          const oidStr = getAttr(cEl, 'objectid')
          return {
            path: getAttr(cEl, 'p:path'),
            objectid: oidStr !== null ? Number(oidStr) : NaN,
            matrix: parseThreeMFTransform(getAttr(cEl, 'transform'))
          }
        })
        .filter((c) => Number.isInteger(c.objectid))
      if (components.length > 0) parsed.components = components
    }

    objects.set(id, parsed)
  }

  const buildItems: Array<{ objectid: number; matrix: THREE.Matrix4 }> = []
  const buildEl = allElements.find((node) => node.localName === 'build') as Element | undefined
  if (buildEl) {
    for (const itemEl of Array.from(buildEl.children).filter((n) => n.localName === 'item')) {
      const oidStr = getAttr(itemEl, 'objectid')
      if (oidStr === null) continue
      const objectid = Number(oidStr)
      if (!Number.isInteger(objectid)) continue
      buildItems.push({ objectid, matrix: parseThreeMFTransform(getAttr(itemEl, 'transform')) })
    }
  }

  return { unitScale, objects, buildItems }
}

interface ThreeMFProductionResult {
  geometries: THREE.BufferGeometry[]
  analysis: FileAnalysis
}

const parseThreeMFProduction = (buffer: ArrayBuffer): ThreeMFProductionResult | null => {
  let zip: Record<string, Uint8Array>
  try {
    zip = unzipSyncFn(new Uint8Array(buffer))
  } catch {
    return null
  }

  const decoder = new TextDecoder()

  const docs = new Map<string, Parsed3MFDoc>()
  for (const key of Object.keys(zip)) {
    if (!/\.model$/i.test(key)) continue
    try {
      docs.set(normalizeEntryPath(key), parseThreeMFDocument(decoder.decode(zip[key])))
    } catch {
      // ignore individual malformed model parts
    }
  }
  if (docs.size === 0) return null

  // Resolve the start-part (root model) from the package relationships.
  let rootPath = '3D/3dmodel.model'
  const relsKey = Object.keys(zip).find((k) => /_rels\/\.rels$/i.test(k))
  if (relsKey) {
    try {
      const relsDoc = new DOMParser().parseFromString(decoder.decode(zip[relsKey]), 'application/xml')
      const relationship = Array.from(relsDoc.getElementsByTagName('*'))
        .filter((n) => n.localName === 'Relationship')
        .find((r) => (r.getAttribute('Type') || '').toLowerCase().includes('3dmodel'))
      const target = relationship?.getAttribute('Target')
      if (target) rootPath = normalizeEntryPath(target)
    } catch {
      // fall back to default path
    }
  }
  if (!docs.has(rootPath)) {
    rootPath =
      Array.from(docs.entries()).find(([, d]) => d.buildItems.length > 0)?.[0] ||
      Array.from(docs.keys())[0]
  }

  const rootDoc = docs.get(rootPath)
  if (!rootDoc || rootDoc.buildItems.length === 0) {
    // No build items to place — let the caller fall back to other readers.
    return null
  }

  const geometries: THREE.BufferGeometry[] = []
  const overallBox = new THREE.Box3()
  let totalVolume = 0
  let totalTriangles = 0

  const vertex = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()

  const expand = (path: string, objectid: number, matrix: THREE.Matrix4, depth: number): void => {
    if (depth > 50) return
    const doc = docs.get(path)
    if (!doc) return
    const obj = doc.objects.get(objectid)
    if (!obj) return

    if (obj.vertices && obj.indices && obj.indices.length >= 3) {
      const src = obj.vertices
      const positions = new Float32Array(src.length)
      for (let i = 0; i < src.length; i += 3) {
        vertex.set(src[i], src[i + 1], src[i + 2]).applyMatrix4(matrix)
        positions[i] = vertex.x
        positions[i + 1] = vertex.y
        positions[i + 2] = vertex.z
        overallBox.expandByPoint(vertex)
      }

      const indices = obj.indices
      let volume = 0
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3
        const i1 = indices[i + 1] * 3
        const i2 = indices[i + 2] * 3
        a.set(positions[i0], positions[i0 + 1], positions[i0 + 2])
        b.set(positions[i1], positions[i1 + 1], positions[i1 + 2])
        c.set(positions[i2], positions[i2 + 1], positions[i2 + 2])
        volume += triangleVolume(a, b, c)
      }
      totalVolume += Math.abs(volume)
      totalTriangles += Math.floor(indices.length / 3)

      const geom = new THREE.BufferGeometry()
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geom.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
      geom.computeVertexNormals()
      geometries.push(geom)
    }

    if (obj.components) {
      for (const comp of obj.components) {
        const childPath = comp.path ? normalizeEntryPath(comp.path) : path
        expand(childPath, comp.objectid, matrix.clone().multiply(comp.matrix), depth + 1)
      }
    }
  }

  const unitMatrix = new THREE.Matrix4().makeScale(rootDoc.unitScale, rootDoc.unitScale, rootDoc.unitScale)
  for (const item of rootDoc.buildItems) {
    expand(rootPath, item.objectid, unitMatrix.clone().multiply(item.matrix), 0)
  }

  if (geometries.length === 0) return null

  const size = new THREE.Vector3()
  overallBox.getSize(size)

  return {
    geometries,
    analysis: {
      volume: Math.round((totalVolume / 1000) * 100) / 100,
      dimensions: {
        x: Math.round(size.x * 100) / 100,
        y: Math.round(size.y * 100) / 100,
        z: Math.round(size.z * 100) / 100
      },
      triangleCount: totalTriangles,
      partCount: geometries.length,
      format: '3mf',
      isValid: true,
      errors: []
    }
  }
}

const analyzeGeometry = (geometry: THREE.BufferGeometry, format: SupportedModelFormat, partCount = 1): FileAnalysis => {
  const position = geometry.getAttribute('position')

  if (!position) {
    return {
      volume: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      partCount,
      format,
      isValid: false,
      errors: ['Invalid model: geometry has no position data.']
    }
  }

  const triangleCount = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(position.count / 3)

  const box = new THREE.Box3().setFromBufferAttribute(position as THREE.BufferAttribute)
  const size = new THREE.Vector3()
  box.getSize(size)

  let volume = 0
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()

  if (geometry.index) {
    const index = geometry.index
    for (let i = 0; i < index.count; i += 3) {
      a.fromBufferAttribute(position, index.getX(i))
      b.fromBufferAttribute(position, index.getX(i + 1))
      c.fromBufferAttribute(position, index.getX(i + 2))
      volume += triangleVolume(a, b, c)
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i)
      b.fromBufferAttribute(position, i + 1)
      c.fromBufferAttribute(position, i + 2)
      volume += triangleVolume(a, b, c)
    }
  }

  return {
    volume: Math.round((Math.abs(volume) / 1000) * 100) / 100,
    dimensions: {
      x: Math.round(size.x * 100) / 100,
      y: Math.round(size.y * 100) / 100,
      z: Math.round(size.z * 100) / 100
    },
    triangleCount,
    partCount,
    format,
    isValid: true,
    errors: []
  }
}

const analyzeObject3D = (object: THREE.Object3D, format: SupportedModelFormat): FileAnalysis => {
  object.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(object)
  const size = new THREE.Vector3()
  box.getSize(size)

  let triangleCount = 0
  let volume = 0
  let partCount = 0

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return
    }

    const geometry = child.geometry as THREE.BufferGeometry
    const position = geometry.getAttribute('position')
    if (!position) {
      return
    }

    partCount += 1

    const triangleTotal = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(position.count / 3)
    triangleCount += triangleTotal

    const matrix = child.matrixWorld
    const a = new THREE.Vector3()
    const b = new THREE.Vector3()
    const c = new THREE.Vector3()

    if (geometry.index) {
      const index = geometry.index
      for (let i = 0; i < index.count; i += 3) {
        a.fromBufferAttribute(position, index.getX(i)).applyMatrix4(matrix)
        b.fromBufferAttribute(position, index.getX(i + 1)).applyMatrix4(matrix)
        c.fromBufferAttribute(position, index.getX(i + 2)).applyMatrix4(matrix)
        volume += triangleVolume(a, b, c)
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        a.fromBufferAttribute(position, i).applyMatrix4(matrix)
        b.fromBufferAttribute(position, i + 1).applyMatrix4(matrix)
        c.fromBufferAttribute(position, i + 2).applyMatrix4(matrix)
        volume += triangleVolume(a, b, c)
      }
    }
  })

  return {
    volume: Math.round((Math.abs(volume) / 1000) * 100) / 100,
    dimensions: {
      x: Math.round(size.x * 100) / 100,
      y: Math.round(size.y * 100) / 100,
      z: Math.round(size.z * 100) / 100
    },
    triangleCount,
    partCount,
    format,
    isValid: true,
    errors: []
  }
}

export const parseModelFile = async (file: File): Promise<FileAnalysis> => {
  const format = getFileExtension(file.name)

  if (!format) {
    return {
      volume: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      isValid: false,
      errors: ['Unsupported file type. Please upload STL, OBJ, or 3MF files.']
    }
  }

  try {
    if (format === 'stl') {
      const buffer = await readFileAsArrayBuffer(file)
      const loader = new STLLoader()
      const geometry = loader.parse(buffer)
      geometry.computeBoundingBox()
      return analyzeGeometry(geometry, format)
    }

    if (format === 'obj') {
      const text = await readFileAsText(file)
      const loader = new OBJLoader()
      const object = loader.parse(text)
      return analyzeObject3D(object, format)
    }

    const buffer = await readFileAsArrayBuffer(file)
    const loader = new ThreeMFLoader()

    try {
      const object = loader.parse(buffer)

      if (!object) {
        throw new Error('Unable to parse 3MF model.')
      }

      return analyzeObject3D(object, format)
    } catch {
      const fallback = parseThreeMFWithXmlFallback(buffer)
      return fallback.analysis
    }
  } catch (error) {
    return {
      volume: 0,
      dimensions: { x: 0, y: 0, z: 0 },
      triangleCount: 0,
      partCount: 0,
      format,
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Failed to analyze model file.']
    }
  }
}

export const loadModelObject = async (file: File): Promise<THREE.BufferGeometry | THREE.Object3D | null> => {
  const format = getFileExtension(file.name)

  try {
    if (format === 'stl') {
      const buffer = await readFileAsArrayBuffer(file)
      const loader = new STLLoader()
      const geometry = loader.parse(buffer)
      // Normalize units before returning preview geometry
      normalizeGeometryToMillimeters(geometry)
      geometry.computeBoundingBox()
      geometry.center()

      const bbox = geometry.boundingBox
      if (bbox) {
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = maxDim > 0 ? 100 / maxDim : 1
        geometry.scale(scale, scale, scale)
      }

      return geometry
    }

    if (format === 'obj') {
      const text = await readFileAsText(file)
      const loader = new OBJLoader()
      const object = loader.parse(text)
      object.updateMatrixWorld(true)

      const box = new THREE.Box3().setFromObject(object)
      const size = new THREE.Vector3()
      box.getSize(size)
      const center = new THREE.Vector3()
      box.getCenter(center)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = maxDim > 0 ? 100 / maxDim : 1

      object.scale.setScalar(scale)
      object.position.set(-center.x * scale, -center.y * scale, -center.z * scale)

      return object
    }

    if (format === '3mf') {
      const buffer = await readFileAsArrayBuffer(file)
      const loader = new ThreeMFLoader()

      try {
        const object = loader.parse(buffer)

        if (!object) {
          return null
        }

        object.updateMatrixWorld(true)

        const box = new THREE.Box3().setFromObject(object)
        const size = new THREE.Vector3()
        box.getSize(size)
        const center = new THREE.Vector3()
        box.getCenter(center)
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = maxDim > 0 ? 100 / maxDim : 1

        object.scale.setScalar(scale)
        object.position.set(-center.x * scale, -center.y * scale, -center.z * scale)

        return object
      } catch {
        const fallback = parseThreeMFWithXmlFallback(buffer)
        fallback.geometry.computeBoundingBox()
        fallback.geometry.center()

        const bbox = fallback.geometry.boundingBox
        if (bbox) {
          const size = new THREE.Vector3()
          bbox.getSize(size)
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = maxDim > 0 ? 100 / maxDim : 1
          fallback.geometry.scale(scale, scale, scale)
        }

        return fallback.geometry
      }
    }

    return null
  } catch (error) {
    console.error('Failed to load model preview:', error)
    return null
  }
}

// Split a single BufferGeometry into connected components (separate parts)
const splitBufferGeometryIntoParts = (geometry: THREE.BufferGeometry): THREE.BufferGeometry[] => {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
  if (!posAttr) return []

  const indexAttr = geometry.index as THREE.BufferAttribute | null

  // Map canonical vertex key to id
  const vertexKeyToId = new Map<string, number>()
  let nextVertexId = 0
  const faceVertexIds: number[][] = []

  const keyFor = (x: number, y: number, z: number) => `${x.toFixed(5)}|${y.toFixed(5)}|${z.toFixed(5)}`

  if (indexAttr) {
    const faceCount = Math.floor(indexAttr.count / 3)
    for (let f = 0; f < faceCount; f++) {
      const vids: number[] = []
      for (let v = 0; v < 3; v++) {
        const idx = indexAttr.getX(f * 3 + v)
        const x = posAttr.getX(idx)
        const y = posAttr.getY(idx)
        const z = posAttr.getZ(idx)
        const key = keyFor(x, y, z)
        let id = vertexKeyToId.get(key)
        if (id === undefined) {
          id = nextVertexId++
          vertexKeyToId.set(key, id)
        }
        vids.push(id)
      }
      faceVertexIds.push(vids)
    }
  } else {
    const vertexCount = posAttr.count
    const faceCount = Math.floor(vertexCount / 3)
    for (let f = 0; f < faceCount; f++) {
      const baseVertex = f * 3
      const vids: number[] = []
      for (let v = 0; v < 3; v++) {
        const vi = baseVertex + v
        const x = posAttr.getX(vi)
        const y = posAttr.getY(vi)
        const z = posAttr.getZ(vi)
        const key = keyFor(x, y, z)
        let id = vertexKeyToId.get(key)
        if (id === undefined) {
          id = nextVertexId++
          vertexKeyToId.set(key, id)
        }
        vids.push(id)
      }
      faceVertexIds.push(vids)
    }
  }

  const faceCount = faceVertexIds.length

  // Build vertex -> faces map
  const vertexToFaces: Map<number, number[]> = new Map()
  for (let f = 0; f < faceCount; f++) {
    for (const vid of faceVertexIds[f]) {
      let arr = vertexToFaces.get(vid)
      if (!arr) {
        arr = []
        vertexToFaces.set(vid, arr)
      }
      arr.push(f)
    }
  }

  // Build adjacency by faces sharing a vertex
  const visited = new Uint8Array(faceCount)
  const parts: number[][] = []

  for (let f = 0; f < faceCount; f++) {
    if (visited[f]) continue
    const stack = [f]
    visited[f] = 1
    const comp: number[] = []
    while (stack.length) {
      const cur = stack.pop()!
      comp.push(cur)
      for (const vid of faceVertexIds[cur]) {
        const faces = vertexToFaces.get(vid) || []
        for (const nf of faces) {
          if (!visited[nf]) {
            visited[nf] = 1
            stack.push(nf)
          }
        }
      }
    }
    parts.push(comp)
  }

  // Build geometry per component
  const geometries: THREE.BufferGeometry[] = []
  for (const comp of parts) {
    const posArr: number[] = []
    for (const f of comp) {
      if (indexAttr) {
        for (let v = 0; v < 3; v++) {
          const idx = indexAttr.getX(f * 3 + v)
          posArr.push(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx))
        }
      } else {
        const baseVertex = f * 3
        for (let v = 0; v < 3; v++) {
          const vi = baseVertex + v
          posArr.push(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi))
        }
      }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3))
    g.computeVertexNormals()
    geometries.push(g)
  }

  return geometries
}

// Collect BufferGeometries from an Object3D (preserve separate meshes)
const collectGeometriesFromObject = (object: THREE.Object3D): THREE.BufferGeometry[] => {
  const geometries: THREE.BufferGeometry[] = []
  object.updateMatrixWorld(true)
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const geom = child.geometry as THREE.BufferGeometry
      if (!geom) return
      const clone = geom.clone()
      // apply world transform
      const matrix = child.matrixWorld
      const pos = clone.getAttribute('position') as THREE.BufferAttribute
      if (pos) {
        const arr = pos.array as Float32Array
        for (let i = 0; i < arr.length; i += 3) {
          const v = new THREE.Vector3(arr[i], arr[i + 1], arr[i + 2])
          v.applyMatrix4(matrix)
          arr[i] = v.x
          arr[i + 1] = v.y
          arr[i + 2] = v.z
        }
        clone.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
        clone.computeVertexNormals()
      }
      geometries.push(clone)
    }
  })
  return geometries
}

// Parse a model file and return separate geometries (parts) and aggregated analysis
export const parseModelFileParts = async (file: File): Promise<{ geometries: THREE.BufferGeometry[]; analysis: FileAnalysis }> => {
  const format = getFileExtension(file.name)
  if (!format) {
    return { geometries: [], analysis: { volume: 0, dimensions: { x: 0, y: 0, z: 0 }, triangleCount: 0, partCount: 0, format: undefined, isValid: false, errors: ['Unsupported file type. Please upload STL, OBJ, or 3MF files.'] } }
  }

  try {
    if (format === 'stl') {
      const buffer = await readFileAsArrayBuffer(file)
      const loader = new STLLoader()
      const geometry = loader.parse(buffer)
      // geometry may be a single merged mesh; split into parts by connectivity
      const parts = splitBufferGeometryIntoParts(geometry)
      // Normalize units to millimeters for each part before analysis
      for (const p of parts) normalizeGeometryToMillimeters(p)
      const analyses = parts.map((g) => analyzeGeometry(g, format))
      // aggregate
      const totalVolume = analyses.reduce((s, a) => s + a.volume, 0)
      const totalTriangles = analyses.reduce((s, a) => s + a.triangleCount, 0)
      // overall bbox
      const bbox = new THREE.Box3()
      for (const g of parts) {
        const pa = g.boundingBox
        if (!pa) g.computeBoundingBox()
        if (g.boundingBox) bbox.union(g.boundingBox)
      }
      const size = new THREE.Vector3()
      bbox.getSize(size)

      return {
        geometries: parts,
        analysis: {
          volume: Math.round(totalVolume * 100) / 100,
          dimensions: { x: Math.round(size.x * 100) / 100, y: Math.round(size.y * 100) / 100, z: Math.round(size.z * 100) / 100 },
          triangleCount: totalTriangles,
          partCount: parts.length,
          format,
          isValid: true,
          errors: []
        }
      }
    }

    if (format === 'obj') {
      const text = await readFileAsText(file)
      const loader = new OBJLoader()
      const object = loader.parse(text)
      const parts = collectGeometriesFromObject(object)
      for (const p of parts) normalizeGeometryToMillimeters(p)
      const analyses = parts.map((g) => analyzeGeometry(g, format))
      const totalVolume = analyses.reduce((s, a) => s + a.volume, 0)
      const totalTriangles = analyses.reduce((s, a) => s + a.triangleCount, 0)
      const bbox = new THREE.Box3()
      for (const g of parts) {
        if (!g.boundingBox) g.computeBoundingBox()
        if (g.boundingBox) bbox.union(g.boundingBox)
      }
      const size = new THREE.Vector3()
      bbox.getSize(size)
      return {
        geometries: parts,
        analysis: {
          volume: Math.round(totalVolume * 100) / 100,
          dimensions: { x: Math.round(size.x * 100) / 100, y: Math.round(size.y * 100) / 100, z: Math.round(size.z * 100) / 100 },
          triangleCount: totalTriangles,
          partCount: parts.length,
          format,
          isValid: true,
          errors: []
        }
      }
    }

    // 3MF: prefer the production-extension-aware parser so multi-part plates
    // (geometry in separate object files, placed by <build> item transforms)
    // resolve every placed copy for both the preview and the volume.
    const buffer = await readFileAsArrayBuffer(file)
    const production = parseThreeMFProduction(buffer)
    if (production && production.geometries.length > 0) {
      return production
    }

    // Fallback: three.js ThreeMFLoader, then the naive XML reader.
    const loader = new ThreeMFLoader()
    try {
      const object = loader.parse(buffer)
      if (!object) throw new Error('Unable to parse 3MF model.')
      const parts = collectGeometriesFromObject(object)
      for (const p of parts) normalizeGeometryToMillimeters(p)
      const analyses = parts.map((g) => analyzeGeometry(g, '3mf'))
      const totalVolume = analyses.reduce((s, a) => s + a.volume, 0)
      const totalTriangles = analyses.reduce((s, a) => s + a.triangleCount, 0)
      const bbox = new THREE.Box3()
      for (const g of parts) {
        if (!g.boundingBox) g.computeBoundingBox()
        if (g.boundingBox) bbox.union(g.boundingBox)
      }
      const size = new THREE.Vector3()
      bbox.getSize(size)

      return {
        geometries: parts,
        analysis: {
          volume: Math.round(totalVolume * 100) / 100,
          dimensions: { x: Math.round(size.x * 100) / 100, y: Math.round(size.y * 100) / 100, z: Math.round(size.z * 100) / 100 },
          triangleCount: totalTriangles,
          partCount: parts.length,
          format: '3mf',
          isValid: true,
          errors: []
        }
      }
    } catch {
      const fallback = parseThreeMFWithXmlFallback(buffer)
      // parseThreeMFWithXmlFallback returns geometry and analysis for whole file; try to split
      const parts = splitBufferGeometryIntoParts(fallback.geometry)
      for (const p of parts) normalizeGeometryToMillimeters(p)
      const analyses = parts.map((g) => analyzeGeometry(g, '3mf'))
      const totalVolume = analyses.reduce((s, a) => s + a.volume, 0)
      const totalTriangles = analyses.reduce((s, a) => s + a.triangleCount, 0)
      const bbox = new THREE.Box3()
      for (const g of parts) {
        if (!g.boundingBox) g.computeBoundingBox()
        if (g.boundingBox) bbox.union(g.boundingBox)
      }
      const size = new THREE.Vector3()
      bbox.getSize(size)
      return {
        geometries: parts,
        analysis: {
          volume: Math.round(totalVolume * 100) / 100,
          dimensions: { x: Math.round(size.x * 100) / 100, y: Math.round(size.y * 100) / 100, z: Math.round(size.z * 100) / 100 },
          triangleCount: totalTriangles,
          partCount: parts.length,
          format: '3mf',
          isValid: true,
          errors: []
        }
      }
    }
  } catch (error) {
    return { geometries: [], analysis: { volume: 0, dimensions: { x: 0, y: 0, z: 0 }, triangleCount: 0, partCount: 0, format: undefined, isValid: false, errors: [error instanceof Error ? error.message : 'Failed to analyze model file.'] } }
  }
}

// Load parts ready for rendering (scaled/centered)
export const loadModelParts = async (file: File): Promise<THREE.BufferGeometry[]> => {
  const { geometries } = await parseModelFileParts(file)
  if (geometries.length === 0) return geometries

  // Center and scale the WHOLE assembly with a single transform so multi-part
  // models keep their real relative positions and sizes. (Previously each part
  // was independently centered at the origin and blown up to the same size,
  // which collapsed a multi-part plate into one overlapping blob.)
  const bbox = new THREE.Box3()
  for (const geometry of geometries) {
    geometry.computeBoundingBox()
    if (geometry.boundingBox) bbox.union(geometry.boundingBox)
  }
  if (bbox.isEmpty()) return geometries

  const center = new THREE.Vector3()
  bbox.getCenter(center)
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? 100 / maxDim : 1

  for (const geometry of geometries) {
    geometry.translate(-center.x, -center.y, -center.z)
    geometry.scale(scale, scale, scale)
    geometry.computeBoundingBox()
    geometry.computeVertexNormals()
  }
  return geometries
}

// Scale geometry positions in-place by a factor
const scaleGeometryInPlace = (geometry: THREE.BufferGeometry, factor: number) => {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  if (!pos) return
  for (let i = 0; i < pos.count; i++) {
    pos.setX(i, pos.getX(i) * factor)
    pos.setY(i, pos.getY(i) * factor)
    pos.setZ(i, pos.getZ(i) * factor)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute((geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array, 3))
  geometry.computeBoundingBox()
  geometry.computeVertexNormals()
}

// Normalize units to millimeters: if geometry appears to be in meters (maxDim < 1), scale by 1000
const normalizeGeometryToMillimeters = (geometry: THREE.BufferGeometry): void => {
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox
  if (!bbox) return
  const size = new THREE.Vector3()
  bbox.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim > 0 && maxDim < 1) {
    // likely in meters -> convert to mm
    scaleGeometryInPlace(geometry, 1000)
  }
}