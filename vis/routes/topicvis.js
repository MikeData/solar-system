var express = require('express');
var router = express.Router();
var fs = require('fs');
var async = require('async');
var sparql = require('sparql');

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
/*      
  var conn = new stardog.Connection();
  conn.setEndpoint('http://stardog:5820/');
  conn.setCredentials('admin', 'admin');
  conn.query({database: 'EM', query: `PREFIX em: <http://tide.act.nato.int/em/index.php/Special:URIResolver/>
SELECT DISTINCT * WHERE {
  ?elem em:Property-3AIs_requiring_service ?serv .
  ?serv em:Property-3AIs_child_of+ em:COI-2DEnabling_Services .
  ?elem a ?elemType; rdfs:label ?elemLabel ; em:Property-3ADescription ?elemDesc .
  ?serv a ?servType; rdfs:label ?servLabel ; em:Property-3ADescription ?servDesc .
  FILTER (?servType != <http://semantic-mediawiki.org/swivt/1.0#Subject>) .
  FILTER (?elemType != <http://semantic-mediawiki.org/swivt/1.0#Subject>) .
  FILTER (?elemType != em:Category-3AServices) .
}`},
             function(qr) {
               var data = {};
               qr.results.bindings.forEach(function(binding) {
                 var elemUri = binding.elem.value;
                 var servUri = binding.serv.value;
                 if (!data.hasOwnProperty(elemUri)) {
                   data[elemUri] = {
                     name: binding.elemLabel.value,
                     docs: binding.elemDesc.value,
                     id: elemUri,
                     depends: [],
                     dependedOnBy: []
                   };
                 }
                 if (!data.hasOwnProperty(servUri)) {
                   data[servUri] = {
                     name: binding.servLabel.value,
                     docs: binding.servDesc.value,
                     id: servUri,
                     depends: [],
                     dependedOnBy: []
                   };
                 }
                 if (servUri !== elemUri) {
                   if (data[elemUri].depends.indexOf(servUri) ==-1) {
                     data[elemUri].depends.push(servUri);
                   }
                   if (data[servUri].dependedOnBy.indexOf(elemUri) ==-1) {
                     data[servUri].dependedOnBy.push(elemUri);
                   }
                 }
                 var uselessClasses = ['http://semantic-mediawiki.org/swivt/1.0#Subject',
                                       'http://tide.act.nato.int/em/index.php/Special:URIResolver/Category-3APages_with_broken_file_links'];
                 if (uselessClasses.indexOf(binding.elemType.value) === -1) {
                   data[elemUri].type = binding.elemType.value;
                 }
                 if (uselessClasses.indexOf(binding.servType.value) === -1) {
                   data[servUri].type = binding.servType.value;
                 }
               });
               res.json({
                 data: data,
                 errors: []
               });
             });
}); */

module.exports = router;
