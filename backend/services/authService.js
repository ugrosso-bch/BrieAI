const { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, ConfirmSignUpCommand, GetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthService {
  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    this.userPoolId = process.env.COGNITO_USER_POOL_ID;
    this.clientId = process.env.COGNITO_CLIENT_ID;
  }

  async signUp(email, password, name) {
    try {
      console.log(`Intentando registrar usuario: ${email}`);
      
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: name }
        ]
      });

      const response = await this.cognitoClient.send(command);
      console.log(`Usuario registrado exitosamente: ${response.UserSub}`);
      
      return {
        success: true,
        userSub: response.UserSub,
        message: 'Usuario registrado. Verifica tu email.'
      };
    } catch (error) {
      console.error(`Error en signUp: ${error.name} - ${error.message}`);
      
      let userMessage = error.message;
      if (error.name === 'UsernameExistsException') {
        userMessage = 'Este email ya está registrado. Intenta iniciar sesión o usar otro email.';
      } else if (error.name === 'InvalidPasswordException') {
        userMessage = 'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas y números.';
      }
      
      return {
        success: false,
        error: error.name,
        message: userMessage
      };
    }
  }

  async confirmSignUp(email, confirmationCode) {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: confirmationCode
      });

      await this.cognitoClient.send(command);
      return {
        success: true,
        message: 'Email verificado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.name,
        message: error.message
      };
    }
  }

  async signIn(email, password) {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const response = await this.cognitoClient.send(command);
      
      if (response.AuthenticationResult) {
        const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult;
        
        // Decodificar el token para obtener información del usuario
        const decodedToken = jwt.decode(IdToken);
        
        return {
          success: true,
          tokens: {
            accessToken: AccessToken,
            idToken: IdToken,
            refreshToken: RefreshToken
          },
          user: {
            userId: decodedToken.sub,
            email: decodedToken.email,
            name: decodedToken.name
          }
        };
      }
      
      return {
        success: false,
        message: 'Error en autenticación'
      };
    } catch (error) {
      return {
        success: false,
        error: error.name,
        message: error.message
      };
    }
  }

  async getUser(accessToken) {
    try {
      const command = new GetUserCommand({
        AccessToken: accessToken
      });

      const response = await this.cognitoClient.send(command);
      
      const userAttributes = {};
      response.UserAttributes.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });

      return {
        success: true,
        user: {
          userId: response.Username,
          email: userAttributes.email,
          name: userAttributes.name,
          emailVerified: userAttributes.email_verified === 'true'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.name,
        message: error.message
      };
    }
  }

  verifyToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || decoded.exp < Date.now() / 1000) {
        return { success: false, message: 'Token expirado' };
      }
      
      return {
        success: true,
        userId: decoded.sub,
        email: decoded.email,
        name: decoded.name
      };
    } catch (error) {
      return {
        success: false,
        message: 'Token inválido'
      };
    }
  }
}

module.exports = new AuthService();