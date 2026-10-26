const assert = require('assert');
const getJwtSecret = require('../utils/jwtSecret');

const secureSecret = '7f4a1c9e2b6d8f0a3c5e7b9d1f4a6c8e0b2d5f7a9c1e3b6d8f0a2c4e6b8d1f3a';

assert.strictEqual(getJwtSecret(secureSecret), secureSecret);
assert.throws(() => getJwtSecret(''), /JWT_SECRET must be configured/);
assert.throws(() => getJwtSecret('short-secret'), /JWT_SECRET must be configured/);
assert.throws(
  () => getJwtSecret('mediqueue_secret_key_change_in_production_jwt_2026'),
  /JWT_SECRET must be configured/
);

console.log('JWT secret configuration tests passed.');
