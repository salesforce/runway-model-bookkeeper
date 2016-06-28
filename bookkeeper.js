/*
 * Copyright (c) 2016, Salesforce.com, Inc.
 * All rights reserved.
 */

'use strict';

let d3 = require('d3');

let View = function(controller, svg, module) {
  let model = module.env;
  svg = d3.select(svg)
    .classed('bookkeeper', true)
    .style('stroke-width', 5)
    .style('font-size', 60)
    .append('g');

  let midX = 500;
  let midY = 500;
  let numClients = model.vars.get('clients').size();
  let numBookies = model.vars.get('bookies').size();

  let zkBBox = (() => {
    let bbox = {};
    bbox.y = midY - 300;
    bbox.h = 100;
    bbox.w = 100;
    bbox.x = midX - bbox.w / 2;
    return bbox;
  })();

  let clientBBox = id => {
    let spacing = 100;
    let bbox = {};
    bbox.y = midY;
    bbox.h = 100;
    bbox.w = 100;
    bbox.x = (midX
      - numClients / 2 * bbox.w
      - (numClients - 1) / 2 * spacing
      + (id - 1) * (bbox.w + spacing));
    return bbox;
  };

  let bookieBBox = id => {
    let spacing = 100;
    let bbox = {};
    bbox.y = midY + 300;
    bbox.h = 100;
    bbox.w = 100;
    bbox.x = (midX
      - numBookies / 2 * bbox.w
      - (numBookies - 1) / 2 * spacing
      + (id - 1) * (bbox.w + spacing));
    return bbox;
  };

  {
    let bbox = zkBBox;
    svg.append('rect')
      .attr('x', bbox.x)
      .attr('y', bbox.y)
      .attr('width', bbox.w)
      .attr('height', bbox.h)
      .style('fill', 'blue')
      .style('stroke', 'black');
  }

  for (let id = 1; id <= numClients; ++id) {
    let bbox = clientBBox(id);
    svg.append('rect')
      .attr('x', bbox.x)
      .attr('y', bbox.y)
      .attr('width', bbox.w)
      .attr('height', bbox.h)
      .style('fill', 'green')
      .style('stroke', 'black');
  }

  for (let id = 1; id <= numBookies; ++id) {
    let bbox = bookieBBox(id);
    svg.append('rect')
      .attr('x', bbox.x)
      .attr('y', bbox.y)
      .attr('width', bbox.w)
      .attr('height', bbox.h)
      .style('fill', 'orange')
      .style('stroke', 'black');
  }

  return {
    bigView: true,
    wideView: true,
    name: 'BookKeeperView',
    update: function(changes) {
    },
  };
}; // View

module.exports = View;
