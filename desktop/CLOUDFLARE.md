# Deploy Excaliall to Cloudflare Pages

Production URL: **https://excaliall.davidgc.com**. Repository: [davidgcorr/excaliall](https://github.com/davidgcorr/excaliall).

## First deployment

Use Node.js 22.12 or newer. From the repository root:

```sh
corepack yarn install --frozen-lockfile
npx --yes wrangler@4.157.0 login
npx --yes wrangler@4.157.0 pages project create excaliall --production-branch=master --force
corepack yarn cloudflare:deploy
```

If the Pages project already exists, skip its creation. Wrangler asks you to select an account when more than one is available. `wrangler.toml` defines the project name and build output. The build bundles fonts locally and disables analytics and Sentry.

## Connect the subdomain

In Cloudflare, open **Workers & Pages → excaliall → Custom domains → Set up a custom domain** and enter `excaliall.davidgc.com`. Complete the DNS setup shown there. If the `davidgc.com` zone is in the same Cloudflare account, Pages can create the CNAME record for you. Wait for the custom domain to become active and its TLS certificate to be issued.

Only configure the `excaliall` subdomain. The main website at `davidgc.com` uses its own DNS records.

## Update from this checkout

```sh
corepack yarn cloudflare:deploy
```

This rebuilds the editor and uploads it as a production deployment on the `master` branch. No API token belongs in the repository. Wrangler stores browser-login credentials outside the checkout.

## Deploy automatically from GitHub

For a Git-connected Pages project, select `davidgcorr/excaliall`, use production branch `master`, repository root `/`, build command `corepack yarn install --frozen-lockfile && node scripts/build-cloudflare.cjs`, and output directory `excalidraw-app/build`. Set `NODE_VERSION` to `22.16.0` or newer.

Cloudflare treats Direct Upload and Git integration as different project creation choices. To automate an existing Direct Upload project, use a GitHub Actions workflow with a scoped Cloudflare API token and account ID stored as GitHub secrets, or create a separate Git-connected project and move the custom domain when ready.

The web build uses the root of its subdomain. Metadata, social previews, sitemap and installed PWA links point to `https://excaliall.davidgc.com`. Online collaboration and other remote services retain their configured backend endpoints; hosting this static editor does not provision those services.
