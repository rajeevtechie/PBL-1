const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Get token from the header
  const token = req.header('Authorization');

  // 2. Check if token exists
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // 3. Verify the token (Remove "Bearer " if present)
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);

    // 4. Add the user inside the request object
    req.user = decoded;
    next(); 
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};