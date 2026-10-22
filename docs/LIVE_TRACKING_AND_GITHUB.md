# NUCLEA ERP — Live Tracking, Email and GitHub Team Workflow

## 1. Prepare a clean local development copy

1. Extract the ERP ZIP into a fresh folder.
2. Install Node.js LTS and PostgreSQL. In the project folder run `npm install`.
3. Copy `.env.example` to `.env`. On Windows Command Prompt use `copy .env.example .env`; in PowerShell use `Copy-Item .env.example .env`.
4. Edit `.env` with your local PostgreSQL credentials and a new random `SESSION_SECRET` (at least 32 characters). Do not commit `.env`.
5. Run `npm test`, then `npm start`. Open `http://localhost:3000`.
6. The development-only seed account may be created if the database is empty: `admin@ims.com` / `admin123`. Change its password immediately and never use that seed account on an internet-facing deployment. In production mode the application does not seed this account.

Use a separate staging database for testing. The ERP startup runs schema migrations; back up an existing database before upgrading it.

## 2. Configure outgoing email

The email layer uses SMTP. In `.env`, configure all of these values using credentials from your organization's mail administrator or provider:

```env
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailbox-or-smtp-user
SMTP_PASS=your-smtp-password-or-app-password
SMTP_FROM=NUCLEA ERP <noreply@your-domain.example>
APP_BASE_URL=http://localhost:3000
```

For port 465 set `SMTP_SECURE=true`; for the usual STARTTLS setup on port 587 use `SMTP_SECURE=false`. Use a provider-approved SMTP/app password, not your normal mailbox password if the provider requires app passwords. Restart Node after changing `.env`.

When SMTP is configured, role/user-specific workflow notifications, email verification and login 2FA codes are delivered to the registered address. In-app items can be marked read individually or per account; one user cannot mark another user’s alert as read. If running in development without SMTP, OTPs are written to the Node terminal for local testing only. A production environment without SMTP deliberately cannot complete email OTP flows.

## 3. Trial Live Tracking

Live Tracking is a browser GPS feature, not a native background tracker. It only accepts GPS from the driver assigned to an `IN_TRANSIT` delivery.

1. Log in as a user allowed to prepare Distribution.
2. Select a delivery plan whose production batch has a completed QA Release. Create the e-DO and assign an active Driver/Logistics user, vehicle and route.
3. Complete the pre-departure fleet readiness checklist, record the radiation measurement, and have a different authorized user verify the measurement. Record handover/seal details and dispatch the delivery. The delivery status must become `IN_TRANSIT`.
4. On the driver's phone, log in using the assigned driver account and open `/driver/mobile` (for local testing on the same computer use `http://localhost:3000/driver/mobile`).
5. Tap **Start Tracking** for the assigned delivery. Allow location access in the browser and keep the page open while moving. The app sends a GPS update roughly every five seconds while the page is active.
6. On an authorized supervisor/SCM device, open `/driver/mobile` too. The map refreshes automatically and shows the latest received position. Use **Locate** on the delivery card to focus the marker. Press **Stop Tracking** on the driver device when the trial ends.

Important: modern browsers permit geolocation on `localhost` or a trusted HTTPS origin. A phone visiting `http://192.168.x.x:3000` usually will not be allowed to share GPS because that is not a secure context. For phone trials, use a secured HTTPS staging deployment or a temporary HTTPS tunnel to a test instance. Never expose a production ERP or real personal/operational data through an ad-hoc tunnel. A browser may stop GPS updates when the page is backgrounded, the device locks, battery saver activates, or permissions are revoked.

If the delivery list is empty, confirm the delivery is actually `IN_TRANSIT`, a driver is assigned to it, and you are signed in as that driver to send coordinates. Other authorized users may view positions, but cannot send coordinates for another driver.

## 4. GitHub repository for collaboration

GitHub stores and versions code; it does not run this Express/EJS/PostgreSQL server as a live website by itself. GitHub Pages is for static sites and cannot run the ERP backend or connect to PostgreSQL.

### Initial upload

1. Create a **Private** repository on GitHub.
2. Use a clean project folder that does not contain `.env`, `node_modules/`, private uploads, database dumps or real customer/manufacturing data. This handoff ZIP omits `.env` and `node_modules/` intentionally.
3. In the project folder run:

```bash
git init
git add .
git status
git commit -m "Initial NUCLEA ERP project"
git branch -M main
git remote add origin https://github.com/YOUR-ORG/YOUR-REPOSITORY.git
git push -u origin main
```

4. Review the output of `git status` before committing. `.env` and `private_uploads/` should not be listed. If `.env` was committed earlier, `.gitignore` alone will not remove it from history; rotate the database password, session secret and any SMTP credentials that were exposed.

### Work with the team

- Add collaborators in the repository's **Settings → Collaborators**.
- Ask each team member to clone the repo, create a branch (for example `feature/notifications`), commit changes and push the branch.
- Open a Pull Request to `main`, run `npm test`, review the diff, then merge only after another team member approves.
- Keep separate `.env` files per developer and use separate staging database credentials. Don't share local database dumps or real GMP/manufacturing/customer data through GitHub issues or public repositories.

### View it like `localhost:3000`

For a temporary preview, use **GitHub Codespaces**: open the repo → **Code** → **Codespaces** → create a codespace; run `npm install`, configure its environment variables and staging database, then `npm start`. In the **Ports** tab, open port `3000` in the browser. Codespaces forwards the port over HTTPS, which is also much more suitable for testing phone geolocation. Keep the port private and use dummy/test data.

For a persistent shared preview, deploy the Node app to a service that supports Express (for example Render or Railway) and connect a managed PostgreSQL database. Configure secrets in that service's environment-variable settings, run migrations against the staging DB, and keep the staging URL private. Do not expect a `github.io` Pages URL to run this backend.

## 5. Acceptance check before real use

Run `npm test`, then manually test sign-in, email OTP, password change, in-app notification creation/read, approval notification recipients for each role, customer pricing/revenue, and the Live Tracking flow in a staging database. This package can be syntax/template-checked locally, but email delivery, database migrations, multi-role notification recipients and GPS must be acceptance-tested in your own environment. The ERP still requires formal process validation before use for controlled manufacturing or radiation safety decisions.
