const { google } = require('googleapis');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

class GoogleCalendarService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3001'}/api/google/calendar/callback`
        );

        this.dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({
            region: process.env.AWS_REGION
        }));

        this.scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
        ];
    }

    getAuthUrl(userId) {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
            state: userId
        });
    }

    async exchangeCodeForTokens(code, userId) {
        try {
            const { tokens } = await new Promise((resolve, reject) => {
                this.oauth2Client.getToken(code, (err, tokens) => {
                    if (err) reject(err);
                    else resolve({ tokens });
                });
            });
            
            // Guardar tokens en DynamoDB
            await this.saveTokens(userId, tokens);
            
            return tokens;
        } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            throw error;
        }
    }

    async saveTokens(userId, tokens) {
        const params = {
            TableName: 'brieai-user-tokens',
            Item: {
                userId,
                provider: 'google_calendar',
                tokens,
                updatedAt: new Date().toISOString()
            }
        };

        await this.dynamoClient.send(new PutCommand(params));
    }

    async getTokens(userId) {
        const params = {
            TableName: 'brieai-user-tokens',
            Key: {
                userId,
                provider: 'google_calendar'
            }
        };

        const result = await this.dynamoClient.send(new GetCommand(params));
        return result.Item?.tokens;
    }

    async getCalendarService(userId) {
        const tokens = await this.getTokens(userId);
        if (!tokens) {
            throw new Error('No calendar tokens found for user');
        }

        this.oauth2Client.setCredentials(tokens);
        return google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    async listEvents(userId, daysAhead = 7) {
        try {
            const calendar = await this.getCalendarService(userId);
            
            const timeMin = new Date().toISOString();
            const timeMax = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString();

            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin,
                timeMax,
                singleEvents: true,
                orderBy: 'startTime',
            });

            return response.data.items || [];
        } catch (error) {
            console.error('Error listing events:', error);
            throw error;
        }
    }

    async createEvent(userId, eventData) {
        try {
            const calendar = await this.getCalendarService(userId);

            const event = {
                summary: eventData.title,
                description: eventData.description,
                start: {
                    dateTime: eventData.start_time,
                    timeZone: 'America/Montevideo',
                },
                end: {
                    dateTime: eventData.end_time,
                    timeZone: 'America/Montevideo',
                },
            };

            const response = await calendar.events.insert({
                calendarId: 'primary',
                resource: event,
            });

            return response.data;
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    }
}

module.exports = new GoogleCalendarService();