'use strict';

const nodemailer = require('nodemailer');

function createNotificationService(pool) {
  let cachedTransport = null;
  let cachedConfigKey = '';

  function smtpConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM &&
      process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  function getTransport() {
    if (!smtpConfigured()) return null;
    const key = [process.env.SMTP_HOST, process.env.SMTP_PORT, process.env.SMTP_SECURE,
      process.env.SMTP_USER, process.env.SMTP_FROM].join('|');
    if (!cachedTransport || cachedConfigKey !== key) {
      const port = Number(process.env.SMTP_PORT || 587);
      cachedTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
      });
      cachedConfigKey = key;
    }
    return cachedTransport;
  }

  async function sendEmail(to, subject, text, html) {
    const transport = getTransport();
    if (!transport) return { sent: false, reason: 'SMTP is not configured' };
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text,
      html: html || `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text).replace(/\n/g, '<br>')}</p><p style="color:#667085;font-size:12px">NUCLEA ERP notification</p></div>`
    });
    return { sent: true };
  }

  async function installSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150), message TEXT, type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source VARCHAR(100);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_type VARCHAR(100);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id VARCHAR(120);
      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created
        ON notifications(user_id, is_read, created_at DESC);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_hash VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_hash VARCHAR(128);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_attempts INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS session_activity_seconds BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
    `);
  }

  function normalizePayload(payload = {}) {
    const actionUrl = typeof payload.actionUrl === 'string' && payload.actionUrl.startsWith('/') && !payload.actionUrl.startsWith('//')
      ? payload.actionUrl.slice(0, 500) : null;
    return {
      title: String(payload.title || 'NUCLEA ERP notification').slice(0, 150),
      message: String(payload.message || '').slice(0, 5000),
      type: ['info', 'success', 'warning', 'danger', 'approval'].includes(String(payload.type)) ? String(payload.type) : 'info',
      actionUrl,
      source: payload.source ? String(payload.source).slice(0, 100) : 'ERP_WORKFLOW',
      relatedType: payload.relatedType ? String(payload.relatedType).slice(0, 100) : null,
      relatedId: payload.relatedId == null ? null : String(payload.relatedId).slice(0, 120)
    };
  }

  async function notifyOne(userId, payload) {
    const userResult = await pool.query(`SELECT id,full_name,email,email_notif,push_notif,account_status,role
      FROM users WHERE id=$1`, [userId]);
    if (!userResult.rows.length) return { userId, inApp: false, email: false, skipped: true };
    const user = userResult.rows[0];
    if (String(user.account_status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return { userId, skipped: true };
    const p = normalizePayload(payload);
    let inApp = false, emailSent = false;
    if (user.push_notif !== false) {
      await pool.query(`INSERT INTO notifications(user_id,title,message,type,action_url,source,related_type,related_id,recipient_role)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [user.id,p.title,p.message,p.type,p.actionUrl,p.source,p.relatedType,p.relatedId,user.role || null]);
      inApp = true;
    }
    if (user.email_notif !== false && user.email) {
      try {
        const result = await sendEmail(user.email, p.title, `${p.message}${p.actionUrl ? `\n\nOpen ERP: ${process.env.APP_BASE_URL || 'http://localhost:3000'}${p.actionUrl}` : ''}`);
        emailSent = result.sent;
        if (!result.sent) console.warn(`[Email notification skipped] Configure SMTP to email ${user.email}.`);
      } catch (error) {
        console.error(`Email notification failed for user ${user.id}:`, error.message);
      }
    }
    return { userId, inApp, email: emailSent };
  }

  async function notifyUser(userId, payload) {
    try { return await notifyOne(Number(userId), payload); }
    catch (error) { console.error('Notification delivery failed:', error.message); return { error: error.message }; }
  }

  async function notifyRoles(roleKeywords, payload, excludeUserIds = []) {
    try {
      const all = await pool.query(`SELECT id,role,account_status FROM users WHERE upper(COALESCE(account_status,'ACTIVE'))='ACTIVE'`);
      const keys = (roleKeywords || []).map(x => String(x).toLowerCase());
      const excluded = new Set((excludeUserIds || []).map(Number));
      const recipients = all.rows.filter(user => {
        const role = String(user.role || '').toLowerCase();
        return !excluded.has(Number(user.id)) && keys.some(key => role.includes(key));
      });
      const out = [];
      for (const user of recipients) out.push(await notifyOne(user.id, payload));
      return out;
    } catch (error) {
      console.error('Role notification failed:', error.message);
      return [];
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { installSchema, smtpConfigured, sendEmail, notifyUser, notifyRoles };
}

module.exports = { createNotificationService };
