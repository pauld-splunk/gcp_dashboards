"use strict";

define([
  'underscore',
  'jquery',
  'splunkjs/mvc',
  "splunkjs/mvc/searchmanager",
  "splunkjs/mvc/simpleform/input/multiselect",
  "splunkjs/mvc/simplexml/dashboard/row",
  "splunkjs/mvc/simplexml/dashboard/panel",
  "splunkjs/mvc/simplexml/element/chart",
  "splunkjs/mvc/simplexml/element/table",
  "app/views/rds/InstancesSelectInput",
  "app/views/rds/EngineLogoCellRenderer",
  "app/views/rds/RowExpansionRenderer",
  "app/utils/InputUtil",
  "appcss/pages/rds/bootstrap.pcss",
  'app/views/dashboard/common',
  "splunkjs/mvc/simplexml/ready!"
], function(
  _,
  $,
  mvc,
  SearchManager,
  MultiSelectInput,
  Row,
  Panel,
  ChartElement,
  TableElement,
  InstancesSelectInput,
  LogoCellRenderer,
  RowExpandsionRenderer,
  InputUtil
) {
  // views: form inputs

  new SearchManager({
    "id": "search_instances",
    "search": '`aws-description-resource("$accountId$", " $region$", "rds_instances")` | fields id engine | eval label=id | sort label',
    "earliest_time": "-7d",
    "latest_time": "now",
    "auto_cancel": 90,
    "preview": true,
    "runWhenTimeIsUndefined": false
  }, {tokens: true});

  /**
   * Update the $rdsIdFilter$ token when RDS instances multiselect is changed.
   * This token is used to filter events from AWS RDS description.
   */
  function updateRDSIdFilterToken(value) {
    var tokenModel = mvc.Components.getInstance("default"),
        tokenName  = "rdsIdFilter";

    if(value.length > 0) {
      let tokenValue = _(value).map(function(v) {
        return `id="${v}"`;
      }).join(" OR ");

      tokenModel.set(tokenName, `(${tokenValue})`);
    } else {
      tokenModel.unset(tokenName);
    }
  }

  /**
   * Update the the engine tokens (set / unset) on RDS instances multiselect changes.
   * Some chart views are only meaningful to some engine, so we need to know
   * what kinds of engines are currently selected.
   */
  function updateEngineToken(value, input) {
    var defaultTokenModel = mvc.Components.getInstance("default"),
        submittedTokenModel = mvc.Components.getInstance("submitted", {create: true});

    _(["mysql", "postgres", "oracle", "sqlserver"]).each(function(n) {
      defaultTokenModel.unset(n);
      submittedTokenModel.unset(n);
    });

    if(value.length < 1) { return; }

    var engines,
        allEngines = input.settings.get("rdsEngines") || {};

    if(value.indexOf("*") > -1) {
      engines = _(allEngines).values();
    } else {
      engines = _(value).map(function(v) {
        return allEngines[v];
      });
    }

    _.each(_.uniq(_.compact(engines)), function(n) {
      if(n === "mariadb") { n = "mysql"; }
      else if(n.indexOf("oracle") > -1) { n = "oracle"; }
      else if(n.indexOf("sqlserver") > -1) { n = "sqlserver"; }

      defaultTokenModel.set(n, true);
      // on page load, the "depends" tokens are read
      // from submitted token model
      submittedTokenModel.set(n, true);
    });
  }

  function onInstanceChange(newValue, input) {
    updateRDSIdFilterToken(newValue, input);
    updateEngineToken(newValue, input);
  }

  var instancesInput = new InstancesSelectInput({
    "label": _("RDS Instances").t(),
    "value": "$form.dimensionFilter$",
    "choices": [{label: "All", value: "*"}],
    "managerid": "search_instances",
    "valueField": "id",
    "labelField": "label",
    "prefix": "(",
    "valuePrefix": 'metric_dimensions="DBInstanceIdentifier=[',
    "valueSuffix": ']"',
    "delimiter": " OR ",
    "suffix": ")",
    "searchWhenChanged": true,
    "handleValueChange": true,
    "default": "*",
    "el": $('#input_rds_instances')
  }, {tokens: true});

  instancesInput.on("change", function(newValue) {
    onInstanceChange(newValue, this);
  });
  // the first "change" event happens before "datachange",
  // which means when it happens, data is not ready yet.
  instancesInput.on("datachange", function() {
    onInstanceChange(this.val(), this);
  });

  instancesInput.render();

  // CREATE "Metrics" MULTISELECT

  var metricOptions = {
    CPUUtilization: {
      viewOptions: {
        "charting.axisTitleY.text": "%"
      }
    },
    FreeableMemory: {
      splAgg: "eval(round(avg(Average) / 1024 / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "MB"
      }
    },
    NetworkTransmitThroughput: {
      splAgg: "eval(round(avg(Average) / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "KB/Second"
      }
    },
    NetworkReceiveThroughput: {
      splAgg: "eval(round(avg(Average) / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "KB/Second"
      }
    },
    FreeStorageSpace: {
      splAgg: "eval(round(avg(Average) / 1024 / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "MB"
      }
    },
    SwapUsage: {
      splAgg: "eval(round(avg(Average) / 1024 / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "MB"
      }
    },
    ReadIOPS: {
      viewOptions: {
        "charting.axisTitleY.text": "Count/Second"
      }
    },
    ReadLatency: {
      viewOptions: {
        "charting.axisTitleY.text": "Seconds"
      }
    },
    ReadThroughput: {
      splAgg: "eval(round(avg(Average) / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "KB/Second"
      }
    },
    WriteIOPS: {
      viewOptions: {
        "charting.axisTitleY.text": "Count/Second"
      }
    },
    WriteLatency: {
      viewOptions: {
        "charting.axisTitleY.text": "Seconds"
      }
    },
    WriteThroughput: {
      splAgg: "eval(round(avg(Average) / 1024, 2))",
      viewOptions: {
        "charting.axisTitleY.text": "KB/Second"
      }
    },
    TransactionLogsDiskUsage: {
      label: "Transaction Logs Disk Usage (PostgreSQL)",
      splAgg: "eval(round(avg(Average) / 1024 / 1024, 2))",
      viewOptions: {
        tokenDependencies: {depends: "$postgres$"},
        "charting.axisTitleY.text": "MB"
      }
    },
    OldestReplicationSlotLag: {
      label: "Oldest Replication Slot Lag (PostgreSQL)",
      viewOptions: {
        tokenDependencies: {depends: "$postgres$"}
      }
    },
    BinLogDiskUsage: {
      label: "Bin Log Disk Usage (MySQL)",
      splAgg: "eval(round(avg(Average) / 1024 / 1024, 2))",
      viewOptions: {
        tokenDependencies: {depends: "$mysql$"},
        "charting.axisTitleY.text": "MB"
      }
    }
  };

  function createMetricChart(metricName) {
    var metric = metricOptions[metricName] || {};
    var searchId = `search_${metricName}`;
    var agg = metric.splAgg || "avg(Average)";
    var label = metric.label;
    if(_.isUndefined(label)) {
      label = metricName.replace(/([A-Z])([A-Z][^A-Z])/g, "$1 $2");
      label = label.replace(/([^A-Z])([A-Z])/g, "$1 $2");
    }
    label = `Average ${label}`;

    var metricSPL = `\`aws-cloudwatch-rds($accountId$, $region$)\` $dimensionFilter$ metric_name="${metricName}" | \`aws-cloudwatch-dimension-rex("DBInstanceIdentifier", "Instance")\` | timechart ${agg} as value by Instance`;

    new SearchManager({
      "id": searchId,
      "earliest_time": "$earliest$",
      "latest_time": "$latest$",
      "search": metricSPL,
      "preview": true,
      "auto_cancel": 90,
      "cancelOnUnload": true,
      "runWhenTimeIsUndefined": false
    }, {tokens: true});

    return new ChartElement(_.extend({
      "id": `chart_metric_${metricName}`,
      "title": _(label).t(),
      "managerid": searchId,
      "tokenDependencies": metric.tokenDependencies,
      "charting.axisLabelsX.majorLabelStyle.rotation": "0",
      "charting.axisLabelsX.majorLabelStyle.overflowMode": "ellipsisNone",
      "charting.axisTitleX.visibility": "collapsed",
      "charting.axisTitleY.visibility": "visible",
      "charting.axisTitleY2.visibility": "visible",
      "charting.axisX.scale": "linear",
      "charting.axisY.scale": "linear",
      "charting.axisY2.scale": "inherit",
      "charting.axisY2.enabled": "0",
      "charting.chart": "line",
      "charting.chart.bubbleMaximumSize": "50",
      "charting.chart.bubbleMinimumSize": "10",
      "charting.chart.bubbleSizeBy": "area",
      "charting.chart.nullValueMode": "gaps",
      "charting.chart.showDataLabels": "none",
      "charting.chart.sliceCollapsingThreshold": "0.01",
      "charting.chart.stackMode": "default",
      "charting.chart.style": "shiny",
      "charting.drilldown": "all",
      "charting.layout.splitSeries.allowIndependentYRanges": "0",
      "charting.layout.splitSeries": "0",
      "charting.legend.placement": "top",
      "charting.legend.labelStyle.overflowMode": "ellipsisMiddle",
      "resizable": true
    }, metric.viewOptions || {}), {tokens: true});
  }

  function removeMetricChart(metricName) {
    var chart = mvc.Components.getInstance(`chart_metric_${metricName}`);
    if(!_.isUndefined(chart)) {
      chart.remove();
    }

    var manager = mvc.Components.getInstance(`search_${metricName}`);
    if(!_.isUndefined(manager)) {
      manager.dispose();
    }
  }

  /*
   * handle metric selection changes.
   * when it changed, we try to keep the number of search as little as possible.
   * we do this by:
   *   * keep the untouched charts
   *   * remove the un-selected charts
   *   * add newly-selected charts
   *
   * @param view the View element of the multiselect input (.visualization).
   * @param panelNumInRow indicates how many panels should be shown in a row. (default 2)
   */
  function onMetricChange(view, panelNumInRow) {
    if(_.isUndefined(view._data) || _.isNull(view._data)) {
      // don't do anything if the input has no data.
      return;
    }

    if(_.isUndefined(panelNumInRow)) {
      panelNumInRow = 2;
    }

    var newValue = view.settings.get("value");
    if(newValue.indexOf("*") > -1) {
      newValue = _(view._data).map(function(obj) {
        return obj.metric_name;
      });
    }

    var oldValue = view.settings.previous("value") || [];
    if(oldValue.indexOf("*") > -1) {
      oldValue = _(view._data).map(function(obj) {
        return obj.metric_name;
      });
    }

    var toKeep = _.intersection(oldValue, newValue);
    var toAdd  = _.difference(newValue, oldValue);

    var getPanel = function(metricName) {
      return mvc.Components.getInstance(`panel_metric_${metricName}`);
    };

    var newPanel = function(metricName) {
      var panel = new Panel({id: `panel_metric_${metricName}`}).render();
      panel.addChild(createMetricChart(metricName));
      return panel;
    };

    // firstly, we keep the panels which don't need to be removed
    var oldPanels = _.compact(_(toKeep).map(function(metricName) {
      var panel = getPanel(metricName);
      if(_.isUndefined(panel)) {
        // somehow, the panel is not on the dashboard, we will create it
        return newPanel(metricName);
      } else {
        panel.$el.detach();
        return panel;
      }
    }));

    // then, we remove all old rows, and the remaining panels
    for(let i = 0; ; i++) {
      /* jshint loopfunc: true */
      let row = mvc.Components.getInstance(`row_metric_${i}`);
      if(_.isUndefined(row)) { break; }

      _(row.getChildContainer().children(".dashboard-cell")).each(function(cell) {
        var name = _(cell.id.split("_")).last();
        var panel = getPanel(name);
        panel.remove();
        removeMetricChart(name);
      });
      row.remove();
    }

    // create new panels & charts for new metrics
    // and append them to the old panels
    // so we get all panels we need to show
    var panels = oldPanels.concat(_(toAdd).map(newPanel));

    // create rows and put panels into rows
    // and show them on the dashboard
    var row;
    var renderRow = function() {
      if(!_.isUndefined(row)) {
        row.render();
        row.$el.appendTo($(".dashboard-body"));
      }
    };

    _(panels).each(function(panel, i) {
      if(i % panelNumInRow === 0) {
        renderRow();
        row = new Row({
          id: `row_metric_${Math.floor(i / panelNumInRow)}`,
          tokenDependencies: {
            depends: "$form.dimensionFilter$"
          }
        });
      }
      panel.$el.appendTo(row.getChildContainer());
    });
    renderRow();
  }

  new SearchManager({
    "id": "search_metric_names",
    "search": '`aws-cloudwatch-rds($accountId$, $region$)` $dimensionFilter$ | fields metric_name | dedup metric_name | sort metric_name',
    "earliest_time": "$earliest$",
    "latest_time": "$latest$",
    "auto_cancel": 90,
    "preview": false,
    "runWhenTimeIsUndefined": false
  }, {tokens: true});

  var metricInput = new MultiSelectInput({
    "label": _("Metrics").t(),
    "managerid": "search_metric_names",
    "valueField": "metric_name",
    "labelField": "metric_name",
    "choices": [{label: "All", value: "*"}],
    "el": $('#input_metric_names'),
    "width": "100%",
    "tokenDependencies": {
      "depends": "$form.dimensionFilter$"
    }
  }, {tokens: true});

  metricInput.on("create:visualization", function() {
    this.visualization.val = InputUtil.multiSelectVal;
  });

  metricInput.on("change", function() {
    onMetricChange(this.visualization);
  });

  metricInput.on("datachange", function() {
    var viz = this.visualization;

    if(!this.hasValue() || _.isEmpty(this.val())) {
      // set default values, this is better than the "default" option,
      // because "default" option will show even it doesn't have those options available
      let defaultChoices = [
        "CPUUtilization",
        "FreeableMemory",
        "FreeStorageSpace",
        "SwapUsage",
        "ReadIOPS",
        "WriteIOPS",
        "ReadLatency",
        "WriteLatency"
      ];

      let availableChoices = _(viz._data).map(function(obj) { return obj.metric_name; });

      this.val(_.intersection(defaultChoices, availableChoices));
    } else {
      onMetricChange(viz);
    }
  });

  metricInput.render();

  // VIEWS: VISUALIZATION ELEMENTS

  var engineNames = {
    "aurora":        "Aurora",
    "mysql":         "MySQL",
    "mariadb":       "MariaDB",
    "postgres":      "PostgreSQL",
    "oracle-se":     "Oracle SE",
    "oracle-ee":     "Oracle EE",
    "oracle-se1":    "Oracle SE One",
    "oracle-se2":    "Oracle SE Two",
    "sqlserver-se":  "SQL Server SE",
    "sqlserver-ee":  "SQL Server EE",
    "sqlserver-ex":  "SQL Server Express",
    "sqlserver-web": "SQL Server Web"
  };

  var splCaseExp = "case(" +
    _(engineNames).map(function(v, k) {
      return `engine="${k}", "${v}"`;
    }).join(",") +
    ")";

  var searchInstancesSPL = '`aws-description-resource("$accountId$", " $region$", "rds_instances")` | search $rdsIdFilter$ | eval Engine = '
    + splCaseExp + ' . "-" . engine_version, DBName = if(DBName = "null", "", DBName), multi_az = if(multi_az = "true", "Yes", "No"), create_time=if(create_time="null", "", create_time)'
    + '| table Engine, id, DBName, status, allocated_storage, instance_class, availability_zone, multi_az, create_time'
    + '| rename id as "DB Instance", DBName as "DB Name", status as "Status", instance_class as "Class", allocated_storage as "Allocated Storage (GB)", availability_zone as "Availability Zone", multi_az as "Multi-AZ", create_time as "Created Time"';

  new SearchManager({
    "id": "search_instances_list",
    "search": searchInstancesSPL,
    "earliest_time": "-7d",
    "latest_time": "now",
    "auto_cancel": 90,
    "preview": true,
    "runWhenTimeIsUndefined": false
  }, {tokens: true});

  var table = new TableElement({
    "title": _("RDS Instance Details").t(),
    "count": 10,
    "dataOverlayMode": "none",
    "drilldown": "row",
    "rowNumbers": false,
    "wrap": false,
    "managerid": "search_instances_list",
    "el": $('#table_rds_instance_details')
  }, {tokens: true});

  table.on("create:visualization", function() {
    // table.visualization.addCellRenderer(
    //   new LogoCellRenderer({fieldName: 'Engine'})
    // );

    table.visualization.addRowExpansionRenderer(
      new RowExpandsionRenderer({
        accountToken: "$accountId$",
        regionToken:  "$region$"
      })
    );
  });

  table.render();

});
