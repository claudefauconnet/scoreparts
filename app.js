var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var swaggerUi = require('swagger-ui-express');

var swaggerSpec = require('./api/swagger');
var scoreRouter = require('./api/score');
var pdfRouter = require('./api/pdf');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
    res.render('index', {title: 'Express'});
});

app.use('/api/score', scoreRouter);
app.use('/api/pdf', pdfRouter);

app.get('/api/swagger.json', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
app.use('/api', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(function (req, res, next) {
    var err = new Error('Not Found' + req.headers.host + req.url + "  original url " + req.originalUrl);
    err.status = 404;
    next(err);
});

app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
