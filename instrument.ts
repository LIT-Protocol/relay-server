// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node";

Sentry.init({
	dsn: process.env.LIT_RELAY_SENTRY_DSN,
	// Setting this option to true will send default PII data to Sentry.
	// For example, automatic IP address collection on events
	sendDefaultPii: true,
});
