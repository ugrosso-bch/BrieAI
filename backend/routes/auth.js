const express = require('express');
const axios = require('axios');
const router = express.Router();

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes working' });
});

// Google OAuth callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Intercambiar código por tokens con Cognito
    const cognitoDomain = 'https://brieai-auth-1756592755.auth.us-east-1.amazoncognito.com';
    const clientId = process.env.COGNITO_CLIENT_ID;
    const redirectUri = 'http://localhost:3000/auth/callback';

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    params.append('code', code);
    params.append('redirect_uri', redirectUri);

    const tokenResponse = await axios.post(`${cognitoDomain}/oauth2/token`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, id_token, refresh_token } = tokenResponse.data;

    // Obtener información del usuario desde el id_token
    const userInfo = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());

    res.json({
      success: true,
      accessToken: access_token,
      idToken: id_token,
      refreshToken: refresh_token,
      user: {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture
      }
    });

  } catch (error) {
    console.error('Google OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to process Google authentication',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;