# Goodform storefront

The storefront reads published products from the `goodform_products` collection
in the database selected by `MONGODB_URI`. Product prices are in ZMW.

The current catalog contains sample products with estimated prices and stock.
Verify both before using them for real sales.

Checkout creates cash-on-delivery or pickup orders in `goodform_orders` and
reserves stock in a MongoDB transaction. The server verifies prices and stock;
delivery charges are arranged separately and are not included in the item
total. Retrying the same checkout request does not create a duplicate order.
The admin portal reads these orders and manages the same catalog; see the
neighboring `tech-portal` project's README for administrator setup.

## Setup

Set `MONGODB_URI` in `.env`, then run:

```bash
npm install
node scripts/seed-products.mjs
npm run dev
```

The import inserts sample products that are missing, without changing existing
products with the same IDs. It creates a unique index on `id`.

If Node cannot resolve the MongoDB SRV record with its default DNS servers, set
`MONGODB_DNS_SERVERS` in `.env.local` to a comma-separated list of working DNS
server addresses. Do not commit environment files or credentials.

MongoDB must support transactions (a replica set or sharded cluster) and the
database user must be able to create indexes. Order attempts have a global
per-minute limit; deploy behind an edge rate-limiter and bot protection before
public use. Configure HTTPS, monitoring, backups, and customer-data retention
and access policies. No online payment or automated order email is provided.

## Integration test

`scripts/test-platform.mjs` exercises authentication, catalog changes, checkout,
idempotency, concurrent stock, and cancellation. Build and start both apps with
test-only admin credentials and the same **empty, isolated** MongoDB database.
Set `MONGODB_TEST_URI`, `TEST_STORE_URL`, `TEST_PORTAL_URL`, `TEST_ADMIN_EMAIL`,
and `TEST_ADMIN_PASSWORD` for the test process, then run
`node scripts/test-platform.mjs`. The database name must start with
`goodform_test_`; the script removes only its own test collections afterward.
Never point the test at a production database.
