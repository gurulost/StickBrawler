# Online Multiplayer Deployment Guide

This guide covers deploying StickBrawler with online multiplayer support to external hosting providers with TLS.

## Prerequisites

- Deployed PostgreSQL database (Neon, Supabase, or other)
- TLS certificate for WebSocket connections (provided by hosting platform)
- Domain or subdomain for the application

## Environment Variables

Configure these environment variables in your deployment platform:

### Required for All Deployments
```bash
DATABASE_URL=postgresql://user:pass@host:5432/database
NODE_ENV=production
SESSION_SECRET=<generate-a-secure-random-32-char-string>
```

### Required for Online Multiplayer
```bash
ENABLE_ONLINE_MULTIPLAYER=true
ONLINE_WS_PORT=5001
```

### Client Build Variables
```bash
VITE_ONLINE_MATCH_URL=wss://your-domain.com:5001
```

## Deployment Options

### Option 1: Fly.io (Recommended)

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login to Fly**
   ```bash
   fly auth login
   ```

3. **Create fly.toml**
   Create a `fly.toml` file in the project root:
   ```toml
   app = "stickbrawler"
   primary_region = "iad"

   [build]
     [build.args]
       NODE_VERSION = "20"

   [env]
     NODE_ENV = "production"
     PORT = "5000"
     ONLINE_WS_PORT = "5001"
     ENABLE_ONLINE_MULTIPLAYER = "true"

   [[services]]
     internal_port = 5000
     protocol = "tcp"

     [[services.ports]]
       handlers = ["http"]
       port = 80

     [[services.ports]]
       handlers = ["tls", "http"]
       port = 443

   [[services]]
     internal_port = 5001
     protocol = "tcp"

     [[services.ports]]
       handlers = ["tls"]
       port = 5001

   [http_service]
     internal_port = 5000
     force_https = true
   ```

4. **Set Secrets**
   ```bash
   fly secrets set SESSION_SECRET=<your-secret-here>
   fly secrets set DATABASE_URL=<your-database-url>
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

6. **Get WebSocket URL**
   ```bash
   fly info
   # Use the hostname and append port 5001
   # Example: wss://stickbrawler.fly.dev:5001
   ```

### Option 2: Render

1. **Create New Web Service**
   - Connect your GitHub repository
   - Choose "Node" environment

2. **Configure Build Command**
   ```bash
   npm install && npm run build
   ```

3. **Configure Start Command**
   ```bash
   npm start
   ```

4. **Set Environment Variables**
   In Render dashboard, add:
   ```
   DATABASE_URL=<your-database-url>
   NODE_ENV=production
   SESSION_SECRET=<your-secret>
   ENABLE_ONLINE_MULTIPLAYER=true
   ONLINE_WS_PORT=5001
   ```

5. **Enable WebSocket Support**
   - Go to "Advanced" settings
   - Enable "WebSocket Support"

6. **Get WebSocket URL**
   - Use your Render service URL
   - Example: `wss://stickbrawler.onrender.com:5001`

### Option 3: Railway

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set DATABASE_URL=<your-database-url>
   railway variables set NODE_ENV=production
   railway variables set SESSION_SECRET=<your-secret>
   railway variables set ENABLE_ONLINE_MULTIPLAYER=true
   railway variables set ONLINE_WS_PORT=5001
   ```

5. **Deploy**
   ```bash
   railway up
   ```

## Client Configuration

After deploying the server, update your client build configuration:

1. **Create/Update .env.production**
   ```bash
   VITE_ONLINE_MATCH_URL=wss://your-deployed-url.com:5001
   ```

2. **Rebuild Client**
   ```bash
   npm run build
   ```

3. **Redeploy**
   The client will now connect to the production WebSocket server.

## Health Checks

Add a health endpoint for monitoring (recommended):

```typescript
// In server/routes.ts or server/index.ts
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    online_multiplayer: env.ENABLE_ONLINE_MULTIPLAYER,
    timestamp: new Date().toISOString()
  });
});
```

## Security Considerations

1. **CORS Configuration**
   - Ensure WebSocket server validates origin headers
   - Only allow connections from your deployed domain

2. **Rate Limiting**
   - Implement rate limiting for WebSocket connections
   - Prevent abuse from malicious clients

3. **Authentication**
   - Validate session tokens before allowing match joins
   - Use signed JWT or HMAC tokens for lobby access

4. **Input Validation**
   - Sanitize all incoming WebSocket messages
   - Validate frame numbers and input states

## Monitoring

Recommended monitoring tools:

- **Uptime**: Use UptimeRobot or similar to monitor /health endpoint
- **Errors**: Set up error tracking with Sentry or LogRocket
- **Performance**: Monitor WebSocket connection counts and latency
- **Database**: Monitor connection pool usage and query performance

## Troubleshooting

### WebSocket Connection Fails

1. Check firewall rules allow traffic on ONLINE_WS_PORT
2. Verify TLS certificate is valid for WebSocket connections
3. Check browser console for CORS errors
4. Ensure VITE_ONLINE_MATCH_URL matches deployed URL

### High Latency

1. Choose hosting region close to players
2. Enable CDN for static assets
3. Optimize database queries
4. Consider Redis for session storage

### Match Desyncs

1. Check server logs for frame timing issues
2. Verify deterministic runtime is working correctly
3. Enable telemetry logging for debugging
4. Test with fixed delta time (1/60)

## Scaling Considerations

For production with many concurrent players:

1. **Horizontal Scaling**
   - Use Redis for shared match state
   - Implement sticky sessions for WebSocket connections
   - Load balance across multiple server instances

2. **Database Optimization**
   - Use connection pooling
   - Index frequently queried fields
   - Consider read replicas for high traffic

3. **CDN**
   - Serve static assets through CDN
   - Cache API responses where appropriate

## Cost Estimates

### Fly.io
- Shared CPU (1x): ~$5/month
- Database: Use existing Neon/Supabase free tier
- Total: ~$5-10/month

### Render
- Starter plan: Free (with limitations)
- Standard plan: $7/month
- Database: Use existing free tier
- Total: $0-7/month

### Railway
- Starter plan: $5/month credit
- Pro plan: $20/month
- Database: Use existing free tier
- Total: ~$5-20/month

## Next Steps

1. Deploy backend to chosen platform
2. Configure environment variables
3. Update client with production WebSocket URL
4. Test with two remote clients
5. Monitor metrics and adjust as needed

For questions or issues, consult the main StickBrawler documentation or online multiplayer architecture docs.
