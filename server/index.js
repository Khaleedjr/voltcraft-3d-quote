import express from 'express'
import cors from 'cors'
import multer from 'multer'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { randomUUID } from 'crypto'
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { FREE_DELIVERY_THRESHOLD_NGN, getShippingZoneById } from './shippingRates.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 3001)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
})

app.use(cors())
app.use(express.json({ limit: '2mb' }))

const pendingOrders = new Map()
const paidOrders = new Map()

const SOL_RATE_CACHE_TTL_MS = 2 * 60 * 1000
let solRateCache = {
  value: null,
  updatedAt: 0
}

const formatPrice = (value) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(value)
}

const formatPrintTime = (minutes) => {
  if (!minutes || minutes <= 0) {
    return 'N/A'
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)

  if (hours === 0) {
    return `${remainingMinutes}m`
  }

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}m`
}

const parseJsonSafely = (value, fallback = {}) => {
  if (value && typeof value === 'object') {
    return value
  }

  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

const getTransporter = () => {
  const host = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const secure = process.env.SMTP_SECURE === 'true'

  if (!host || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.')
  }

  const isGmailHost = /(^|\.)gmail\.com$/i.test(host)

  if (isGmailHost) {
    return nodemailer.createTransport({
      service: 'gmail',
      family: 4,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: {
        user,
        pass
      }
    })
  }

  return nodemailer.createTransport({
    host,
    port: smtpPort,
    secure,
    family: 4,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user,
      pass
    }
  })
}

const getMailConfig = () => {
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER
  const adminRecipient = process.env.ADMIN_EMAIL || process.env.SMTP_USER

  if (!from || !adminRecipient) {
    throw new Error('Email sender/recipient configuration is incomplete. Set FROM_EMAIL and ADMIN_EMAIL.')
  }

  return { from, adminRecipient }
}

const getPaystackConfig = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY

  if (!secretKey) {
    throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY in your .env.')
  }

  return {
    secretKey,
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL || `${process.env.CLIENT_URL || 'http://localhost:3000'}/quote?payment=paystack`
  }
}

const getSolanaConfig = () => {
  const recipientAddress = process.env.SOLANA_RECIPIENT_ADDRESS

  if (!recipientAddress) {
    throw new Error('Solana Pay is not configured. Set SOLANA_RECIPIENT_ADDRESS in your .env.')
  }

  return {
    recipientAddress,
    fallbackNgnPerSol: Number(process.env.SOLANA_NGN_PER_SOL || 114400),
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  }
}

const getLiveSolToNgnRate = async () => {
  const now = Date.now()

  if (solRateCache.value && now - solRateCache.updatedAt < SOL_RATE_CACHE_TTL_MS) {
    return solRateCache.value
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=ngn', {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`CoinGecko rate request failed with status ${response.status}`)
    }

    const data = await response.json()
    const rate = Number(data?.solana?.ngn)

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('Invalid SOL/NGN rate received from CoinGecko.')
    }

    solRateCache = {
      value: rate,
      updatedAt: now
    }

    return rate
  } catch {
    const { fallbackNgnPerSol } = getSolanaConfig()

    if (!Number.isFinite(fallbackNgnPerSol) || fallbackNgnPerSol <= 0) {
      throw new Error('Unable to fetch live SOL rate and fallback SOLANA_NGN_PER_SOL is invalid.')
    }

    return fallbackNgnPerSol
  }
}

const buildAttachments = (file) => {
  if (!file) {
    return []
  }

  return [
    {
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype
    }
  ]
}

const renderEstimateHtml = ({
  customerName,
  fileName,
  materialName,
  settings,
  analysis,
  quote,
  referenceNumber,
  shippingLabel,
  shippingFee,
  grandTotal,
  isFreeDeliveryEligible = false,
  includeReference = true
}) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 8px;">Voltcraft 3D Print Estimate</h2>
      <p style="margin-top: 0; color: #4B5563;">Hello ${customerName || 'there'},</p>
      <p style="color: #4B5563;">Here is your estimate for <strong>${fileName}</strong>.</p>
      ${includeReference ? `<p><strong>Reference:</strong> ${referenceNumber}</p>` : ''}
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <tbody>
          <tr><td style="padding: 6px 0;"><strong>Material:</strong></td><td>${materialName}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Color:</strong></td><td>${settings.color}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Layer Height:</strong></td><td>${settings.layerHeight}mm</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Infill:</strong></td><td>${settings.infillPercentage}%</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Quantity:</strong></td><td>${settings.quantity}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Dimensions:</strong></td><td>${analysis?.dimensions?.x || '-'} x ${analysis?.dimensions?.y || '-'} x ${analysis?.dimensions?.z || '-'} mm</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Volume:</strong></td><td>${analysis?.volume || '-'} cm^3</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Weight:</strong></td><td>${quote.weight}g</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Estimated Time:</strong></td><td>${formatPrintTime(quote.printTime)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Print Subtotal:</strong></td><td><strong>${formatPrice(quote.totalCost)}</strong></td></tr>
          <tr><td style="padding: 6px 0;"><strong>Shipping (${shippingLabel}):</strong></td><td><strong>${isFreeDeliveryEligible ? 'FREE' : formatPrice(shippingFee)}</strong></td></tr>
          <tr><td style="padding: 6px 0;"><strong>Total Payable:</strong></td><td><strong>${formatPrice(grandTotal)}</strong></td></tr>
        </tbody>
      </table>
      <p style="font-size: 12px; color: #6B7280;">This estimate is for guidance and may change after final production review.</p>
    </div>
  `
}

