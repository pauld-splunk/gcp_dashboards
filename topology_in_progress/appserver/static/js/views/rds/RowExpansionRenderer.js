"use strict";

define([
  "underscore",
  "jquery",
  "splunkjs/mvc/searchmanager",
  "splunkjs/mvc/tableview"
], function(
  _,
  $,
  SearchManager,
  TableView
) {
  var metrics = [
    "CPUUtilization",
    "FreeableMemory",
    "FreeStorageSpace",
    "ReadIOPS",
    "ReadLatency",
    "ReadThroughput",
    "WriteIOPS",
    "WriteLatency",
    "WriteThroughput"
  ];

  var tableTpl = _.template(`
    <dl>
    <dd><h3 style="color:black;"><%= caption %></h3></dd>
    <dt>
    <table style="width:100%">
      <% _(data).each(function(row) { %>
      <tr>
        <% _(row).each(function(cell) { %>
        <td style="width=<%= cellWidth %>">
          <span><strong><%= cell.label %>:</strong></span>
          <span><%= cell.value %></span>
        </td>
        <% }) %>
      </tr>
      <% }) %>
    </table>
    </dt>
  `);

  function renderTable(bindings) {
    var w = (bindings.data[0] || []).length;
    if(w > 0) { w = 100 / w; }
    bindings.cellWidth = `${w}%`;
    return tableTpl(bindings);
  }

  function renderPercent(v) {
    return `${Math.round(v * 100) / 100}%`;
  }

  function renderBytes(v) {
    if (_.isUndefined(v) || _.isEmpty(v) || _.isNull(v)) {
      return 'N/A';
    }
    var u = _(["", "K", "M", "G", "T", "P", "Z"]).find(function() {
      if(v > 1024) {
        v = v / 1024;
        return false;
      }
      return true;
    });
    return `${Math.round(v * 100) / 100} ${u}B`;
  }

  function renderSeconds(v) {
    if (_.isUndefined(v) || _.isEmpty(v) || _.isNull(v)) {
      return 'N/A';
    }
    var u = "Seconds";
    if(v > 60) { v = v / 60, u = "Minutes"; }
    if(v > 60) { v = v / 60, u = "Hours"; }
    if(v > 24) { v = v / 24, u = "Days"; }
    return `${Math.round(v * 100) / 100} ${u}`;
  }

  function renderIOPS(v) {
    if (_.isUndefined(v) || _.isEmpty(v) || _.isNull(v)) {
      return 'N/A';
    }
    return Math.round(v * 100) / 100;
  }

  function searchMetrics($container, rowData) {
    /* jshint validthis: true */
    var id = this._instanceId(rowData);

    var metricFilter = _(metrics).map(function(name) {
      return `metric_name="${name}"`;
    }).join(" OR ");

    var manager = new SearchManager({
      "id": "search_" + id,
      "search": `
      \`aws-cloudwatch-rds((${this.accountToken}), ${this.regionToken})\`
      metric_dimensions="DBInstanceIdentifier=[${id}]"
      (${metricFilter})
      | fields metric_name Average
      | dedup metric_name
      | head ${metrics.length}
      | rename Average as value
      `,
      "earliest_time": "0",
      "latest_time": "now",
      "auto_cancel": 90,
      "preview": false
    }, {tokens: true});

    var dataModel = manager.data("results", {
      output_mode: "json"
    });

    var $el = this.$el[id] = $(`<div />`);

    function display(msg) { $el.text(_(msg).t()); }

    var cleanup = _.bind(function() {
      /* jshint validthis: true */
      this.stopListening(manager);
      this.stopListening(dataModel);
    }, this);

    function renderMetrics() {
      /* jshint validthis: true */
      if(!dataModel.hasData()) { return display("No results found"); }

      var data = _(dataModel.data().results).reduce(function(obj, e) {
        obj[e.metric_name] = e.value;
        return obj;
      }, {});
      var readIOPS = renderIOPS(data.ReadIOPS),
          writeIOPS = renderIOPS(data.WriteIOPS),
          readLatency = renderSeconds(data.ReadLatency),
          writeLatency = renderSeconds(data.WriteLatency),
          readThroughput = renderBytes(data.ReadThroughput),
          writeThroughput = renderBytes(data.WriteThroughput),
          IOPS = (readIOPS === 'N/A' || writeIOPS === 'N/A') ? 'N/A' : `${readIOPS} / ${writeIOPS} per Second`,
          latency = (readLatency === 'N/A' || writeLatency ==='N/A') ? 'N/A' : `${readLatency} / ${writeLatency}`,
          throughput = (readThroughput === 'N/A' || writeThroughput ==='N/A') ? 'N/A' : `${readThroughput} / ${writeThroughput} per Second`;
      $el.html(renderTable({
        caption: _("Current Metrics").t(),
        data: [
          [
            {label: "CPU Utilization", value: renderPercent(data.CPUUtilization)},
            {label: "Freeable Memory", value: renderBytes(data.FreeableMemory)},
            {label: "Free Storage Space", value: renderBytes(data.FreeStorageSpace)}
          ], [
            {label: "IOPS (Read/Write)", value: IOPS},
            {label: "Latency (Read/Write)", value: latency},
            {label: "Throughput (Read/Write)", value: throughput}
          ]
        ]
      }));
    }

    // manager events
    _({
      start:  function() { display("Loading... Please wait"); },
      cancel: function() { display("Data loading was cancelled"); },
      fail:   function() { display("Data loading failed"); },
      error:  function(msg) { display(`Data loading error: ${msg}`); },
      done:   function(state) {
        if(state.content.resultCount < 1) {
          display("No results found");
          cleanup();
        }
      }
    }).each(function(fn, e) {
      this.listenTo(manager, `search:${e}`, fn);
    }, this);

    // data model events
    _({
      error: function() { display("Data loading error"); },
      data:  function() {
        renderMetrics();
        cleanup();
      }
    }).each(function(fn, e) {
      this.listenTo(dataModel, e, fn);
    }, this);
  }

  return TableView.BaseRowExpansionRenderer.extend({
    initialize: function(options) {
      options = options || {};
      this.accountToken = options.accountToken;
      this.regionToken = options.regionToken;

      this.setupFn = {};
      this.$el     = {};
    },

    canRender: function() { return true; },

    setup: function(_$c, rowData) {
      var id = this._instanceId(rowData);

      if(_.isUndefined(this.setupFn[id])) { this.setupFn[id] = _.once(searchMetrics); }

      this.setupFn[id].apply(this, arguments);
    },

    render: function($container, rowData) {
      this.$el[this._instanceId(rowData)].appendTo($container);
    },

    _instanceId: function(rowData) {
      return rowData.values[rowData.fields.indexOf('DB Instance')];
    }
  });
});
