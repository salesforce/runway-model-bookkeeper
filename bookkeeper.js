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
    .append('g');

  return {
    name: 'BookKeeperView',
    update: function(changes) {
    },
  };
}; // View

module.exports = View;
