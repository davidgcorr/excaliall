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

[Deploy Excaliall website](https://github.com/davidgcorr/excaliall/actions/workflows/cloudflare-deploy.yml) runs on every push to `master`. You can also choose **Run workflow** on `master` to redeploy. The workflow checks types, runs the editor tests, builds the website, deploys to the existing `excaliall` Pages project, and verifies the production URL. A failed check stops deployment. Deployments run one at a time.

One-time authentication setup:

1. In [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens), create a custom token named `Excaliall GitHub deployment` with **Account → Cloudflare Pages → Edit**, restricted to the account containing the `excaliall` project. DNS permissions are unnecessary because the custom domain is already configured.
2. In [GitHub Actions repository secrets](https://github.com/davidgcorr/excaliall/settings/secrets/actions), add `CLOUDFLARE_API_TOKEN` with that token as its value. Keep it out of source files, logs and chat.
3. Push to `master` or manually run the workflow. Watch the workflow for the deployed commit and production link.

The workflow already identifies the existing Cloudflare account. It uses the GitHub `production` environment and does not deploy pull requests or feature branches. Desktop installers keep their separate release workflow. No Cloudflare/GitHub Git integration is needed for this Direct Upload project.

The web build uses the root of its subdomain. Metadata, social previews, sitemap and installed PWA links point to `https://excaliall.davidgc.com`. Online collaboration and other remote services retain their configured backend endpoints; hosting this static editor does not provision those services.
