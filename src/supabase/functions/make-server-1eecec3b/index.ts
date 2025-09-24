import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("EventHub server starting...")

// Simple in-memory storage
const data = {
  users: new Map(),
  events: new Map(),
  bookings: new Map(),
  userEmails: new Map(),
  initialized: false
}

// Initialize sample data
function initializeData() {
  if (data.initialized) return
  
  console.log("Initializing sample data...")
  
  // Test user
  const testUserId = "test-user-123"
  const testUser = {
    id: testUserId,
    email: 'test@example.com',
    password: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password123'
    firstName: 'Test',
    lastName: 'User',
    isAdmin: false,
    createdAt: new Date().toISOString(),
  }
  data.users.set(testUserId, testUser)
  data.userEmails.set('test@example.com', testUserId)

  // Admin user
  const adminUserId = "admin-user-123"
  const adminUser = {
    id: adminUserId,
    email: 'admin@example.com',
    password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // 'admin123'
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    createdAt: new Date().toISOString(),
  }
  data.users.set(adminUserId, adminUser)
  data.userEmails.set('admin@example.com', adminUserId)

  // Sample events
  const events = [
    {
      id: '1',
      title: 'React Developer Conference 2025',
      description: 'Join us for the biggest React conference of the year! Learn about the latest features, best practices, and connect with fellow developers.',
      dateTime: '2025-03-15T10:00:00Z',
      location: 'San Francisco Convention Center',
      type: 'Conference',
      totalTickets: 500,
      availableTickets: 350,
      price: 299.99,
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: '2',
      title: 'Jazz Night at Blue Note',
      description: 'An intimate evening of smooth jazz featuring renowned musicians from around the world.',
      dateTime: '2025-02-28T20:00:00Z',
      location: 'Blue Note Jazz Club, NYC',
      type: 'Concert',
      totalTickets: 150,
      availableTickets: 75,
      price: 85.00,
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    },
    {
      id: '3',
      title: 'Digital Marketing Workshop',
      description: 'Master the art of digital marketing with hands-on workshops covering SEO, social media, and content strategy.',
      dateTime: '2025-03-05T09:00:00Z',
      location: 'Downtown Business Center',
      type: 'Workshop',
      totalTickets: 50,
      availableTickets: 25,
      price: 150.00,
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
    }
  ]

  events.forEach(event => data.events.set(event.id, event))
  data.initialized = true
  console.log("Sample data initialized successfully")
}

// Hash password
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Generate simple token
function generateToken(userId: string): string {
  return btoa(JSON.stringify({ userId, exp: Date.now() + 24 * 60 * 60 * 1000 }))
}

