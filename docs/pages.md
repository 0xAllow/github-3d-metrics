# GitHub Pages deployment

In the public project repository, open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Open **Actions → Deploy GitHub Pages → Run workflow**, select the default branch, and check the deployment job’s environment URL. The workflow is manual.

Vite builds with a relative base so the index route can run under a GitHub Pages repository path. Setup and documentation links point to the intended upstream repository. Update those links and the reusable workflow’s engine checkout reference if you publish a fork under a different name.

GitHub Pages hosts the dashboard and viewer. Image generation runs in Actions or locally. The repository can operate within GitHub’s free public repository, standard runner, and Pages limits. See [GitHub’s Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) and [GitHub Actions billing](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-actions/about-billing-for-github-actions).
