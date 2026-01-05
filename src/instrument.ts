// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

// Only initialize Sentry if not in development environment
if (process.env.NODE_ENV !== 'dev') {
  Sentry.init({
    dsn: 'https://5778acfc955d3eff4acbbaa1d8cd0270@o4510023566688256.ingest.us.sentry.io/4510657966243840',
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    integrations: [
      // send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ['log', 'warn', 'error'] }),
    ],
    // Enable logs to be sent to Sentry
    enableLogs: true,
  });
}
