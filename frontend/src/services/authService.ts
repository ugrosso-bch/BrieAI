import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || 'us-east-1_3do6KDghK',
  ClientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '1vg2hedmfpgr9r5vcqmiuq9jgc'
};

const userPool = new CognitoUserPool(poolData);

export interface User {
  userId: string;
  email: string;
  name: string;
}

class AuthService {
  signUp(email: string, password: string, name: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const attributeList = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'name', Value: name })
      ];

      userPool.signUp(email, password, attributeList, [], (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  confirmSignUp(email: string, code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  signIn(email: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => {
          const accessToken = result.getAccessToken().getJwtToken();
          const idToken = result.getIdToken().getJwtToken();
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('idToken', idToken);
          
          resolve({
            accessToken,
            idToken,
            user: this.parseToken(idToken)
          });
        },
        onFailure: (err) => {
          reject(err);
        }
      });
    });
  }

  signOut(): void {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('idToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    // Primero verificar si hay un usuario de Google guardado
    const googleUser = localStorage.getItem('user');
    if (googleUser) {
      try {
        return JSON.parse(googleUser);
      } catch (e) {
        console.error('Error parsing Google user:', e);
      }
    }
    
    // Si no, verificar token de Cognito tradicional
    const idToken = localStorage.getItem('idToken');
    if (idToken) {
      return this.parseToken(idToken);
    }
    return null;
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = localStorage.getItem('user');
    
    // Si hay usuario de Google, considerar autenticado
    if (user && token) {
      return true;
    }
    
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  private parseToken(token: string): User {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name
    };
  }
}

export default new AuthService();