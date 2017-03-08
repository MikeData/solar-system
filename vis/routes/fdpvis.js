var express = require('express');
var router = express.Router();
var datasets = require('../data/WDAfloopscrape.json');
var labels = require('../data/labels.json');

router.get('/', function(req, res, next) {
  if (req.originalUrl.slice(-1) != '/') {
    res.redirect(301, req.originalUrl + '/');
  } else {
    res.render('ons', {title: 'Office for National Statistics datasets'});
  }
});

router.get('/datasets', function(req, res, next) {
  res.json(datasets);
});

router.get('/labels', function(req, res, next) {
  res.json(labels);
});

module.exports = router;
