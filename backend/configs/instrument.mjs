import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://f0eb017ff6c48499f6247b8fd0ee27fd@o4510951888519168.ingest.us.sentry.io/4510951909031936",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});