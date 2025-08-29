import { jwtVerify } from 'jose'

export const authenticateToken = async (req, res, next) => {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing authorization token' })
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    req.user = { id: payload.userId }
    return next()
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

export const requireRole = (roles = []) => (req, res, next) => {
  // Placeholder; typically you'd fetch the user role from DB using req.user.id.
  // To keep middleware stateless, routes should load user and authorize.
  next()
}
