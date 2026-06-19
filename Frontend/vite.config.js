import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward API calls to the backend during local development.
      '/api': {
        // Use 127.0.0.1 (not "localhost") so the proxy always connects over
        // IPv4. On Windows "localhost" can resolve to IPv6 (::1) first, which
        // causes intermittent "read ECONNRESET" proxy errors.
        target: 'http://127.0.0.1:4000',
        changeOrigin: true,
        // Keep connections short-lived to avoid stale keep-alive sockets
        // being reset by the backend.
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            console.error('[vite proxy] backend error:', err.message);
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error:
                    'Backend not reachable. Make sure the backend server is running on port 4000.',
                })
              );
            }
          });
        },
      },
    },
  },
});