const renderShippingHtml = (customer) => {
  return `
    <div style="margin-top: 12px;">
      <h3 style="margin-bottom: 8px;">Shipping Details</h3>
      <p><strong>Address:</strong> ${customer.address || 'N/A'}</p>
      <p><strong>City:</strong> ${customer.city || 'N/A'}</p>
      <p><strong>State:</strong> ${customer.state || 'N/A'}</p>
      <p><strong>Country:</strong> ${customer.country || 'N/A'}</p>
      <p><strong>Postal Code:</strong> ${customer.postalCode || 'N/A'}</p>
      <p><strong>Shipping Zone:</strong> ${customer.shippingZoneLabel || 'N/A'}</p>
      <p><strong>Notes:</strong> ${customer.notes || 'N/A'}</p>
    </div>
  `
}

const buildOrderFromRequest = (req) => {
  const { name, email, phone, address, city, state, country, postalCode, notes, shippingZone, fileName, materialName, color } = req.body
  const settings = parseJsonSafely(req.body.settings)
  const analysis = parseJsonSafely(req.body.analysis)
  const quote = parseJsonSafely(req.body.quote)

  const shipping = getShippingZoneById(shippingZone)

  const hasRequiredFields =
    Boolean(name) &&
    Boolean(email) &&
    Boolean(phone) &&
    Boolean(address) &&
    Boolean(city) &&
    Boolean(state) &&
    Boolean(country) &&
    Boolean(shippingZone) &&
    Boolean(fileName) &&
    Boolean(materialName) &&
    Boolean(settings?.quantity) &&
    Boolean(quote?.totalCost)

  if (!hasRequiredFields) {
    throw new Error('Missing required checkout fields. Please complete customer, shipping, and quote details.')
  }

  if (!shipping) {
    throw new Error('Invalid shipping zone selected.')
  }

  const printSubtotal = Number(quote.totalCost)
  const isFreeDeliveryEligible = printSubtotal >= FREE_DELIVERY_THRESHOLD_NGN
  const baseShippingFee = Number(shipping.fee)
  const shippingFee = isFreeDeliveryEligible ? 0 : baseShippingFee
  const grandTotal = printSubtotal + shippingFee

  return {
    fileName,
    materialName,
    color,
    settings,
    analysis,
    quote,
    shipping,
    isFreeDeliveryEligible,
    baseShippingFee,
    printSubtotal,
    shippingFee,
    grandTotal,
    customer: {
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      notes,
      shippingZone,
      shippingZoneLabel: shipping.label
    },
    attachments: buildAttachments(req.file)
  }
}

const sendOrderEmails = async ({ order, referenceNumber, paymentMethod, paymentTransactionId }) => {
  const transporter = getTransporter()
  const { from, adminRecipient } = getMailConfig()

  const adminHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2>Paid Order Received (${referenceNumber})</h2>
      <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      <p><strong>Payment Transaction:</strong> ${paymentTransactionId}</p>
      <p><strong>Customer:</strong> ${order.customer.name}</p>
      <p><strong>Email:</strong> ${order.customer.email}</p>
      <p><strong>Phone:</strong> ${order.customer.phone}</p>
      ${renderShippingHtml(order.customer)}
      <hr />
      ${renderEstimateHtml({
        customerName: order.customer.name,
        fileName: order.fileName,
        materialName: order.materialName,
        settings: { ...order.settings, color: order.color },
        analysis: order.analysis,
        quote: order.quote,
        referenceNumber,
        shippingLabel: order.shipping.label,
        shippingFee: order.shippingFee,
        grandTotal: order.grandTotal,
        isFreeDeliveryEligible: order.isFreeDeliveryEligible
      })}
    </div>
  `

  const customerHtml = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2>Order Confirmed (${referenceNumber})</h2>
      <p>Hello ${order.customer.name},</p>
      <p>Payment received successfully via <strong>${paymentMethod}</strong>. Your order is now confirmed.</p>
      <p><strong>Payment Transaction:</strong> ${paymentTransactionId}</p>
      ${renderShippingHtml(order.customer)}
      <hr />
      ${renderEstimateHtml({
        customerName: order.customer.name,
        fileName: order.fileName,
        materialName: order.materialName,
        settings: { ...order.settings, color: order.color },
        analysis: order.analysis,
        quote: order.quote,
        referenceNumber,
        shippingLabel: order.shipping.label,
        shippingFee: order.shippingFee,
        grandTotal: order.grandTotal,
        isFreeDeliveryEligible: order.isFreeDeliveryEligible,
        includeReference: false
      })}
      <p>We will start processing your print and share updates shortly.</p>
    </div>
  `

  await Promise.all([
    transporter.sendMail({
      from,
      to: adminRecipient,
      subject: `Paid Order: ${order.fileName} (${referenceNumber})`,
      html: adminHtml,
      attachments: order.attachments
    }),
    transporter.sendMail({
      from,
      to: order.customer.email,
      subject: `Order Confirmed (${referenceNumber})`,
      html: customerHtml,
      attachments: order.attachments
    })
  ])
}

