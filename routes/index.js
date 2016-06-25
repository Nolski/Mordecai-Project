var _ = require('underscore')
  , config = require('../lib/config.js')
  , dao = require('../lib/dao.js')
  , logic = require('../lib/logic')
  , util = require('../lib/util.js')
  ;

exports.create = function(req, res) {
  // just a stub for form
  var dataview = {
    tmconfig: {
      // default
      viewtype: 'timemap'
    }
  };
  res.render('dataview/create.html', {
    title: 'Create',
    dataview: dataview
  });
}

exports.createPost = function(req, res) {
  var data = req.body;
  logic.createDataView(data, req.user, function(err, out) {
    if (err) {
      res.send(err.code, err.message);
    } else {
      var out = out.toJSON();
      // req.flash('Data View Created');
      res.redirect(urlFor(out.owner, out.name));
    }
  });
}

exports.about = function(req, res) {
  res.render('about.html');
};

function urlFor(owner, dataView) {
  return '/' + [
    owner,
    dataView
    ].join('/')
}

exports.preview = function(req, res) {
  console.log(req.query.url);
  /////////////////////////////////////////////////////////////
  // var threadData = {                                      //
  //   name: 'whatever-you-want',                            //
  //   title: req.query.title || 'bboivw-ga_timemapperxlsx', //
  //   owner: req.query.owner || 'anon',                     //
  //   resources: [                                          //
  //     {                                                   //
  //       url: req.query.url,                               //
  //       backend: 'gdocs'                                  //
  //     }                                                   //
  //   ],                                                    //
  //   tmconfig: {                                           //
  //     dayfirst: req.query.dayfirst,                       //
  //     startfrom: req.query.startfrom,                     //
  //     viewtype: req.query.viewtype || 'timemap'           //
  //   }                                                     //
  // };                                                      //
  /////////////////////////////////////////////////////////////
  var threadData = {
    resources: [
      {
        backend: "gdocs",
        url: "https://docs.google.com/spreadsheets/d/1CnPfs0lFUSgtYcmsYOgKzqjhlD_6UuwJSX2wzvUxdyA/edit?usp=sharing"
      }
    ],
    title: "GA_TimeMapper.xlsx",
    tmconfig: {
      viewtype: "timemap",
      dayfirst: true,
      startfrom: "start",
    },
    "owner": "anon",
    "name": "bboivw-ga_timemapperxlsx",
    "_last_modified": "2016-06-06T15:26:56.240Z",
    "_created": "2016-06-06T15:26:56.240Z"
  };
  var isOwner = false;
  res.render('dataview/timemap.html', {
      title: threadData.title
    , embed: (req.query.embed !== undefined)
    , viz: threadData
    , vizJSON: JSON.stringify(threadData)
    , isOwner: isOwner
  });
}

// ======================================
// User Pages and Dashboards
// ======================================

exports.dashboard = function(req, res) {
  var userId = req.user.id;
  getUserInfoFull(req.user.id, function(error, account) {
    if (error) {
      res.send('Not found', 404);
      return;
    }
    var views = account.views.filter(function(view) {
      return !(view.state && view.state == 'deleted');
    });
    res.render('dashboard.html', {
      account: account.toJSON(),
      views: views
    });
  });
};

exports.userShow = function(req, res) {
  var userId = req.params.userId;
  var account = dao.Account.create({id: userId});
  getUserInfoFull(userId, function(error, account) {
    if (error) {
      res.send('Not found', 404);
      return;
    }
    var isOwner = (req.currentUser && req.currentUser.id == userId);
    var accountJson = account.toTemplateJSON();
    accountJson.createdNice = new Date(accountJson._created).toDateString();
    var views = account.views.filter(function(view) {
      return !(view.state && view.state == 'deleted');
    });
    res.render('account/view.html', {
        account: accountJson
      , views: views 
      , isOwner: isOwner
      , bodyclass: 'account'
    });
  });
};

function getUserInfoFull(userId, cb) {
  var account = dao.Account.create({id: userId});
  account.fetch(function(error) {
    if (error) {
      cb(error);
      return;
    }
    dao.DataView.getByOwner(userId, function(error, views) {
      account.views = views;
      cb(error, account);
    });
  });
}

// ======================================
// Data Views
// ======================================

var routePrefixes = {
    'js': ''
  , 'css': ''
  , 'vendor': ''
  , 'img': ''
  , 'account': ''
  , 'dashboard': ''
};

exports.timeMap = function(req, res, next) {
  var userId = req.params.userId || 'anon';
  // HACK: we only want to handle threads and not other stuff
  if (userId in routePrefixes) {
    next();
    return;
  }
  var threadName = req.params.threadName || 'bboivw-ga_timemapperxlsx';
  var viz = dao.DataView.create({owner: userId, name: threadName});
  viz.fetch(function(error) {
    if (error) {
      res.send('Not found ' + error.message, 404);
      return;
    }
    var threadData = viz.toTemplateJSON();
    console.log(threadData);
    res.render('dataview/timemap.html', {
        title: threadData.title
      , permalink: 'http://timemapper.okfnlabs.org/' + threadData.owner + '/' + threadData.name
      , authorLink: 'http://timemapper.okfnlabs.org/' + threadData.owner
      , embed: (req.query.embed !== undefined)
      , viz: threadData
      , vizJSON: JSON.stringify(threadData)
      , isOwner: false 
    });
  });
}

exports.dataViewEdit = function(req, res) {
  var userId = req.params.userId;
  var threadName = req.params.threadName;
  var viz = dao.DataView.create({owner: userId, name: threadName});
  viz.fetch(function(error) {
    if (error) {
      res.send('Not found ' + error.message, 404);
      return;
    }
    var dataview = viz.toTemplateJSON();
    res.render('dataview/edit.html', {
        dataview: dataview
      , dataviewJson: JSON.stringify(viz.toJSON())
    });
  });
}

exports.dataViewEditPost = function(req, res) {
  var userId = req.params.userId
    , threadName = req.params.threadName
    , data = req.body
    ;
  var viz = dao.DataView.create({owner: userId, name: threadName});
  viz.fetch(function(error) {
    var dataViewData = viz.toJSON();
    var vizData = _.extend(dataViewData, {
      title: data.title,
      resources: [
        _.extend({}, dataViewData.resources[0], {
          url: data.url
        })
      ],
      tmconfig: _.extend({}, dataViewData.tmconfig, data.tmconfig)
    });
    // RECREATE as create does casting correctly
    newviz = dao.DataView.create(dataViewData);
    logic.upsertDataView(newviz, 'update', req.user, function(err, out) {
      var out = out.toJSON();
      if (err) {
        res.send(err.code, err.message);
      } else {
        // req.flash('Data View Updated');
        res.redirect(urlFor(out.owner, out.name));
      }
    });
  });
}

