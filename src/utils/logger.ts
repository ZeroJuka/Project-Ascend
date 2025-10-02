export const logger = {
  info: (...args: any[]) => { if (__DEV__) console.info(...args); },
  warn: (...args: any[]) => { if (__DEV__) console.warn(...args); },
  debug: (...args: any[]) => { if (__DEV__) (console.debug ? console.debug(...args) : console.log(...args)); },
  error: (...args: any[]) => { console.error(...args); },
};

export default logger;