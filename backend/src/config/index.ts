import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'meta_leads_jwt_secret_dev_2026',
  jwtExpiresIn: '7d',
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || 'meta_lead_ads_poc_verify_secret_token_123',
    accessToken: process.env.META_ACCESS_TOKEN || '',
    pageId: process.env.META_PAGE_ID || '109823478912345',
    appSecret: process.env.META_APP_SECRET || '',
    graphApiVersion: 'v19.0',
    graphApiBaseUrl: 'https://graph.facebook.com',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./data/leads_poc.db',
  },
  defaultLeadUserId: process.env.DEFAULT_LEAD_USER_ID || '',
};
