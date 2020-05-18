define(['jquery',
    'contrib/text!app/views/insights/templates/RI_planner/OptimalRITooltipTemplate.html'], function ($, OptimalRITooltipTemplate) {
    return {
        ONE_YEAR_DAY: 365,
        ONE_DAY_HOUR: 24,
        ONE_HOUR_SECOND: 3600,
        ONE_YEAR_MONTH: 12,
        ONE_DAY_MIS: 86400000,
        ONE_HOUR_MIS: 3600000,
        TIMESTAMP_TO_SPLUNK_TIME_COEF: 0.001,
        DEFAULT_SMALLEST_SIZE: 'small',
        CHART_CONTAINER_ID: 'chartContainer',
        DEDUP_PREFIX: 'instance_hour.',
        EVENT: {
            DRAG_POINT: 'point',
            SELECT_TIME: 'time',
            RESET: 'reset'
        },
        NO_DESCRIPTION_MESSAGE: 'It requires description data to get existing reserved instance information.',
        PARAM:
            '| tstats summariesonly=t count FROM datamodel=Instance_Hour where instance_hour.AvailabilityZone!="Unspecified" ' +
            ' by instance_hour.LinkedAccountId instance_hour.instance_type instance_hour.platform instance_hour.tenancy instance_hour.AvailabilityZone ' +
            '| rename instance_hour.AvailabilityZone as availability_zone, instance_hour.LinkedAccountId as aws_account_id, ' +
            ' instance_hour.instance_type as instance_type, instance_hour.platform as platform, instance_hour.tenancy as tenancy ' +
            '| eval availability_zone_len=len(availability_zone), region=substr(availability_zone, 0, availability_zone_len-1)' +
            '| lookup regions region OUTPUT label as regionLabel ' +
            '| lookup ri_billing_to_description billing as platform OUTPUT description as platformLabel ' +
            '| lookup ri_billing_to_description billing as tenancy OUTPUT description as tenancyLabel' +
            '| stats count by aws_account_id, region, platform, tenancy, instance_type, regionLabel, platformLabel, tenancyLabel',
        RI:
            '| tstats summariesonly=t count as <%=name %> FROM datamodel=Instance_Hour where <%= dedupSpl %> AND instance_hour.LinkedAccountId="<%= accountId %>" ' +
            ' AND instance_hour.AvailabilityZone="<%= location %>" AND instance_hour.instance_type="<%= type %>" ' +
            ' AND instance_hour.platform="<%= platform %>" AND instance_hour.tenancy="<%= tenancy %>" by _time span=1h ' +
            '| timechart span=1<%=slice %> sum(<%=name %>) as <%=name %> ' +
            '| fillnull',
        SIZE_FLEXIBILITY_RI:
            '| tstats summariesonly=t count FROM datamodel=Instance_Hour where <%= dedupSpl %> AND instance_hour.LinkedAccountId="<%= accountId %>"' +
            ' AND instance_hour.AvailabilityZone="<%= location %>" AND instance_hour.instance_type="<%= type %>" ' +
            ' AND instance_hour.platform="<%= platform %>" AND instance_hour.tenancy="<%= tenancy %>" by instance_hour.instance_type, _time span=1h ' +
            '| rename instance_hour.instance_type as instance_type ' +
            '| eval size=split(instance_type, "."), size=mvindex(size, 1)' +
            '| lookup ri_normal_factor size OUTPUT factor ' +
            '| eval unit = count * factor / <%= refer %> ' +
            '| timechart span=1<%=slice %> sum(unit) as <%= name %> ' +
            '| fillnull',
        /**
         * TODO: Add-on use a regex to grab billing report. The default regex contains resources-and-tags. However, users might
         * modify the report name and regex, so the ideally solution is to : 1. fetch the inputs; 2. get the regex; 3. update the SPL
         */
        BILLING_REPORT_ENDTIME:
            '| inputlookup billing_report_s3key ' +
            '| search eventtype="aws_billing_detail_report" '+
            '| rex field=source ".*aws-billing-detailed-line-items-.*(?<timestr>\\d{4}-\\d{2}).csv.zip" ' +
            '| sort 0 - timestr',
        PREDICT_RI:
            '| predict current_ih as recommended_ih future_timespan=<%= oneYearHour %> ' +
            '| appendcols [<%= instanceHourSPL %> ' +
            '| predict current_d as recommended_d future_timespan=<%= oneYearDay %> | eval d_time=_time]',
        // not apply filters in SPL because we need to find out that existing RI is "N/A" or "0" when there is no result
        BOUGHT_RI:
            '`aws-description-resource("*", "*", "ec2_reserved_instances")` ' +
            '| search state="active" '+
            '| stats sum(instance_count) as instance_count by aws_account_id, region, description, instance_tenancy, Scope, instance_type ' +
            '| rename description as platform, instance_tenancy as tenancy',
        FLEXIBILITY_FAMILY_INFO:
            '| inputlookup price ' +
            '| append [|inputlookup cn_price] ' +
            '| where os="Linux" AND tenancy="Shared" ' +
            '| sort on_demand_hourly ' +
            '| eval instance_type=split(instance_type,"."), family=mvindex(instance_type,0), size=mvindex(instance_type,1) ' +
            '| fields region, family, size ' +
            '| mvcombine size',
        NORMAL_FACTOR:
            '| inputlookup ri_normal_factor',
        // RI planner detail chart related configuration
        EVENT: {
            DRAG_POINT: 'point',
            SELECT_TIME: 'time',
            RESET: 'reset'
        },
        // RI planner table related configuration
        TABLE: {
            SORT_INDEX: [8, 7, 6],
            EXISTING_RI_INDEX: 6,
            OPTIMAL_RI_INDEX: 7,
            YEARLY_SAVING_INDEX: 8,
            MESSAGE_INDEX: 9,
            MESSAGE: 'Details',
            ITEM_NAME: {SINGLE: 'item', PLURAL: 'items'},
            columnName: ['', 'Account ID', 'Region', 'Platform', 'Tenancy', 'Instance type', 'Existing RIs', 'Optimal RIs', 'Estimated yearly savings', 'Details'],
            columnType: [['expand'], ['sort'], ['sort'], ['sort'], ['sort'], ['sort'], ['sort','tooltip'], ['sort', 'headerTooltip','tooltip'], ['sort'], ['tooltip', 'drilldown']],
            headerParams: {
                'Optimal RIs': {
                    tooltipTemplate: OptimalRITooltipTemplate
                }
            },
            footerParams: {
                '': {
                    colspan: 8
                },
                'Estimated yearly savings': {
                    colspan: 2
                }
            },
            columnParams: {
                'Details': {
                    tooltipPlacement: 'top',
                    tooltipOnClick: 'return false;'
                },
                'Existing RIs': {
                    tooltipPlacement: 'top',
                    tooltipOnClick: 'return false;'
                },
                'Optimal RIs': {
                    tooltipPlacement: 'top',
                    tooltipOnClick: 'return false;'
                }
            }
        },
        // RI planner detail's filter configuration
        FILTERS: {
            BASE_OPTIONS: [
                {
                    value: 'history',
                    label: 'History'
                },
                {
                    value: 'prediction',
                    label: 'Prediction'
                }
            ],
            PAYMENT_OPTIONS: [
                {
                    value: 'all',
                    label: 'All upfront'
                },
                {
                    value: 'partial',
                    label: 'Partial upfront'
                },
                {
                    value: 'no',
                    label: 'No upfront'
                }
            ]
        }
    }
});
