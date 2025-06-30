# Deployment Guide: GitHub to Cloudflare Workers

This guide will help you set up automatic deployment of your package tracker from GitHub to Cloudflare Workers.

## Prerequisites

1. A Cloudflare account with Workers enabled
2. A GitHub repository with this code
3. A Cloudflare D1 database created (already configured in `wrangler.toml`)

## Setup Steps

### 1. Get Your Cloudflare Credentials

You'll need two pieces of information from Cloudflare:

**Cloudflare API Token:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Custom token" template
4. Configure permissions:
   - Zone: Zone.read
   - Zone: Zone.zone.edit
   - Account: Cloudflare Workers.edit
   - Account: D1.edit
5. Set Account Resources to "Include - All accounts"
6. Click "Continue to summary" and "Create Token"
7. Copy the token (you won't see it again!)

**Cloudflare Account ID:**
1. Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select any domain or go to Workers & Pages
3. On the right sidebar, copy your "Account ID"

### 2. Set Up GitHub Secrets

In your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret" and add:
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: Your API token from step 1
3. Click "New repository secret" and add:
   - Name: `CLOUDFLARE_ACCOUNT_ID`
   - Value: Your Account ID from step 1
4. (Optional) Add your ingest key:
   - Name: `INGEST_KEY`
   - Value: A secure random string for API authentication

### 3. Configure Environment Variables in Cloudflare

If you need to set environment variables (like `INGEST_KEY`):

1. Go to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/workers)
2. Click on your worker (it will be created after first deployment)
3. Go to Settings → Variables
4. Add environment variables as needed:
   - Variable name: `INGEST_KEY`
   - Value: Your secure key

### 4. Set Up D1 Database

Your database is already configured in `wrangler.toml`, but you may need to create it:

```bash
# If you need to create the database locally first
wrangler d1 create package-tracker-db

# Run migrations
npm run db:migrate
```

### 5. Deploy

Once everything is set up:

1. Push your code to the `main` or `master` branch
2. GitHub Actions will automatically:
   - Install dependencies
   - Run database migrations
   - Deploy your worker

## Manual Deployment

You can also deploy manually using:

```bash
# Install dependencies
npm install

# Deploy
npm run deploy

# Or run migrations separately
npm run db:migrate
```

## API Endpoints

After deployment, your worker will be available at `https://package-tracker.your-subdomain.workers.dev` with these endpoints:

- `GET /event?pkg=PACKAGE_NAME&type=install` - Track a package event
- `GET /ingest?pkg=PACKAGE_NAME&type=install&count=100&key=YOUR_KEY` - Bulk ingest data
- `GET /totals?pkg=PACKAGE_NAME` - Get totals for a package
- `GET /all-totals?key=YOUR_KEY` - Get all package totals

## Troubleshooting

- **Database errors**: Make sure your D1 database exists and migrations have run
- **Authentication errors**: Check that your API token has the correct permissions
- **Deployment fails**: Verify your secrets are set correctly in GitHub
- **Worker not found**: The worker URL will be available after the first successful deployment

## Monitoring

You can monitor your deployments:
- GitHub Actions: Check the Actions tab in your repository
- Cloudflare: Monitor logs in the Workers dashboard 