const finalizePaidOrder = async ({ reference, paymentMethod, paymentTransactionId }) => {
  if (paidOrders.has(reference)) {
    return paidOrders.get(reference)
  }

  const pending = pendingOrders.get(reference)

  if (!pending) {
    throw new Error('Order session not found for this payment reference. Please restart checkout.')
  }

  const referenceNumber = pending.referenceNumber || `VC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`

  await sendOrderEmails({
    order: pending.order,
    referenceNumber,
    paymentMethod,
    paymentTransactionId
  })

  const result = {
    paid: true,
    referenceNumber,
    paymentMethod,
    paymentTransactionId
  }

  pendingOrders.delete(reference)
  paidOrders.set(reference, result)

  return result
}

const hasMatchingRecipientTransfer = (transaction, recipientAddress, minLamports) => {
  const instructions = transaction?.transaction?.message?.instructions || []

  return instructions.some((instruction) => {
    if (!('parsed' in instruction) || !instruction.parsed?.info) {
      return false
    }

    const parsedInfo = instruction.parsed.info
    const destination = parsedInfo.destination || parsedInfo.recipient
    const lamports = Number(parsedInfo.lamports || 0)

    return destination === recipientAddress && lamports >= minLamports
  })
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/send-estimate', upload.single('modelFile'), async (req, res) => {
  const { recipientEmail, fileName, materialName } = req.body || {}
  const settings = parseJsonSafely(req.body.settings)
  const analysis = parseJsonSafely(req.body.analysis)
  const quote = parseJsonSafely(req.body.quote)

  if (!recipientEmail || !fileName || !materialName || !settings || !analysis || !quote) {
    return res.status(400).json({ error: 'Missing required estimate payload.' })
  }

  try {
    const transporter = getTransporter()
    const { from, adminRecipient } = getMailConfig()
    const attachments = buildAttachments(req.file)
    const referenceNumber = `VC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`

    await Promise.all([
      transporter.sendMail({
        from,
        to: recipientEmail,
        subject: `Your Voltcraft Quote Estimate (${referenceNumber})`,
        attachments,
        html: renderEstimateHtml({
          customerName: 'there',
          fileName,
          materialName,
          settings,
          analysis,
          quote,
          referenceNumber,
          shippingLabel: 'To be selected at checkout',
          shippingFee: 0,
          grandTotal: Number(quote.totalCost)
        })
      }),
      transporter.sendMail({
        from,
        to: adminRecipient,
        subject: `Estimate Sent: ${fileName} (${referenceNumber})`,
        attachments,
        html: `
          <p>An estimate was sent to <strong>${recipientEmail}</strong>.</p>
          ${renderEstimateHtml({
            customerName: 'there',
            fileName,
            materialName,
            settings,
            analysis,
            quote,
            referenceNumber,
            shippingLabel: 'To be selected at checkout',
            shippingFee: 0,
            grandTotal: Number(quote.totalCost),
            includeReference: false
          })}
        `
      })
    ])

    return res.json({ ok: true, referenceNumber })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to send estimate email.' })
  }
})

