'use strict';
const assert = require('node:assert/strict');
const { createNotificationService } = require('../modules/notification-service');

async function main() {
  const inserts = [];
  const activeUsers = [
    { id: 11, role: 'SCM Staff', account_status: 'ACTIVE' },
    { id: 12, role: 'Production Operator', account_status: 'ACTIVE' }
  ];
  const userDetails = new Map(activeUsers.map(u => [u.id, {
    ...u, full_name: `User ${u.id}`, email: `user${u.id}@example.test`, email_notif: false, push_notif: true
  }]));
  const pool = {
    async query(sql, params = []) {
      const q = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      if (q.startsWith('select id,role,account_status from users')) return { rows: activeUsers };
      if (q.startsWith('select id,full_name,email,email_notif,push_notif,account_status,role from users where id=$1')) {
        const u = userDetails.get(Number(params[0]));
        return { rows: u ? [u] : [] };
      }
      if (q.startsWith('insert into notifications(')) {
        inserts.push({ sql: q, params });
        return { rows: [{ id: inserts.length }] };
      }
      throw new Error(`Unexpected SQL in notification test: ${q}`);
    }
  };
  const service = createNotificationService(pool);
  const result = await service.notifyRoles(['scm'], {
    title: 'Approval required', message: 'Please review the request.', type: 'approval',
    actionUrl: '/material-requisition', source: 'TEST', relatedType: 'REQUISITION', relatedId: 'R-1'
  });
  assert.equal(result.length, 1, 'notifications are sent only to users matching the requested role');
  assert.equal(result[0].userId, 11);
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].params[0], 11, 'notification must be linked to the recipient account');
  assert.equal(inserts[0].params[4], '/material-requisition', 'valid local action URLs are preserved');

  await service.notifyUser(11, { title: 'URL validation', message: 'Check action target', actionUrl: '//example.com' });
  assert.equal(inserts.length, 2);
  assert.equal(inserts[1].params[4], null, 'external protocol-relative URLs must be rejected');

  console.log('Notification service checks passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
