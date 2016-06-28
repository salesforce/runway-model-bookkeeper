/*
 * Copyright (c) 2016, Salesforce.com, Inc.
 * All rights reserved.
 */

'use strict';

let d3 = require('d3');
let _ = require('lodash');

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

  let clientsG = svg
    .append('g')
      .attr('class', 'clients');

  let messagesG = svg
    .append('g')
      .attr('class', 'messages');

  let nodeBBox = nodeId => nodeId.match({
    ClientNode: c => clientBBox(c.id),
    BookieNode: b => bookieBBox(b.id),
    ZooKeeperNode: zkBBox,
  });

  let updateClients = changes => {
    let clientsData = model.vars.get('clients').map(v => v);
    let updateSel = clientsG
      .selectAll('g.client')
      .data(clientsData);
    let enterSel = updateSel.enter()
      .append('g')
      .classed('client', true);
    enterSel.append('rect');
    updateSel.each(function(clientVar, i) {
      let clientSel = d3.select(this);
      let id = i + 1;
      let bbox = clientBBox(id);
      let rect = clientSel.select('rect')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.w)
        .attr('height', bbox.h)
        .style('fill', clientVar.match({
          Inactive: 'gray',
          CreatingLedger: 'green',
          Writer: 'green',
          Recovering: 'yellow',
        }))
        .style('stroke', 'black')
        .style('stroke-width', 'inherit')
        .style('stroke-dasharray', 'none');
      clientVar.match({
        Writer: writer => {
          let lac = model.functions.get('calculateLACWriter').evaluate(
            [writer.lookup('ensemble')], model, [], {}).value;
          let numEntries = writer.lookup('numEntries').value;
          rect.style('stroke-width', '10');
          if (numEntries > lac) {
            rect.style('stroke-dasharray', '20, 15');
          }
        },
      });
    });
  };
  updateClients(['']);

  let updateMessages = changes => {
    let messageData = model.vars.get('network').map(v => v);
    let updateSel = messagesG
      .selectAll('g.message')
      .data(messageData);
    let enterSel = updateSel.enter()
      .append('g')
      .classed('message', true);
    enterSel.append('circle')
      .attr('r', 20)
      .style('fill', 'black');
    updateSel.each(function(messageVar, i) {
      let messageSel = d3.select(this);
      let fromBBox = nodeBBox(messageVar.lookup('from'));
      let toBBox = nodeBBox(messageVar.lookup('to'));
      let fromPoint = {
        x: fromBBox.x + fromBBox.w / 2,
        y: fromBBox.y + fromBBox.h / 2,
      };
      let toPoint = {
        x: toBBox.x + toBBox.w / 2,
        y: toBBox.y + toBBox.h / 2,
      };
      let clock = controller.workspace.clock;
      let sentAt = messageVar.lookup('sentAt').value;
      let deliverAt = messageVar.lookup('deliverAt').value;
      let frac = .7;
      if (deliverAt > 0) {
        frac = _.clamp((clock - sentAt) / (deliverAt - sentAt),
                     0, 1);
      }
      let cx = _.round(fromPoint.x + (toPoint.x - fromPoint.x) * frac, 2);
      let cy = _.round(fromPoint.y + (toPoint.y - fromPoint.y) * frac, 2);
      messageSel.select('circle')
        .attr('cx', cx)
        .attr('cy', cy);
    });
    updateSel.exit().remove();
  };
  updateMessages(['']);

  return {
    bigView: true,
    wideView: true,
    name: 'BookKeeperView',
    update: function(changes) {
      updateClients(changes);
      updateMessages(changes);
    },
  };
}; // View

module.exports = View;
