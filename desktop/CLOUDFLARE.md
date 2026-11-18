# Deploy VeDav to Cloudflare Pages

Production URL: **https://vedav.pages.dev**. Repository: [davidgcorr/vedav](https://github.com/davidgcorr/vedav).

## First deployment

Use Node.js 22.12 or newer. From the repository root:

```sh
corepack yarn install --frozen-lockfile
npx --yes wrangler@4.157.0 login
npx --yes wrangler@4.157.0 pages project create vedav --production-branch=master --force
corepack yarn cloudflare:deploy
```

If the Pages project already exists, skip its creation. Wrangler asks you to select an account when more than one is available. `wrangler.toml` defines the project name and build output. The build bundles fonts locally and disables analytics and Sentry.

## Production address

The `vedav` Pages project provides **https://vedav.pages.dev** automatically. No custom-domain DNS setup is needed for this address.

To add a custom address later, open **Workers & Pages → vedav → Custom domains → Set up a custom domain** and follow Cloudflare's DNS instructions for that address.

## Update from this checkout

```sh
corepack yarn cloudflare:deploy
```

This rebuilds the editor and uploads it as a production deployment on the `master` branch. No API token belongs in the repository. Wrangler stores browser-login credentials outside the checkout.

## Deploy automatically from GitHub

[Deploy VeDav website](https://github.com/davidgcorr/vedav/actions/workflows/cloudflare-deploy.yml) runs on every push to `master`. You can also choose **Run workflow** on `master` to redeploy. The workflow checks types, runs the editor tests, builds the website, creates the `vedav` Pages project if needed, deploys to it, and verifies the production URL. A failed check stops deployment. Deployments run one at a time.

One-time authentication setup:

1. In [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens), create a custom token named `VeDav GitHub deployment` with **Account → Cloudflare Pages → Edit**, restricted to the account containing the `vedav` project. DNS permissions are unnecessary for the `vedav.pages.dev` address.
2. In [GitHub Actions repository secrets](https://github.com/davidgcorr/vedav/settings/secrets/actions), add `CLOUDFLARE_API_TOKEN` with that token as its value. Keep it out of source files, logs and chat.
3. Push to `master` or manually run the workflow. Watch the workflow for the deployed commit and production link.

The workflow already identifies the existing Cloudflare account. It uses the GitHub `production` environment and does not deploy pull requests or feature branches. Desktop installers keep their separate release workflow. No Cloudflare/GitHub Git integration is needed for this Direct Upload project.

The web build uses the root of its subdomain. Metadata, social previews, sitemap and installed PWA links point to `https://vedav.pages.dev`. Online collaboration and other remote services retain their configured backend endpoints; hosting this static editor does not provision those services.
