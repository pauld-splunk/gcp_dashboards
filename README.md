# GCP Dashboards v1.0

# Splunk Dashboard Templae for GCP


This Splunk app contains a few SimpleXML dashboards for use with the Splunk Add-on for GCP or Cloud Functions.
You will need assets information via Cloud Functions - see github.com/splunk/gcp_functions 

The App requires the events to have the json indexed extracted, so use the sourcetypes defined below.

Perform the following updates to config files to accomodate this:

$SPLUNK_HOME$/etc/apps/Splunk_TA_google-cloudplatform/local/props.conf
<pre>
[google:gcp:assets]
category = Custom
pulldown_type = 1
DATETIME_CONFIG = 
INDEXED_EXTRACTIONS = json
LINE_BREAKER = ([\r\n]+)
NO_BINARY_CHECK = true
disabled = false


[google:gcp:pubsub:message]
TIME_PREFIX = "publish_time":
TIME_FORMAT = %s.%Q
INDEXED_EXTRACTIONS = json
AUTO_KV_JSON = false
KV_MODE=none
TRUNCATE=0
CHARSET=UTF-8
</pre>


$SPLUNK_HOME$/etc/system/local/limits.conf

<pre>
[kv]
limit = 0
indexed_kv_limit = 0
maxchars = 20480
maxcols = 0
max_extractor_time = 2000
<pre>

