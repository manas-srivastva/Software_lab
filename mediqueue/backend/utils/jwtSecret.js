const insecureLegacySecret = 'mediqueue_secret_key_change_in_production_jwt_2026';
const minimumSecretLength = 32;

const getJwtSecret = (secret = process.env.JWT_SECRET) => {
  if (
    typeof secret !== 'string' ||
    secret.trim().length < minimumSecretLength ||
    secret === insecureLegacySecret
  ) {
    throw new Error(
      'JWT_SECRET must be configured with a unique random secret of at least 32 characters'
    );
  }

  return secret;
};

module.exports = getJwtSecret;
