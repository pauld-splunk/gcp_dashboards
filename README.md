# GCP Dashboards v1.0

# Splunk Dashboard Template for GCP

(Note that this repo will have regular updated versions)

This Splunk app contains a few SimpleXML dashboards for use with the Splunk Add-on for GCP or Cloud Functions.
You will need assets information via Cloud Functions (see https://github.com/splunk/gcp_functions), or by using gcloud command / cron schedule (https://cloud.google.com/asset-inventory/docs/exporting-to-cloud-storage)

Pre-requisites:
Install the Google Cloud Platform Add-on for the knowledge objects. https://splunkbase.splunk.com/app/3088/

The App requires the events to have the json indexed extracted, so use the sourcetype changes defined in the props/transforms folder here.
If you are using the functions linked above, ensure that all metrics collected are put into a metrics index. The searches in the template expects this index to be called "gcp_metrics"; if you have a different index names, please update in the app's macros.

Also, as some of the json in GCP's message payloads are large, you will need to apply this update to your limits.conf:

$SPLUNK_HOME$/etc/system/local/limits.conf

<pre>
[kv]
limit = 0
indexed_kv_limit = 0
maxchars = 20480 
maxcols = 0
max_extractor_time = 2000
</pre>

