const isProd = process.env.NODE_ENV === 'production';

export function log(...args: unknown[]) {
  if (!isProd) {
    console.log(...args);
  }
}
