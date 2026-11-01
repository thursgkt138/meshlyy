# Meshlyy product catalogue preview

This branch contains a standalone, static catalogue preview at `catalog-preview/index.html`.

Open the HTML file locally, select the previously scraped JSON export, and browse deduplicated products by name and category. No upload to a server occurs.

The preview intentionally strips marketplace-specific fields and links. It does not reuse third-party images, delivery claims, stock claims or source retailer selling prices. MRP is shown only where available and should be validated before publication. Retailer-specific price, stock and pickup reservation require a separate verified merchant inventory feed.

This is **not yet integrated into a deployed storefront**. The repository currently has only a minimal README and no existing application code to connect to.