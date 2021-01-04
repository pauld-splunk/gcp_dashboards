# GCP Application Template for Splunk

This application template provides visualizations, reports, and searches for Google Cloud Platform data gathered utilizing the [Splunk Add-on for Google Cloud Platform]( https://splunkbase.splunk.com/app/3088/), Cloud Functions (see https://github.com/splunk/gcp_functions) or GCP DataFlow Splunk Template. The purpose of this application template is to provide a starting point for various use cases involving GCP data.  Add to, delete from, and modify this template to fit your own requirements.
Correlate other data sources with GCP Data to provide greater Operational or Security Intelligence.
Note - Metrics data can be collected in 3 ways depending on your requirements - GCP Add-On (Event), Cloud Functions (Event or Metrics Store), Splunk Infrastructure Monitoring Add-On.


### Pre-requisites / Dependencies:

Install the Google Cloud Platform Add-on for the knowledge objects. https://splunkbase.splunk.com/app/3088/

# Add-Ons / Collection methods
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

# Macros
The GCP app requires some initial setup of macros to work with your Splunk environment. Set the macro settings according to the tables below:


(Note below your current macro settings - if these are blank/empty, you will need to set them to the correct values before the dashboards work)

# Splunk Add-On for Google Cloud Platform
If you are collecting the GCP data via the GCP Add-On, then you will need to set the following :

<table>
<tr>
<td>
                <strong>Macro</strong>
              </td>
<td>
                <strong>Value (and default)</strong>>
              </td>
<td>
                <strong>Description</strong>>
              </td>
</tr>
<tr>
<td>gcp_index</td>
<td>index=gcp_index</td>
<td>Sets the index where the GCP Data will be stored by the Add-On</td>
</tr>
<tr>
<td>datatag</td>
<td>addon</td>
<td>Adds "data." as a JSON wrapper for PubSub Data</td>
</tr>
<tr>
<td>metricstag</td>
<td>addon</td>
<td>Sets the dashboards to use event based metrics from the Add-On</td>
</tr>
<tr>
<td>gcp_metrics</td>
<td>index=gcp_metrics</td>
<td>Sets the event index where the add-on stores the metrics</td>
</tr>
</table>

# DataFlow
If you are using DataFlow to collect the data from PubSub, then change the following:
<table>
<tr>
<td>
                <strong>Macro</strong>
              </td>
<td>
                <strong>Value</strong>
              </td>
<td>
                <strong>Description</strong>
              </td>
</tr>
<tr>
<td>datatag</td>
<td>dataflow</td>
<td>The payload from PubSub isn't "wrapped" by "data."</td>
</tr>
</table>

# SIM / SignalFX
If you are using the SIM / SignalFX (Splunk Infrastructure Monitoring) to collect metrics from GCP, you will need to use and configure connections on the SIM Add-On - https://splunkbase.splunk.com/app/5247/

Then set the following:
<table>
<tr>
<td><strong>Macro</strong>
              </td>
<td>
                <strong>Value</strong>
              </td>
<td>
                <strong>Description</strong>
              </td>
</tr>
<tr>
<td>metricstag</td>
<td>sim</td>
<td>Sets the dashboards to use metrics collected from SIM / SignalFX using the Add-On</td>
</tr>
</table>

# Cloud Functions
If you are using Cloud Functions to collect PubSub Data then use the defaults per the Add-On.
However, if you are collecting metrics into the metrics store using the Cloud Functions, use the following:

<table>
<tr>
<td>
                <strong>Macro</strong>>
              </td>
<td>
                <strong>Value</strong>>
              </td>
<td>
                <b>Description</b>
              </td>
</tr>
<tr>
<td>metricstag</td>
<td>metrics</td>
<td>Sets the dashboards to use metrics store</td>
</tr>
<tr>
<td>gcp_metrics</td>
<td>index=gcp_metrics</td>
<td>Ensure that this index is a METRICS index not event</td>
</tr>

</table>

## Search Performance
If you want to have significantly faster searches using indexed json extractions with tstats, you will need to set the following:

<table>

<tr>
<td>
                <strong>Macro</strong>>
              </td>
<td>
                <strong>Value (default)</strong>>
              </td>
</tr>
<tr>
<td>tstatstag</td>
<td>usetstats</td>
</tr>

</table>

Note also that you will need to apply props.conf and transforms.conf updates to your local GCP-Add-on settings to apply this. (see below).

Setting this macro to "notstats" will use standard searches, but will slow down search performance, but will not require any changes to your GCP Add-On configuration.


## Props/Transforms
If you want to use tstats based searches for faster performance, you will need to apply these changes to your props.conf / transforms.conf in the local directory of the GCP Add-On.

# props.conf

<pre>
[google:gcp:pubsub:message]

INDEXED_EXTRACTIONS = json
SHOULD_LINEMERGE = false
LINE_BREAKER = ([\r\n]+)\{
TIME_FORMAT = %Y-%m-%dT%H:%M:%S.%3N
MAX_TIMESTAMP_LOOKAHEAD = 30
TIME_PREFIX = \"timestamp\"\:\s+\"
TRUNCATE = 0
CHARSET=UTF-8
TRANSFORMS-sourcetype_gcp_compute_vpc_flow_logs
TRANSFORMS-gcp_set_meta = gcp_set_sourcetype, gcp_set_source, gcp_set_host

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

# transforms.conf
<pre>
[gcp_set_sourcetype]

REGEX = \"logName\"\:.+\/logs\/([^\.]+).+\%2F([^\"\,]+)
FORMAT = sourcetype::google:gcp:$1:$2
DEST_KEY = MetaData:Sourcetype

[gcp_set_source]
REGEX = \"logName\"\:\s?\"([^"]+)
FORMAT = source::$1
DEST_KEY = MetaData:Source

[gcp_set_host]
REGEX = \"logName\"\:\s?\"\w+\/([^\/]+)\/
FORMAT = host::$1
DEST_KEY = MetaData:Host

[sourcetype_gcp_compute_vpc_flow_logs]
REGEX = \"logName\"\:\s+\"\S*\/logs\/compute\.googleapis\.com\%2Fvpc_flows\"
FORMAT = sourcetype::google:gcp:compute:vpc_flows
DEST_KEY = MetaData:Sourcetype
</pre>

# limits.conf
As some of the json in GCP's message payloads are large, you will need to apply this update to your limits.conf: ($SPLUNK_HOME$/etc/system/local/limits.conf)

<pre>
[kv]
limit = 0
indexed_kv_limit = 0
maxchars = 20480
maxcols = 0
max_extractor_time = 2000
</pre>