app.post('/api/payments/paystack/initialize', upload.single('modelFile'), async (req, res) => {
  try {
    const order = buildOrderFromRequest(req)
    const { secretKey, callbackUrl } = getPaystackConfig()

    const amountKobo = Math.round(order.grandTotal * 100)
    const reference = `VCPS-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
    const referenceNumber = `VC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`

    pendingOrders.set(reference, {
      provider: 'paystack',
      order,
      referenceNumber,
      createdAt: Date.now()
    })

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: order.customer.email,
        amount: amountKobo,
        reference,
        callback_url: req.body.callbackUrl || callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name', variable_name: 'customer_name', value: order.customer.name },
            { display_name: 'Phone Number', variable_name: 'phone', value: order.customer.phone },
            { display_name: 'Shipping Zone', variable_name: 'shipping_zone', value: order.shipping.label },
            { display_name: 'Shipping Fee', variable_name: 'shipping_fee', value: String(order.shippingFee) },
            { display_name: 'Free Delivery', variable_name: 'free_delivery', value: order.isFreeDeliveryEligible ? 'Yes' : 'No' }
          ]
        }
      })
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData?.status) {
      pendingOrders.delete(reference)
      throw new Error(paystackData?.message || 'Failed to initialize Paystack transaction.')
    }

    return res.json({
      ok: true,
      reference,
      authorizationUrl: paystackData.data.authorization_url,
      accessCode: paystackData.data.access_code
    })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to initialize Paystack payment.' })
  }
})

app.post('/api/payments/paystack/verify', async (req, res) => {
  const { reference } = req.body || {}

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required.' })
  }

  try {
    const { secretKey } = getPaystackConfig()

    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    })

    const paystackData = await paystackResponse.json()

    if (!paystackResponse.ok || !paystackData?.status) {
      throw new Error(paystackData?.message || 'Unable to verify Paystack transaction.')
    }

    if (paystackData.data.status !== 'success') {
      return res.status(400).json({ error: `Payment not successful yet (status: ${paystackData.data.status}).` })
    }

    const result = await finalizePaidOrder({
      reference,
      paymentMethod: 'Paystack',
      paymentTransactionId: paystackData.data.reference
    })

    return res.json(result)
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to verify Paystack payment.' })
  }
})

app.post('/api/payments/solana/create', upload.single('modelFile'), async (req, res) => {
  try {
    const order = buildOrderFromRequest(req)
    const { recipientAddress } = getSolanaConfig()
    const solToNgnRate = await getLiveSolToNgnRate()

    const amountSol = Number((order.grandTotal / solToNgnRate).toFixed(6))

    if (!Number.isFinite(amountSol) || amountSol <= 0) {
      throw new Error('Invalid order amount for Solana payment.')
    }

    const referencePublicKey = Keypair.generate().publicKey
    const reference = referencePublicKey.toBase58()
    const memo = `VC-${randomUUID().slice(0, 8).toUpperCase()}`
    const paymentUrl = `solana:${recipientAddress}?amount=${amountSol}&reference=${reference}&label=${encodeURIComponent('Voltcraft 3D Printing')}&message=${encodeURIComponent('3D print order payment')}&memo=${memo}`
    const referenceNumber = `VC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomUUID().slice(0, 6).toUpperCase()}`

    pendingOrders.set(reference, {
      provider: 'solana',
      order,
      referenceNumber,
      expectedLamports: Math.round(amountSol * LAMPORTS_PER_SOL),
      recipientAddress,
      createdAt: Date.now()
    })

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(paymentUrl)}`

    return res.json({
      ok: true,
      reference,
      paymentUrl,
      qrUrl,
      amountSol,
      solToNgnRate
    })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create Solana payment request.' })
  }
})

app.post('/api/payments/solana/verify', async (req, res) => {
  const { reference } = req.body || {}

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required.' })
  }

  try {
    const pending = pendingOrders.get(reference)

    if (!pending) {
      if (paidOrders.has(reference)) {
        return res.json(paidOrders.get(reference))
      }

      throw new Error('Order session not found for this payment reference.')
    }

    if (pending.provider !== 'solana') {
      throw new Error('This payment reference is not a Solana invoice.')
    }

    const { rpcUrl } = getSolanaConfig()
    const connection = new Connection(rpcUrl, 'confirmed')
    const referenceKey = new PublicKey(reference)

    const signatures = await connection.getSignaturesForAddress(referenceKey, { limit: 20 })

    for (const signatureInfo of signatures) {
      const transaction = await connection.getParsedTransaction(signatureInfo.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed'
      })

      if (!transaction || transaction.meta?.err) {
        continue
      }

      if (hasMatchingRecipientTransfer(transaction, pending.recipientAddress, pending.expectedLamports)) {
        const result = await finalizePaidOrder({
          reference,
          paymentMethod: 'Solana Pay',
          paymentTransactionId: signatureInfo.signature
        })

        return res.json(result)
      }
    }

    return res.json({ paid: false, message: 'Payment not found yet. Please wait and verify again.' })
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to verify Solana payment.' })
  }
})

app.listen(port, () => {
  console.log(`Checkout API server is running on http://localhost:${port}`)
})
