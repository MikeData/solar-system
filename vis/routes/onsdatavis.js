var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var datasets = require('../data/WDAfloopscrape.json');
var labels = require('../data/labels.json');
var Set = require('collections/set')

router.get('/', function(req, res, next) {
  var contexts = new Set();
  dataUrl = 'data.json';
  if (req.query.hasOwnProperty('contexts')) {
    contexts.addEach(req.query.contexts.split(','));
    dataUrl = dataUrl + '?contexts=' + req.query.contexts;
  } else {
    for (dataset in datasets) {
      contexts.add(datasets[dataset].context);
    }
  }
  var types = contexts.map(function(context) {
    o = {};
    o[context] = {short: context};
    return o;
  });

  res.render('index', {config: JSON.stringify({
    jsonUrl: dataUrl,
    title: 'Organisation',
    "graph" : {
      "linkDistance" : 100,
      "charge"       : -400,
      "height"       : 800,
      "numColors"    : 12,
      "labelPadding" : {
        "left"   : 3,
        "right"  : 3,
        "top"    : 2,
        "bottom" : 2
      },
      "labelMargin" : {
        "left"   : 3,
        "right"  : 3,
        "top"    : 2,
        "bottom" : 2
      },
      "ticksWithoutCollisions" : 50
    },
    types: types,
    constraints: []
  })});
});

router.get('/data.json', function(req, res, next) {
  var contexts = null;
  if (req.query.hasOwnProperty('contexts')) {
    contexts = new Set(req.query.contexts.split(','));
  }
  var data = {}
  for (d in datasets) {
    if (d === '') {
      console.log('Empty dataset ID');
    } else if ((contexts === null) || (contexts.contains(datasets[d].context))) {
      var id = 'dataset-' + d;
      if (data.hasOwnProperty(id)) {
        console.log('Duplicate ID ' + id);
      } else {
        data[id] = {
          type: datasets[d].context,
          name: datasets[d].name,
          id: id,
          depends: [],
          dependedOnBy: []
        }
        datasets[d].topics.forEach(function(topic) {
          if (topic === '') {
            console.log('Empty topic ID');
          } else {
            var topicId = 'topic-' + topic;
            if (labels.hasOwnProperty(topic)) {
              if (data[id].depends.indexOf(topicId) === -1) {
                data[id].depends.push(topicId);
              }
              if (!data.hasOwnProperty(topicId)) {
                data[topicId] = {
                  type: 'Topic',
                  name: labels[topic],
                  id: topicId,
                  depends: [],
                  dependedOnBy: []
                }
              }
            }
          }
        });
      }
    }
  };
  res.json({
    data: data,
    errors: []
  });
});

module.exports = router;
