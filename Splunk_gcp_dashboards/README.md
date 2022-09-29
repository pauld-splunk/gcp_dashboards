<! --- Version 1.1 -->
# GCP Application Template for Splunk

This application template provides visualizations, reports, and searches for Google Cloud Platform data gathered utilizing the [Splunk Add-on for Google Cloud Platform]( https://splunkbase.splunk.com/app/3088/), Cloud Functions (see https://github.com/splunk/gcp_functions) or GCP DataFlow Splunk Template. The purpose of this application template is to provide a starting point for various use cases involving GCP data.  Add to, delete from, and modify this template to fit your own requirements.
Correlate other data sources with GCP Data to provide greater Operational or Security Intelligence.
Note - Metrics data can be collected in 3 ways depending on your requirements - GCP Add-On (Event), Cloud Functions (Event or Metrics Store), Splunk Infrastructure Monitoring Add-On.

Each dashboard has the flexibility to allow for different collection and indexing methods. The reason for the need for this flexibility is that the format of the json data collected from PubSub differs between the Add-on and DataFlow - an additional "data." prefix layer is present with json content from the Add-On. Also, for performance reasons, it may be beneficial to use indexed extractions for the json content, which will allow for faster searches with tstats - the dashboards can be configured to use either standard and tstats searches. (see below for setup instructions)
Where metrics are required, it is possible to use metrics collected via the Add-On, Cloud functions (into metrics store), or by pulling from Splunk Infrastructure Monitoring using the SIM Add-On.


## Pre-requisites / Dependencies:

Install the Google Cloud Platform Add-on for the knowledge objects. https://splunkbase.splunk.com/app/3088/

### Add-Ons / Collection methods
This GCP App supports data to be collected into Splunk via the following methods:

1) Splunk Add-On for Google Cloud Platform (https://splunkbase.splunk.com/app/3088/)

All Data collection methods/sources supported (PubSub, Metrics, GCS)

2) GCP DataFlow. https://cloud.google.com/blog/products/data-analytics/connect-to-splunk-with-a-dataflow-template

All Data collected supported. (pre-install the GCP Add-On advised)

3) Data Manager (https://docs.splunk.com/Documentation/DM)

All Data collected from GCP supported. Note that this is for Splunk Cloud only

34 Cloud Functions https://github.com/splunk/gcp_functions

All Data collected supported. (pre-install the GCP Add-On)

5) Splunk Infrastructure Monitoring Add-on (SIM) https://splunkbase.splunk.com/app/5247/

All Metrics collected by SIM supported

Follow the instructions for these collection methods before setting up this app.

