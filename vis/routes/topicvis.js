var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async');
var sparql = require('sparql');
var moment = require('moment');

router.get('/', function(req, res, next) {
  var client = new sparql.Client('http://d2r:2020/sparql');
  client.rows(`PREFIX ss: <https://ons.gov.uk/ns/solarsystem#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?org ?label WHERE {
  ?org a ss:Organisation;
    rdfs:label ?shortLabel .
  OPTIONAL { ?org rdfs:comment ?longLabel } .
  BIND(IF(BOUND(?longLabel), ?longLabel, ?shortLabel) AS ?label) .
}`, function(error, rows) {
    if (error) {
      res.render('error', {message: 'Error running SPARQL', error: error[1]});
    } else {
      var types = {'topic': {short: 'Topic'}};
      rows.forEach(function(row) {
        types[row.org.value] = {short: row.label.value};
      });
      res.render('index', {config: JSON.stringify({
        jsonUrl: 'data.json',
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
    }
  });
});

router.get('/data.json', function(req, res, next) {
  var client = new sparql.Client('http://d2r:2020/sparql');
  client.rows(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ss: <https://ons.gov.uk/ns/solarsystem#>
SELECT DISTINCT * WHERE {
  ?dataset a ss:Dataset ;
    rdfs:label ?datasetLabel ;
    ss:belongsToOrganisation ?org .
  [] ss:inDataset ?dataset ;
    ss:hasTopic ?topic .
  ?topic rdfs:label ?topicLabel .
  FILTER (?topicLabel != "")
}`, function(error, rows) {
    if (error) {
      res.render('error', {message: 'Error running SPARQL', error: error[1]});
    } else {
      var data = {}
      rows.forEach(function(row) {
        if (!data.hasOwnProperty(row.dataset.value)) {
          data[row.dataset.value] = {
            type: row.org.value,
            name: row.datasetLabel.value,
            id: row.dataset.value,
            docsLink: 'dataset?name=' + encodeURIComponent(row.datasetLabel.value),
            depends: [],
            dependedOnBy: []
          };
        }
        if (!data.hasOwnProperty(row.topic.value)) {
          data[row.topic.value] = {
            type: 'topic',
            name: row.topicLabel.value,
            id: row.topic.value,
            depends: [],
            dependedOnBy: []
          };
        }
        if (data[row.dataset.value].depends.indexOf(row.topic.value) === -1) {
          data[row.dataset.value].depends.push(row.topic.value);
        }
      });
      res.json({
        data: data,
        errors: []
      });
    }
  });
});

router.get('/dataset', function(req, res, next) {
  var client = new sparql.Client('http://d2r:2020/sparql');
  var escapeName = req.query.name.replace(/["]/g, '\\$&');
  client.rows(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ss: <https://ons.gov.uk/ns/solarsystem#>
SELECT ?dataset ?freq ?link ?status ?orgLabel WHERE {
  ?dataset rdfs:label "` + escapeName + `" ;
    ss:belongsToOrganisation ?org .
  OPTIONAL { ?dataset ss:dataset_frequency ?freq } .
  OPTIONAL { ?dataset ss:dataset_link ?link } .
  OPTIONAL { ?dataset ss:dataset_status ?status } .
  ?org rdfs:label ?shortLabel .
  OPTIONAL { ?org rdfs:comment ?longLabel } .
  BIND(IF(BOUND(?longLabel), ?longLabel, ?shortLabel) AS ?orgLabel) .
}`, function(error, datasetRows) {
    if (error) {
      res.render('error', {message: 'Error running SPARQL', error: error[1]});
    } else if (datasetRows.length !== 1) {
      res.render('error', {message: 'Problem looking up dataset'});
    } else {
      var details = {
        'dataset': datasetRows[0].dataset.value,
        'label': req.query.name,
        'orgLabel': datasetRows[0].orgLabel.value
      };
      if (datasetRows[0].hasOwnProperty('freq')) {
        var duration = moment.duration(datasetRows[0].freq.value);
        var durations = [];
        ['years', 'months', 'days'].forEach(function(period) {
          if (duration[period]() > 0) {
            if (duration[period]() > 1) {
              durations.push(duration[period]().toString() + ' ' + period);
            } else {
              durations.push(duration[period]().toString() + ' ' + period.substring(0, period.length - 1));
            }
          }
        });
        details['freq'] = 'Every ' + durations.join(' ');
      }
      if (datasetRows[0].hasOwnProperty('link')) {
        details['link'] = datasetRows[0].link.value;
      }
      if (datasetRows[0].hasOwnProperty('status')) {
        if (datasetRows[0].status.value.endsWith('NationalStatistics')) {
          details['status'] = 'National Statistics';
        } else if (datasetRows[0].status.value.endsWith('OfficialStatistics')) {
          details['status'] = 'Official Statistics';
        } else if (datasetRows[0].status.value.endsWith('ExperimentalStatistics')) {
          details['status'] = 'Experimental Statistics';
        }
      }
      client.rows(`PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX ss: <https://ons.gov.uk/ns/solarsystem#>
SELECT * WHERE {
  ?stats ss:inDataset <` + details['dataset'] + `> ;
    rdfs:label ?label .
    OPTIONAL { ?stats ss:format ?format } .
    OPTIONAL { ?stats ss:stats_geography ?geography } .
    OPTIONAL { ?stats ss:stats_metadata ?metadata } .
    OPTIONAL { ?stats ss:stats_time ?time } .
    OPTIONAL { ?stats ss:stats_unit ?unit } .
}`, function(error, statsRows) {
        if (error) {
          res.render('error', {message: 'Error running SPARQL', error: error[1]});
        } else {
          stats = [];
          statsRows.forEach(function(row) {
            statsDetail = {'id': row.stats.value, 'label': row.label.value};
            ['format', 'geography', 'metadata', 'time', 'unit'].forEach(function(key) {
              if (row.hasOwnProperty(key)) {
                statsDetail[key] = row[key].value;
              }
            });
            stats.push(statsDetail);
          });
          res.render('dataset', {details: details, stats: stats});
        }
      });
    }
  });
});

module.exports = router;
