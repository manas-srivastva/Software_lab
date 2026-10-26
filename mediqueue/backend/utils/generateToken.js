const jwt = require('jsonwebtoken');
const getJwtSecret = require('./jwtSecret');

const generateToken = (id, role = 'patient') => {
  return jwt.sign(
    { id, role },
    getJwtSecret(),
    {
      expiresIn: '30d',
    }
  );
};

module.exports = generateToken;