// Verify token
function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = JSON.parse(atob(token))
    if (!decoded.userId || decoded.exp < Date.now()) return null
    return { userId: decoded.userId }
  } catch {
    return null
  }
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    initializeData()
    
    const url = new URL(req.url)
    const path = url.pathname

    console.log(`${req.method} ${path}`)

    // Health check
    if (path.endsWith('/health')) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'EventHub API is running',
          timestamp: new Date().toISOString(),
          endpoints: ['health', 'events', 'signin', 'signup', 'bookings']
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get events
    if (path.endsWith('/events') && req.method === 'GET') {
      const events = Array.from(data.events.values())
      return new Response(
        JSON.stringify({ events }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get single event
    if (path.includes('/events/') && req.method === 'GET') {
      const eventId = path.split('/events/')[1]
      const event = data.events.get(eventId)
      
      if (!event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ event }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sign up
    if (path.endsWith('/signup') && req.method === 'POST') {
      const { email, password, firstName, lastName } = await req.json()
      
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (data.userEmails.has(email)) {
        return new Response(
          JSON.stringify({ error: 'User already exists with this email' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = crypto.randomUUID()
      const hashedPassword = await hashPassword(password)
      
      const user = {
        id: userId,
        email,
        password: hashedPassword,
        firstName: firstName || '',
        lastName: lastName || '',
        isAdmin: false,
        createdAt: new Date().toISOString(),
      }

      data.users.set(userId, user)
      data.userEmails.set(email, userId)

      const token = generateToken(userId)
      
      return new Response(
        JSON.stringify({ 
          user: { 
            id: userId, 
            email, 
            firstName: firstName || '', 
            lastName: lastName || '',
            isAdmin: false
          }, 
          token 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sign in
    if (path.endsWith('/signin') && req.method === 'POST') {
      const { email, password } = await req.json()
      
      if (!email || !password) {
        return new Response(
          JSON.stringify({ error: 'Email and password are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userId = data.userEmails.get(email)
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const user = data.users.get(userId)
      if (!user) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const hashedPassword = await hashPassword(password)
      if (user.password !== hashedPassword) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = generateToken(userId)
      
      return new Response(
        JSON.stringify({ 
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName,
            isAdmin: user.isAdmin || false
          }, 
          token 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Social authentication
    if (path.endsWith('/auth/social') && req.method === 'POST') {
      const { provider } = await req.json()
      
      if (!provider || !['google', 'facebook', 'github'].includes(provider)) {
        return new Response(
          JSON.stringify({ error: 'Valid provider (google, facebook, github) is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Simulate OAuth flow with mock data
      const mockSocialUsers = {
        google: {
          email: 'user@gmail.com',
          firstName: 'Google',
          lastName: 'User',
          id: 'google-user-123'
        },
        facebook: {
          email: 'user@facebook.com',
          firstName: 'Facebook',
          lastName: 'User',
          id: 'facebook-user-123'
        },
        github: {
          email: 'user@github.com',
          firstName: 'GitHub',
          lastName: 'User',
          id: 'github-user-123'
        }
      }

      const socialUserData = mockSocialUsers[provider]
      
      // Check if social user already exists
      let userId = data.userEmails.get(socialUserData.email)
      
      if (!userId) {
        // Create new user from social data
        userId = socialUserData.id
        const user = {
          id: userId,
          email: socialUserData.email,
          password: '', // No password for social users
          firstName: socialUserData.firstName,
          lastName: socialUserData.lastName,
          isAdmin: false,
          createdAt: new Date().toISOString(),
        }

        data.users.set(userId, user)
        data.userEmails.set(socialUserData.email, userId)
      }

      const user = data.users.get(userId)
      const token = generateToken(userId)
      
      return new Response(
        JSON.stringify({ 
          user: { 
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName,
            isAdmin: user.isAdmin || false
          }, 
          token 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create booking
    if (path.endsWith('/bookings') && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      if (!payload) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { eventId, quantity, totalAmount } = await req.json()
      
      if (!eventId || !quantity || quantity < 1) {
        return new Response(
          JSON.stringify({ error: 'Event ID and valid quantity are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const event = data.events.get(eventId)
      if (!event) {
        return new Response(
          JSON.stringify({ error: 'Event not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (event.availableTickets < quantity) {
        return new Response(
          JSON.stringify({ error: `Not enough tickets available. Only ${event.availableTickets} tickets left.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const bookingId = crypto.randomUUID()
      const booking = {
        id: bookingId,
        userId: payload.userId,
        eventId,
        quantity,
        totalPrice: totalAmount || (event.price * quantity),
        bookingDate: new Date().toISOString(),
        status: 'Confirmed'
      }

      // Update event availability
      event.availableTickets -= quantity
      data.events.set(eventId, event)
      data.bookings.set(bookingId, booking)
      
      return new Response(
        JSON.stringify({ 
          success: true,
          booking: {
            ...booking,
            event: {
              title: event.title,
              dateTime: event.dateTime,
              location: event.location
            }
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user bookings
    if (path.endsWith('/user/bookings') && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      if (!payload) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const userBookings = Array.from(data.bookings.values())
        .filter(booking => booking.userId === payload.userId)
        .map(booking => {
          const event = data.events.get(booking.eventId)
          return {
            ...booking,
            event: event ? {
              title: event.title,
              dateTime: event.dateTime,
              location: event.location,
              imageUrl: event.imageUrl
            } : null
          }
        })
      
      return new Response(
        JSON.stringify({ bookings: userBookings }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Admin endpoints
    if (path.includes('/admin/')) {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      if (!payload) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const user = data.users.get(payload.userId)
      if (!user || !user.isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Admin stats
      if (path.endsWith('/admin/stats')) {
        const totalRevenue = Array.from(data.bookings.values())
          .reduce((sum, booking) => sum + booking.totalPrice, 0)
        
        const activeEvents = Array.from(data.events.values())
          .filter(event => event.availableTickets > 0).length

        return new Response(
          JSON.stringify({
            totalEvents: data.events.size,
            totalBookings: data.bookings.size,
            totalRevenue,
            activeEvents
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Admin events
      if (path.endsWith('/admin/events')) {
        if (req.method === 'GET') {
          const events = Array.from(data.events.values()).map(event => {
            const eventBookings = Array.from(data.bookings.values())
              .filter(booking => booking.eventId === event.id)
            const bookingsCount = eventBookings.reduce((sum, booking) => sum + booking.quantity, 0)
            
            return {
              ...event,
              bookingsCount,
              status: event.availableTickets > 0 ? 'active' : 'sold-out',
              category: event.type,
              capacity: event.totalTickets,
              createdAt: new Date().toISOString(),
              date: event.dateTime
            }
          })

          return new Response(
            JSON.stringify({ events }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (req.method === 'POST') {
          const { title, description, date, location, price, capacity, category, imageUrl, status } = await req.json()
          
          if (!title || !date || !location || price === undefined) {
            return new Response(
              JSON.stringify({ error: 'Title, date, location, and price are required' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          
          const eventId = crypto.randomUUID()
          const event = {
            id: eventId,
            title,
            description: description || '',
            dateTime: new Date(date).toISOString(),
            location,
            type: category || 'General',
            totalTickets: capacity || 100,
            availableTickets: capacity || 100,
            price: parseFloat(price),
            imageUrl: imageUrl || '',
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          
          data.events.set(eventId, event)
          
          return new Response(
            JSON.stringify({ success: true, event }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Default response
    return new Response(
      JSON.stringify({ 
        message: 'EventHub API',
        path,
        method: req.method,
        availableEndpoints: ['/health', '/events', '/signin', '/signup', '/auth/social', '/bookings', '/user/bookings', '/admin/stats', '/admin/events']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})