You will need assets information via Cloud Functions (see https://github.com/splunk/gcp_functions), or by using gcloud command / cron schedule (https://cloud.google.com/asset-inventory/docs/exporting-to-cloud-storage)


## Setup / Installation

### Sourcetypes
For the dashboards to work properly, you will need to ensure that these sourcetypes are used. This is especially important if you are using HEC as a collection method.

All logs via pub-sub : <strong>google:gcp:pubsub:message, google:gcp:pubsub:audit:admin_activity, google:gcp:pubsub:audit:data_access, google:gcp:pubsub:audit:system_event, google:gcp:pubsub:audit:policy_denied, google:gcp:pubsub:audit:auth, google:gcp:pubsub:platform, google:gcp:pubsub:access_transparency, google:gcp:buckets:accesslogs</strong>. See Docs for details

(Note vpc flow logs can also be <strong>google:gcp:compute:vpc_flows</strong>)

All asset data : <strong>google:gcp:assets</strong>, <strong>google:gcp:buckets:jsondata</strong> or <strong>google:gcp:compute:instance</strong>

All metrics (events) : google:gcp:monitoring

### Macros
The GCP app requires some initial setup of macros to work with your Splunk environment. Set the macro settings according to the tables below:


(Note that the current macro settings for the app can be viewed on the "setup" page on the App - if these are blank/empty, you will need to set them to the correct values before the dashboards work)

### Splunk Add-On for Google Cloud Platform
If you are collecting the GCP Pub-Sub data via the GCP Add-On, and also collecting metrics via the Add-On, then you will need to set the following :

<table>
<tr><td><strong>Macro</strong></td><td><strong>Value (and default)</strong></td><td><strong>Description</strong></td></tr>
<tr><td>gcp_index</td><td>index=gcp</td><td>Sets the index where the GCP Data will be stored by the Add-On</td></tr>
<tr><td>datatag</td><td>addon</td><td>Adds "data." as a JSON wrapper for PubSub Data</td></tr>
<tr><td>metricstag</td><td>addon</td><td>Sets the dashboards to use event based metrics from the Add-On</td></tr>
<tr><td>gcp_metrics</td><td>index=gcp_metrics</td><td>Sets the event index where the add-on stores the metrics</td></tr>
<tr><td>gcp_assets_index</td><td>`gcp_index`</td><td>Sets the event index where the asset information is stored. Default is set as the value for the gcp_index macro to be backward compatible</td></tr>
</table>
(note that if you are collecting metrics via Cloud Functions into Metrics store or using SIM, then the two metrics macros need to be set per the instructions below)

### DataFlow
If you are using DataFlow (without transformations) to collect the data from PubSub, then change the following:
<table>
<tr><td><strong>Macro</strong></td><td><strong>Value</strong></td><td><strong>Description</strong></td></tr>
<tr><td>datatag</td><td>dataflow</td><td>The payload from PubSub isn't "wrapped" by "data."</td></tr>
</table>

### SIM / SignalFX
If you are using the SIM / SignalFX (Splunk Infrastructure Monitoring) to collect metrics from GCP, you will need to use and configure connections on the SIM Add-On - https://splunkbase.splunk.com/app/5247/

Then set the following:
<table>
<tr><td><strong>Macro</strong></td><td><strong>Value</strong></td><td><strong>Description</strong></td></tr>
<tr><td>metricstag</td><td>sim</td><td>Sets the dashboards to use metrics collected from SIM / SignalFX using the Add-On</td></tr>
</table>

### Cloud Functions

PubSub: Cloud Functions can send data in either Add-On or DataFlow formats - refer to the function documentation for details, and set the macros accordingly.
Metrics: Cloud Functions can send metrics in either Add-On format (event index) or into Metrics Store. If you are collecting metrics into the event index, use the same settings as the Add-On, otherwise if using the metrics store, use the following:

<table>
<tr><td><strong>Macro</strong></td><td><strong>Value</strong></td><td><b>Description</b></td></tr>
<tr><td>gcp_index</td><td>index=gcp</td><td>Sets the index where the GCP Data will be stored</td></tr>
<tr><td>metricstag</td><td>metrics</td><td>Sets the dashboards to use metrics store</td></tr>
<tr><td>gcp_metrics</td><td>index=gcp_metrics</td><td>Ensure that this index is a METRICS index not event</td></tr>
<tr><td>gcp_assets_index</td><td>`gcp_index`</td><td>Sets the event index where the asset information is stored. Default is set as the value for the gcp_index macro to be backward compatible</td></tr>
</table>

## Search Performance
If you want to have significantly faster searches using indexed json extractions with tstats, you will need to set the following:

<table>
<tr><td><strong>Macro</strong></td><td><strong>Value</strong></td></tr>
<tr><td>tstatstag</td><td>usetstats</td></tr>
</table>

Note also that you will need to apply props.conf and transforms.conf updates to your local GCP-Add-on settings to apply this. (see below).

Default setting will be that this macro is set to "notstats", which will use standard searches, but will provide slower search performance, but will not require any changes to your GCP Add-On configuration.


### Props/Transforms

If you want to use tstats based searches for faster performance, you will need to apply these changes to your props.conf / transforms.conf in the local directory of the GCP Add-On.

For Splunk Cloud deployments, update the sourcetype in the UI (administrator access required)

**props.conf**

<pre>
[google:gcp:pubsub:message]
AUTO_KV_JSON = false
KV_MODE=none
INDEXED_EXTRACTIONS = json
TRUNCATE = 3000000
CHARSET=UTF-8

[google:gcp:compute:vpc_flows]
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false
KV_MODE = none

[google:gcp:assets]
DATETIME_CONFIG = CURRENT
SHOULD_LINEMERGE = false
AUTO_KV_JSON = false
KV_MODE=none
INDEXED_EXTRACTIONS = json
LINE_BREAKER = ([\r\n]+)
NO_BINARY_CHECK = true
disabled = false
TRANSFORMS-sourcetype_splunk_gcp_compute_instance=gcp_compute_instance
TRUNCATE=50000

[google:gcp:buckets:jsondata]
KV_MODE = none
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false

[google:gcp:compute:instance]
KV_MODE = none
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false




## limits.conf
As some of the json in GCP's message payloads are large, you will need to apply this update to your limits.conf: ($SPLUNK_HOME$/etc/system/local/limits.conf)

Note that for Splunk Cloud deployments, this will require a Support ticket to increase the values

<pre>
[kv]
limit = 0
indexed_kv_limit = 0
maxchars = 20480
maxcols = 0
max_extractor_time = 2000
</pre>

# Release Notes

## Version 1.1 Jan 2021

Initial Splunkbase release

## Version 1.2 
(minor updates and bugfixes)

Bugfixes (Compute Overview, vpc overview, iam overview)
Update to VPC & "Security Overview: Public Access" dashboards to align with other dashboards with datatags (compatability with Dataflow)
Update adding additional index for assets - gcp_assets_index. Backwards compatible
Update to default setting of usetstats macro - default is NOT to use this, i.e. the dashboards work without changing the default add-on sourcetype settings
Documentation update to transforms.conf and props.conf descriptions in the documentation: 
	- remove unused changes/ fix to props definitions which causes error
	- added props.conf indexed extraction for google:gcp:buckets:jsondata
	- added sourcetype descriptions
Added Service Account Activity External members access activity to IAM Activity Dashboard
Added VMs created by Default Service Account into IAM Activity Dashboard
Added Live Migrated Hosts to Compute Engine Overview


## Version 1.3 September 2022
Version updated to support Splunk Add-on for Google Cloud Platform version 4.0.0 and Data Manager 1.7 (or later)

- Includes minor bugfixes
- Updates to sourceypes for compatability with new add-on. Noting that this is backwards compatible with eariler versions of the sourcetypes in previous releases.
- New macros:
 "gcp_sourcetype_xx"= these support the new add-on sourcetypes - only change these if Add-On updates new sourcetypes
 "gke_internal_xx"= these are included to remove internal "noise" from gke service messages. (Infrastructure Activity dashboard). You can update this according to your requirements

## Version 1.3.1 September 2022
Minor fixes

Known Issue with Splunk 8.2 onwards: 
If using the accelerated version with tstats searches, warnings will be shown on all dashboards. These messages can be ignored.




