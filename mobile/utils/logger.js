// Tek log noktası. Production'da konsola hiçbir şey yazılmaz (e-posta/token gibi veriler sızmasın).
// Crash raporlama (ör. Sentry) eklerken sadece burayı değiştirmen yeterli.
export const logger = {
  error: (...args) => {
    if (__DEV__) console.error(...args);
    // Sentry.captureException(args.find((a) => a instanceof Error) ?? new Error(String(args[0])));
  },
  warn: (...args) => {
    if (__DEV__) console.warn(...args);
  },
  log: (...args) => {
    if (__DEV__) console.log(...args);
  },
};
