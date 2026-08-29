import { Request, Response, NextFunction } from 'express';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Lazy initialization of Firebase Admin to avoid crashes if service account is not supplied
let adminInitialized = false;

function initFirebaseAdmin(): App | null {
  if (adminInitialized && getApps().length > 0) {
    return getApps()[0];
  }
  try {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.VITE_FIREBASE_PROJECT_ID ||
      'optimum-terra-3nm8c';
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    let app: App;
    if (clientEmail && privateKey) {
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      adminInitialized = true;
      console.log('Firebase Admin initialized with service account.');
    } else {
      // Default initialization with project ID
      app = initializeApp({
        projectId,
      });
      adminInitialized = true;
      console.log('Firebase Admin initialized with default project:', projectId);
    }
    return app;
  } catch (err: any) {
    if (getApps().length > 0) {
      adminInitialized = true;
      return getApps()[0];
    }
    console.warn('Firebase Admin initialization notice:', err?.message || err);
    return null;
  }
}

/**
 * Verifies Firebase ID Token using Admin SDK or Google OAuth2 TokenInfo endpoint.
 * This guarantees cryptographic verification of the user's identity without relying
 * on client-supplied userIds.
 */
export async function verifyFirebaseToken(idToken: string): Promise<AuthenticatedUser | null> {
  // Try Firebase Admin SDK verification if available
  try {
    const app = initFirebaseAdmin();
    if (app && getApps().length > 0) {
      const decoded = await getAuth(app).verifyIdToken(idToken);
      if (decoded && decoded.uid) {
        return {
          uid: decoded.uid,
          email: decoded.email || '',
          name: decoded.name || decoded.displayName || '',
          picture: decoded.picture || '',
        };
      }
    }
  } catch (adminErr: any) {
    // If admin SDK verification had an auth error (e.g. no local service account credentials),
    // proceed to Google's public tokeninfo verification endpoint
  }

  // Fallback to Google TokenInfo verification
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    );
    if (res.ok) {
      const data: any = await res.json();
      if (data.sub) {
        return {
          uid: data.sub,
          email: data.email || '',
          name: data.name || '',
          picture: data.picture || '',
        };
      }
    }
  } catch (fetchErr) {
    console.error('Failed to verify token with Google TokenInfo:', fetchErr);
  }

  return null;
}

/**
 * Express Middleware to enforce authentication
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid Authorization header. Expected Bearer token.',
      });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized: Empty token provided.',
      });
    }

    const user = await verifyFirebaseToken(token);
    if (!user || !user.uid) {
      return res.status(401).json({
        error: 'Unauthorized: Invalid or expired Firebase ID token.',
      });
    }

    // Attach authenticated identity to request context
    req.user = user;
    next();
  } catch (err: any) {
    console.error('Authentication middleware error:', err);
    return res.status(401).json({
      error: 'Authentication failed. Please re-authenticate.',
    });
  }
}
