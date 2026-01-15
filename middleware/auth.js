import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * JWT Authentication Middleware
 * Validates the token from Authorization header
 * Attaches user info to req.user if valid
 */
export const authenticate = async (req, res, next) => {
  try {
    let authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    let token;

    // Case 1: Proper string header
    if (typeof authHeader === 'string') {
      authHeader = authHeader.trim();

      // Bearer token
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7).trim();
      }
      // Raw token (fallback)
      else if (authHeader.split('.').length === 3) {
        token = authHeader;
      }
      // JSON string
      else {
        try {
          const parsed = JSON.parse(authHeader);
          token = parsed.token;
        } catch {
          return res.status(401).json({
            error: 'Invalid Authorization header format.',
            code: 'INVALID_FORMAT'
          });
        }
      }
    }

    // Case 2: Header came as an object
    if (typeof authHeader === 'object' && authHeader !== null) {
      token = authHeader.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. Token missing or malformed.',
        code: 'MALFORMED_TOKEN'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        error: 'User not found. Token is invalid.',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication failed.',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is valid, but doesn't block if no token
 * Useful for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user) {
      req.user = user;
      req.userId = decoded.userId;
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Role-based authorization middleware
 * Use after authenticate middleware
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

export default { authenticate, optionalAuth, authorize };
