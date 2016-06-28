/*
 * Copyright (c) 2016, Salesforce.com, Inc.
 * All rights reserved.
 */

'use strict';

let d3 = require('d3');
let _ = require('lodash');
let Menu = require('runway-browser/lib/menu.js');
let alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let View = function(controller, svg, module) {
  let model = module.env;
  let menu = new Menu('bookkeeper', controller, model);
  svg = d3.select(svg)
    .classed('bookkeeper', true)
    .style('stroke-width', 5)
    .style('font-size', 60)
    .append('g');

  let midX = 900;
  let midY = 500;
  let numClients = model.vars.get('clients').size();
  let numBookies = model.vars.get('bookies').size();

  let zkBBox = (() => {
    let bbox = {};
    bbox.y = midY - 400;
    bbox.h = 200;
    bbox.w = 310;
    bbox.x = midX - bbox.w / 2;
    return bbox;
  })();

  let clientBBox = id => {
    let spacing = 250;
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
    let spacing = 30;
    let bbox = {};
    bbox.y = midY + 300;
    bbox.h = 130;
    bbox.w = 220;
    bbox.x = (midX
      - numBookies / 2 * bbox.w
      - (numBookies - 1) / 2 * spacing
      + (id - 1) * (bbox.w + spacing));
    return bbox;
  };

  let nodeBBox = nodeId => nodeId.match({
    ClientNode: c => clientBBox(c.id),
    BookieNode: b => bookieBBox(b.id),
    ZooKeeperNode: zkBBox,
  });

  let zooKeeperG = svg.append('g')
    .classed('zookeeper', true);
  zooKeeperG.append('rect')
    .attr('x', zkBBox.x)
    .attr('y', zkBBox.y)
    .attr('width', zkBBox.w)
    .attr('height', zkBBox.h)
    .style('fill', 'orange')
    .style('stroke', 'black');
  zooKeeperG.append('text')
    .attr('x', zkBBox.x - 50)
    .attr('y', zkBBox.y + zkBBox.h / 2)
    .style('text-anchor', 'end')
    .style('dominant-baseline', 'middle')
    .text('ZooKeeper');
  let zkLedgers = zooKeeperG.append('g')
    .classed('ledgers', true);
  let updateZooKeeper = changes => {
    let ledgerData = model.vars.get('zooKeeper').lookup('ledgers').map(v => v);
    let updateSel = zkLedgers
      .selectAll('g.ledger')
      .data(ledgerData);
    let enterSel = updateSel.enter()
      .append('g')
      .classed('ledger', true);
    enterSel.append('text');
    updateSel.each(function(ledgerVar, i) {
      let ledgerSel = d3.select(this);
      let id = i + 1;
      let ensemble = ledgerVar.lookup('ensemble').map(v => alphabet[v.value - 1]);
      let lac = ledgerVar.lookup('state').match({
        Open: '',
        Closed: c => `@${c.lac}`,
      });
      ledgerSel.select('text')
        .attr('x', zkBBox.x + 10)
        .attr('y', zkBBox.y + zkBBox.h / 3 + 60 * i)
        .text(`L${id}:${ensemble.join('')}${lac}`);
    });
  };

  let bookiesG = svg
    .append('g')
    .classed('clients', true);
  {
    let bbox = bookieBBox(1);
    bookiesG.append('text')
      .attr('x', bbox.x - 50)
      .attr('y', bbox.y + bbox.h / 2)
      .style('text-anchor', 'end')
      .style('dominant-baseline', 'middle')
      .text('Bookies');
  }

  let updateBookies = changes => {
    let bookiesData = model.vars.get('bookies').map(v => v);
    let updateSel = bookiesG
      .selectAll('g.bookie')
      .data(bookiesData);
    let enterSel = updateSel.enter()
      .append('g')
      .classed('bookie', true);
    enterSel.append('rect');
    enterSel.append('text')
      .classed('clabel', true);
    updateSel.each(function(bookieVar, i) {
      let bookieSel = d3.select(this);
      let bookieId = i + 1;
      let bbox = bookieBBox(bookieId);
      bookieSel.select('text.clabel')
        .attr('x', bbox.x + bbox.w / 2)
        .attr('y', bbox.y - 10)
        .style('text-anchor', 'middle')
        .text(alphabet[i]);
      bookieSel.select('rect')
        .attr('x', bbox.x)
        .attr('y', bbox.y)
        .attr('width', bbox.w)
        .attr('height', bbox.h)
        .style('fill', 'lightblue')
        .style('stroke', 'black');
      let ledgerData = bookieVar.lookup('ledgers').map(v => v);
      let ledgerUpdateSel = bookieSel
        .selectAll('text.ledger')
        .data(ledgerData);
      ledgerUpdateSel.enter()
        .append('text')
        .classed('ledger', true);
      ledgerUpdateSel.each(function(ledgerVar, i) {
        let ledgerSel = d3.select(this);
        let ledgerId = ledgerVar.lookup('id').value;
        let numEntries = ledgerVar.lookup('entries').size();
        let lac = ledgerVar.lookup('lac').value;
        let fenced = ledgerVar.lookup('fenced').toString() === 'True';
        ledgerSel
          .attr('x', bbox.x + 10)
          .attr('y', bbox.y + (i + 1) * (bbox.h / 2) - 10)
          .style('fill', fenced ? 'red' : 'black')
          .text(`L${ledgerId}:${numEntries}@${lac}`);
      });
    });
  };

  let clientsG = svg
    .append('g')
    .classed('clients', true);
  {
    let bbox = clientBBox(1);
    clientsG.append('text')
      .attr('x', bbox.x - 50)
      .attr('y', bbox.y + bbox.h / 2)
      .style('text-anchor', 'end')
      .style('dominant-baseline', 'middle')
      .text('Clients');
  }

  let clientMenu = (clientVar, clientId) => {
    let items = [];
    clientVar.match({
      Inactive: () => {
        items.push({
          label: 'new ledger',
          rule: 'sendCreateLedger',
          args: clientId,
        });
        model.vars.get('zooKeeper').lookup('ledgers').forEach((ledgerVar, ledgerId) => {
          ledgerVar.lookup('state').match({
            Open: () => {
              items.push({
                label: `recover L${ledgerId}`,
                rule: 'sendRecover',
                args: [clientId, ledgerId],
              });
            },
          });
        });
      },
      Writer: () => {
        items.push({
          label: 'append',
          rule: 'createEntry',
          args: clientId,
        });
        items.push({
          label: 'close',
          rule: 'sendCloseLedger',
          args: clientId,
        });
      },
    });
    items.push({
      label: 'reboot',
      rule: 'rebootClient',
      args: clientId,
    });
    menu.open(items);
  }; // clientMenu

  let updateClients = changes => {
    let clientsData = model.vars.get('clients').map(v => v);
    let updateSel = clientsG
      .selectAll('g.client')
      .data(clientsData);
    let enterSel = updateSel.enter()
      .append('g')
      .classed('client', true)
      .classed('clickable', true)
      .on('click', (c, i) => clientMenu(c, i + 1));
    enterSel.append('rect');
    enterSel.append('text')
      .classed('clabel', true);
    enterSel.append('text')
      .classed('inner', true);
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
          CreatingLedger: 'lightgreen',
          Writer: 'lightgreen',
          Recovering: 'yellow',
        }))
        .style('stroke', 'black')
        .style('stroke-width', 'inherit')
        .style('stroke-dasharray', 'none');
      let label = clientSel.select('text.clabel')
        .attr('x', bbox.x + bbox.w / 2)
        .attr('y', bbox.y - 10)
        .style('text-anchor', 'middle');
      let inner = clientSel.select('text.inner')
        .attr('x', bbox.x + bbox.w / 2)
        .attr('y', bbox.y + bbox.h / 2)
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'middle');
      let defaults = function() {
        label.text('');
        inner.text('');
      };
      clientVar.match({
        Inactive: defaults,
        CreatingLedger: defaults,
        Writer: writer => {
          let lac = model.functions.get('calculateLAC').evaluate(
            [writer.lookup('ensemble')], model, [], {}).value;
          let numEntries = writer.lookup('numEntries').value;
          rect.style('stroke-width', '10');
          if (numEntries > lac) {
            rect.style('stroke-dasharray', '20, 15');
          }
          label.text(`Writer(L${writer.lookup('ledgerId')})`);
          inner.text(`${writer.lookup('numEntries')}`);
        },
        Recovering: recover => {
          label.text(`Recover(L${recover.lookup('ledgerId')})`);
          inner.text('');
        }
      });
    });
  };

  let messagesG = svg
    .append('g')
      .attr('class', 'messages');

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

  let update = changes => {
    updateZooKeeper(changes);
    updateClients(changes);
    updateBookies(changes);
    updateMessages(changes);
  };
  update(['']);

  return {
    bigView: true,
    wideView: true,
    name: 'BookKeeperView',
    update: update,
  };
}; // View

module.exports = View;
