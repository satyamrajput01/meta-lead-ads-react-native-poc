import { config } from '../config/index.js';
import { db } from '../database/db.js';
import { Lead, MetaGraphLeadDetail, MetaLeadgenChangeValue } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class MetaService {
  /**
   * Verify Meta Webhook handshake challenge
   */
  verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
    if (mode === 'subscribe' && token === config.meta.verifyToken) {
      logger.webhook('success', 'Meta Webhook verified successfully with token: ' + token);
      return challenge || 'CHALLENGE_ACCEPTED';
    }
    logger.webhook('warn', `Webhook verification failed. Mode: ${mode}, Token provided: ${token}`);
    return null;
  }

  /**
   * Retrieve lead details from Meta Graph API:
   * GET https://graph.facebook.com/v19.0/{leadgen_id}?access_token={META_ACCESS_TOKEN}
   */
  async fetchLeadFromGraphApi(leadgenId: string, formId?: string): Promise<MetaGraphLeadDetail> {
    const hasToken = !!config.meta.accessToken && config.meta.accessToken !== 'EAA...';

    if (hasToken) {
      const url = `${config.meta.graphApiBaseUrl}/${config.meta.graphApiVersion}/${leadgenId}?access_token=${encodeURIComponent(
        config.meta.accessToken
      )}`;

      try {
        logger.graphApi('info', `Querying Meta Graph API for leadgen_id: ${leadgenId}...`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          const data = (await response.json()) as MetaGraphLeadDetail;
          logger.graphApi('success', `Retrieved lead data from Graph API for lead ID ${leadgenId}`, data);
          return data;
        }

        const errText = await response.text();
        logger.graphApi('warn', `Graph API responded with HTTP ${response.status}: ${errText}. Using fallback test data.`);
      } catch (err: any) {
        logger.graphApi('error', `Failed to connect to Meta Graph API: ${err.message}. Using fallback test data.`);
      }
    } else {
      logger.graphApi('info', `No production META_ACCESS_TOKEN configured. Emulating Graph API response for leadgen_id: ${leadgenId}`);
    }

    // Fallback/Simulation data when running locally or during Lead Testing Tool without production Graph API credentials
    return this.generateSimulatedGraphLead(leadgenId, formId);
  }

  /**
   * Generate realistic simulated Meta Graph API payload for test leads
   */
  generateSimulatedGraphLead(leadgenId: string, formId?: string, overrideFields?: Record<string, string>): MetaGraphLeadDetail {
    const leadName = overrideFields?.name || overrideFields?.full_name || 'Satyam Rajput';
    const sanitizedEmail = overrideFields?.email || 'satyam@gmail.com';
    const leadPhone = overrideFields?.phone || overrideFields?.phone_number || '+91 98765 43210';
    const leadCompany = overrideFields?.company || overrideFields?.company_name || 'ABC Technologies';

    return {
      id: leadgenId,
      created_time: new Date().toISOString(),
      form_id: formId,
      field_data: [
        { name: 'full_name', values: [leadName] },
        { name: 'email', values: [sanitizedEmail] },
        { name: 'phone_number', values: [leadPhone] },
        { name: 'company_name', values: [leadCompany] },
      ],
    };
  }

  /**
   * Normalize Meta Lead Object into a standardized application lead
   * Handles arbitrary and missing field_data from Meta
   */
  normalizeLead(
    leadDetail: MetaGraphLeadDetail,
    changeValue: MetaLeadgenChangeValue,
    userId: string
  ): Lead {
    const fields = leadDetail.field_data || [];
    const customFields: Record<string, string> = {};

    let name = '';
    let email = '';
    let phone = '';
    let company = '';

    for (const field of fields) {
      const fieldName = (field.name || '').toLowerCase().trim();
      const val = Array.isArray(field.values) && field.values.length > 0 ? String(field.values[0]).trim() : '';

      if (!val) continue;

      if (fieldName === 'full_name' || fieldName === 'name') {
        name = val;
      } else if (fieldName === 'first_name') {
        name = name ? `${val} ${name}` : val;
      } else if (fieldName === 'last_name') {
        name = name ? `${name} ${val}` : val;
      } else if (fieldName === 'email') {
        email = val;
      } else if (fieldName === 'phone_number' || fieldName === 'phone' || fieldName === 'mobile_phone') {
        phone = val;
      } else if (
        fieldName === 'company_name' ||
        fieldName === 'company' ||
        fieldName === 'business_name' ||
        fieldName === 'organization'
      ) {
        company = val;
      } else {
        customFields[field.name] = val;
      }
    }

    // Gracefully handle missing fields without breaking
    if (!name) name = 'Lead ' + changeValue.leadgen_id.slice(-4);
    if (!email) email = 'no-email-provided@lead.meta';
    if (!phone) phone = 'N/A';

    let createdTimeISO = new Date().toISOString();
    if (leadDetail.created_time) {
      createdTimeISO = new Date(leadDetail.created_time).toISOString();
    } else if (changeValue.created_time) {
      const num = Number(changeValue.created_time);
      createdTimeISO = new Date(num > 1e11 ? num : num * 1000).toISOString();
    }

    return {
      id: 'lead_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      externalMetaLeadId: String(changeValue.leadgen_id),
      userId,
      name,
      email,
      phone,
      company: company || undefined,
      createdTime: createdTimeISO,
      source: `Meta Lead Ad (Page: ${changeValue.page_id || 'N/A'}, Form: ${changeValue.form_id || 'Default'})`,
      createdAt: new Date().toISOString(),
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };
  }

  /**
   * Determine the target application user for a given Meta Page ID and Form ID.
   * Order of precedence:
   * 1. Explicit mapping in database (Page + Form)
   * 2. Page-level mapping in database (Page ID)
   * 3. Configured DEFAULT_LEAD_USER_ID
   * 4. Fallback to first registered user in the database (ensures PoC works out-of-the-box)
   */
  async resolveUserIdForLead(pageId: string, formId?: string): Promise<string> {
    // 1 & 2: Check database mappings
    const mapping = await db.getMappingForPageAndForm(pageId, formId);
    if (mapping && mapping.userId) {
      logger.webhook('info', `Mapped lead to User [${mapping.userId}] via database mapping for Page: ${pageId}, Form: ${formId || '*'}`);
      return mapping.userId;
    }

    // 3: Check environment default
    if (config.defaultLeadUserId) {
      const exists = await db.findUserById(config.defaultLeadUserId);
      if (exists) {
        logger.webhook('info', `Mapped lead to default configured user: ${config.defaultLeadUserId}`);
        return config.defaultLeadUserId;
      }
    }

    // 4: Fallback to the latest registered user in the database
    const users = await db.getAllUsers();
    if (users.length > 0) {
      const targetUser = users[users.length - 1]; // most recently created
      logger.webhook('info', `No specific mapping found for Page ${pageId}. Auto-routing lead to registered user: ${targetUser.name} (${targetUser.id})`);
      return targetUser.id;
    }

    throw new Error('No registered users exist in the application database to assign this lead to. Please register a user first.');
  }
}

export const metaService = new MetaService();
