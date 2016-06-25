var express = require('express')
  , nunjucks = require('nunjucks')
  , i18n = require('i18n-abide')
  , config = require('./lib/config.js')
  , passport = require('passport')

  , dao = require('./lib/dao.js')
  , routes = require('./routes/index.js')
  , api = require('./routes/api.js')
  ;

var app = express();

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use( i18n.abide({
    supported_languages: [
      "en-US" , "zh-TW"
    ],
    default_lang: "en-US",
    translation_directory: "locale",
    locale_on_url: true
  }));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({ secret: config.get('express:secret')}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var env = new nunjucks.Environment(new nunjucks.FileSystemLoader('views'));
env.express(app);



app.configure('production', function(){
  app.use(express.errorHandler());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('testuser', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('test', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  // TODO: repeats test/base.js (have to because runs independently of base.js for tests ...)
  var dbName = 'hypernotes-test-njs';
  config.set('database:name', dbName);
});


// ======================================
// Pre-preparation for views
// ======================================

function getFlashMessages(req) {
  var messages = req.flash()
    , types = Object.keys(messages)
    , len = types.length
    , result = [];

  for (var i = 0; i < len; ++i) {
    var type = types[i]
      , msgs = messages[type];
    for (var j = 0, l = msgs.length; j < l; ++j) {
      var msg = msgs[j];
      result.push({
          category: type
        , text: msg
      });
    }
  }
  return result;
}

// app.dynamicHelpers({
//   messages: function(req,res) {
//     return getFlashMessages(req);
//   }
// });
//
// app.helpers({
//   distanceOfTimeInWords: util.distanceOfTimeInWords
// });

app.all('*', function(req, res, next) {
  function setup(req) {
    app.locals.currentUser = req.user ? req.user.toJSON() : null;
    next();
  }
  if (config.get('test:testing') === true && config.get('test:user')) {
    var userid = config.get('test:user');
    var acc = dao.Account.create({id: userid});
    acc.fetch(function() {
      req.user = acc;
      setup(req);
    });
  } else {
    setup(req);
  }
});

// ======================================
// Main pages
// ======================================

app.get('/', function(req, res){
  if (req.user) {
    routes.dashboard(req, res);
  } else {
    res.render('index.html', {title: 'Home'});
  }
});

app.get('/create', routes.create);
app.post('/create', routes.createPost);
app.get('/view', routes.preview);
app.get('/about', routes.about);

// ======================================
// Data Views
// ======================================

app.get('/:userId/:threadName', routes.timeMap);
app.get('/map', routes.timeMap);

app.get('/:userId/:threadName/edit', routes.dataViewEdit);
app.post('/:userId/:threadName/edit', routes.dataViewEditPost);

// ======================================
// API
// ======================================

app.get('/api/account/:id', api.getAccount);

app.get('/api/dataview/:owner/:name', api.getDataView);
app.post('/api/dataview', api.createDataView);
app.post('/api/dataview/:userId/:name', api.updateDataView);
app.delete('/api/dataview/:owner/:name', api.deleteDataView);

exports.app = app;
