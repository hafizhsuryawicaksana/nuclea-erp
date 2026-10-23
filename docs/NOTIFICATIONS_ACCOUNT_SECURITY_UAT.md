# NUCLEA ERP — Notifications, Account and Security UAT

Use this checklist on a **staging database with test users and dummy data**. Do not use live production or controlled manufacturing data before formal validation.

## Configuration

1. Copy `.env.example` to `.env` and configure PostgreSQL (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`) or a hosted `DATABASE_URL`.
2. Set a random `SESSION_SECRET` of at least 32 characters.
3. Configure valid SMTP credentials for real email delivery. `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` must match the email provider. Use port 465 with `SMTP_SECURE=true`, or port 587 with STARTTLS and `SMTP_SECURE=false` as directed by the provider.
4. In development only, if SMTP is not configured, one-time codes may be written to the Node terminal. That is not email delivery. Production email OTP/verification requires working SMTP.
5. Run `npm install`, `npm test`, and `npm start`. Backup an existing database before allowing the application to perform schema migrations.

## User account and email tests

- Register a test account. It should start in `PENDING`, not receive automatic access to protected modules, and trigger an in-app notification for an administrator.
- As an administrator, assign an appropriate role and activate the account in Security Control. Confirm that the user receives an activation notice.
- Open My Account and request email verification. Confirm the one-time code arrives at the registered address and is rejected after expiry or after too many failed attempts.
- Request an email change and confirm it only updates the address after the new address is confirmed.
- Change password while logged in; verify the current password is required and password policy is enforced.
- Use Forgot Password from login. Confirm the reset code expires and cannot be used more than the allowed attempt count.
- Enable email-based two-factor authentication and test a fresh login. Confirm codes arrive via SMTP, expire, and are rate-limited.
- Test E-signature PIN separately. Do not treat email OTP or a PIN as an electronic signature workflow approval unless your process validation explicitly approves it.

## Notification role matrix smoke test

Create at least two separate test users per relevant role where practical. Confirm the notification appears for intended recipients only, is actionable, and one account cannot mark another user's item as read.

- Signup / pending account -> System Administrator or administrator.
- Purchase requisition -> designated finance/director/procurement approver; after decision, requester.
- Material requisition -> SCM / supply-chain / warehouse approver; requester is notified after decision.
- Production planning / work-order actions -> production/manufacturing role.
- Goods Receipt and QC -> QC/QA role; release status -> downstream production/SCM roles.
- Customer/vendor qualification -> reviewer; outcome -> requester.
- Asset transfer/disposal -> permitted asset approver; outcome -> requester.
- Production review / QC verification / QA release -> next authorized stage.
- Dispatch / e-POD -> assigned driver and authorized distribution/commercial/supply-chain roles.

Some actions are only emitted when a record successfully enters the appropriate workflow state. Test with valid preconditions and read the server log if a workflow action fails.

## Live Tracking acceptance test

1. Create a test delivery that has completed the prerequisites for dispatch and is linked to a batch/customer/leadpot as required by the Distribution module.
2. Assign an active test user as driver and a vehicle/route. Complete fleet-readiness fields; record and separately verify the radiation measurement; complete the internal handover/seal checklist.
3. Dispatch the delivery. Verify status is `IN_TRANSIT`.
4. On the assigned driver's phone, sign in and open `/driver/mobile` through an HTTPS staging URL. Press **Start Tracking** and grant location permission. Keep the page open while moving during the test.
5. On an authorized monitoring account/device, open `/driver/mobile` and confirm the latest point appears. The page refreshes periodically; allow internet access to the map tiles.
6. Press **Stop Tracking** at the end. Confirm a different user cannot send GPS points for the assigned driver and that GPS updates are refused for non-`IN_TRANSIT` deliveries.

GPS normally requires `localhost` or HTTPS. A phone opening `http://192.168.x.x:3000` will usually be blocked from sharing location. Background location is not guaranteed if a mobile browser is minimized or the device locks.

## GitHub and preview security

- Keep the repository private while developing. `.env`, `node_modules`, private uploads and database dumps must not be committed.
- Use GitHub Codespaces secrets or deployment environment settings for database and SMTP credentials. Never paste secret connection strings into source code, issues, commits, or chat.
- Codespaces must connect to a hosted/staging PostgreSQL endpoint or another database reachable from Codespaces; the PostgreSQL service at `localhost` on a developer's Windows PC is not automatically reachable.
- Use a separate staging database and keep the forwarded port private. Never expose an unvalidated ERP connected to real operational data over an ad-hoc public tunnel.

## Current verification status

Automated checks compile 55 EJS templates, check the main JavaScript modules, and run targeted notification service checks. Live PostgreSQL migrations, SMTP delivery, full multi-role workflow integration, and phone GPS must be verified in the target environment using the checklist above.
