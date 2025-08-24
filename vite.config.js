import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configure plugin-react to run Babel with TypeScript preset that strips types
// even in .jsx files (isTSX + allExtensions). This lets us keep src/app.jsx
// as-is while removing TS-only syntax during build.
export default defineConfig({
  plugins: [react()],
  base: '/regex-gui/'
});
