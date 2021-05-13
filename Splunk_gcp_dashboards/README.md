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

3) Cloud Functions https://github.com/splunk/gcp_functions

All Data collected supported. (pre-install the GCP Add-On)

4) Splunk Infrastructure Monitoring Add-on (SIM) https://splunkbase.splunk.com/app/5247/

All Metrics collected by SIM supported

Follow the instructions for these collection methods before setting up this app.

You will need assets information via Cloud Functions (see https://github.com/splunk/gcp_functions), or by using gcloud command / cron schedule (https://cloud.google.com/asset-inventory/docs/exporting-to-cloud-storage)


## Setup / Installation

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
<tr><td>gcp_assets_index</td><td>index=gcp</td><td>Sets the event index where the asset information is stored</td></tr>
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
<tr><td>metricstag</td><td>metrics</td><td>Sets the dashboards to use metrics store</td></tr>
<tr><td>gcp_metrics</td><td>index=gcp_metrics</td><td>Ensure that this index is a METRICS index not event</td></tr>
</table>

## Search Performance
If you want to have significantly faster searches using indexed json extractions with tstats, you will need to set the following:

<table>
<tr><td><strong>Macro</strong></td><td><strong>Value</strong></td><td><strong>Default</strong></td></tr>
<tr><td>tstatstag</td><td>usetstats</td><td><strong>notstats</strong></td></tr>
</table>

Note also that you will need to apply props.conf and transforms.conf updates to your local GCP-Add-on settings to apply this. (see below).

Default setting will be that this macro is set to "notstats", which will use standard searches, but will slow down search performance, but will not require any changes to your GCP Add-On configuration.


### Props/Transforms

If you want to use tstats based searches for faster performance, you will need to apply these changes to your props.conf / transforms.conf in the local directory of the GCP Add-On.

**props.conf**

<pre>
[google:gcp:pubsub:message]

INDEXED_EXTRACTIONS = json
SHOULD_LINEMERGE = false
LINE_BREAKER = ([\r\n]+)\{
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3N
MAX_TIMESTAMP_LOOKAHEAD = 30
TIME_PREFIX = \"timestamp\"\:\s+\"
TRUNCATE = 0

[google:gcp:assets]
AUTO_KV_JSON = false
KV_MODE=none
INDEXED_EXTRACTIONS = json
LINE_BREAKER = ([\r\n]+)
NO_BINARY_CHECK = true
disabled = false
TRANSFORMS-sourcetype_splunk_gcp_compute_instance=gcp_compute_instance

[google:gcp:buckets:jsondata]
KV_MODE = none
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false

[google:gcp:compute:instance]
KV_MODE = none
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false

[google:gcp:compute:vpc_flows]
KV_MODE = none
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false
</pre>

**transforms.conf**
<pre>
[sourcetype_gcp_compute_vpc_flow_logs]
REGEX = \"logName\"\:\s+\"\S*\/logs\/compute\.googleapis\.com\%2Fvpc_flows\"
FORMAT = sourcetype::google:gcp:compute:vpc_flows
DEST_KEY = MetaData:Sourcetype
</pre>


## limits.conf
As some of the json in GCP's message payloads are large, you will need to apply this update to your limits.conf: ($SPLUNK_HOME$/etc/system/local/limits.conf)

<pre>
[kv]
limit = 0
indexed_kv_limit = 0
maxchars = 20480
maxcols = 0
max_extractor_time = 2000
</pre>

# Release Notes

## Version 1.0 Jan 2021

Initial release

## Version 1.1 

Update to VPC dashboards to align with other dashboards with datatags
Update adding additional index for assets - gcp_assets_index
Update to default setting of usetstats macro - default is NOT to use this, i.e. the dashboards work without changing the default add-on sourcetype settings

Documentation update to transforms.conf and props.conf descriptions in the documentation: remove unused changes/ fix to props definitions which causes error

