var express = require('express');
var router = express.Router();
var datasets = require('../data/WDAfloopscrape.json');
var labels = require('../data/labels.json');

router.get('/', function(req, res, next) {
  res.render('fdp', {title: 'Force directed placement'});
});

router.get('/datasets', function(req, res, next) {
  res.json(datasets);
});

module.exports = router;
