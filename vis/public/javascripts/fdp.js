var chart = document.getElementById("chart");
var svg = d3.select(chart).append("svg");
var radius = 4;

var width, height;

function redraw() {
  width = chart.clientWidth;
  height = chart.clientHeight;
  svg
    .attr("width", width)
    .attr("height", height);
}

redraw();

window.addEventListener("resize", redraw);

var color = d3.scaleOrdinal(d3.schemeDark2);

var forceManyBodySubset = d3.forceManyBody();
var forceManyBodyInitialize = forceManyBodySubset.initialize;
forceManyBodySubset.initialize = function(nodes) {
  forceManyBodyInitialize(nodes.filter(function(n, i) {
    return n.type === 'topic';
  }));
}

var simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(function(d) { return d.id; }))
    .force("charge", forceManyBodySubset)
    .force("collide", d3.forceCollide(3))
    .force("center", d3.forceCenter(width / 2, height / 2));

var nodes = [];
var links = [];
var topics = d3.set();

d3.json('datasets', function(datasets) {
  for (dataset in datasets) {
    nodes.push({
      id: dataset,
      name: datasets[dataset].name,
      context: datasets[dataset].context,
      type: 'dataset'
    });
    datasets[dataset].topics.forEach(function(topic) {
      topics.add(topic);
      links.push({
        source: dataset,
        target: topic
      });
    });
  }

  topics.each(function(topic) {
    nodes.push({
      id: topic,
      type: 'topic'
    });
  });

  var svgNodes = svg.append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 3)
      .attr("fill", function(n) {
        if (n.hasOwnProperty('context')) {
          return color(n.context);
        } else {
          return '#000000'; //color('topic');
        }
      })
      .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
  
  
  simulation
    .nodes(nodes)
    .on("tick", ticked);

  simulation
    .force("link")
    .links(links);

  function ticked() {
    svgNodes
      .attr("cx", function(d) {return d.x = Math.max(radius, Math.min(width - radius, d.x))})
      .attr("cy", function(d) {return d.y = Math.max(radius, Math.min(height - radius, d.y));});
  }

});

function dragstarted(d) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}
