# Testing Strategy & Quality Assurance

This project adheres to strict quality standards to ensure reliability, security, and performance.

## 1. Unit Testing (Vitest)
We use **Vitest** for unit testing utility functions and complex logic.

### Running Tests
```bash
npm test
# or
npx vitest run
```

### Coverage
- **Cryptography:** `lib/crypto.ts` is fully tested to ensure PIN hashing is consistent and salted correctly.
- **Utilities:** `lib/utils.ts` (Planned)

## 2. End-to-End Testing (Playwright)
We use **Playwright** for E2E testing to simulate real user scenarios.

### Setup
```bash
npx playwright install
```

### Running Tests
```bash
npm run test:e2e
```

### Critical User Flows
- **Landing Page:** Verifies title and "Create Squad" CTA.
- **Group Creation:** (Planned) Simulates creating a group and getting the PIN.
- **Join Flow:** (Planned) Simulates joining via PIN.

## 3. Security & Headers
The application is configured with "State of the Art" security headers in `next.config.ts`:
- **CSP (Content Security Policy):** Restricts script/style sources.
- **HSTS:** Enforces HTTPS.
- **X-Frame-Options:** Prevents clickjacking.

## 4. Performance & PWA
- **Manifest:** `public/manifest.json` enables "Add to Home Screen".
- **Viewport:** Optimized for mobile responsiveness.
- **Fonts:** Self-hosted via `next/font`.

## 5. Accessibility (A11y)
- Semantic HTML structure.
- ARIA labels on interactive inputs.
- High contrast "Dark Mode" theme.
