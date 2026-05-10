var swaggerJsdoc = require('swagger-jsdoc');
var path = require('path');

var options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Scoreparts API',
            version: '0.1.1',
            description: 'API for splitting orchestral scores into instrument parts'
        },
        servers: [{url: '/'}],
        tags: [
            {name: 'Score', description: 'Score management and part generation'},
            {name: 'PDF', description: 'PDF upload and file storage'}
        ]
    },
    apis: [path.join(__dirname, '**/*.js')]
};

module.exports = swaggerJsdoc(options);
