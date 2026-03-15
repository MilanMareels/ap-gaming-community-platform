export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret:
      process.env.JWT_SECRET_KEY ||
      (() => {
        throw new Error('JWT_SECRET_KEY environment variable is required');
      })(),
    expiresIn: process.env.JWT_EXPIRY || '1d',
  },
  session: {
    secret:
      process.env.SESSION_SECRET_KEY ||
      (() => {
        throw new Error('SESSION_SECRET_KEY environment variable is required');
      })(),
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  google: {
    clientId:
      process.env.GOOGLE_CLIENT_ID ||
      (() => {
        throw new Error('GOOGLE_CLIENT_ID environment variable is required');
      })(),
    clientSecret:
      process.env.GOOGLE_CLIENT_SECRET ||
      (() => {
        throw new Error('GOOGLE_CLIENT_SECRET environment variable is required');
      })(),
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      (() => {
        throw new Error('GOOGLE_REDIRECT_URI environment variable is required');
      })(),
    authUrl: process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    userInfoUrl: process.env.GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo',
  },
  auth: {
    cookieMaxAgeMs: Number(process.env.AUTH_COOKIE_MAX_AGE_MS || 86400000),
  },
});
