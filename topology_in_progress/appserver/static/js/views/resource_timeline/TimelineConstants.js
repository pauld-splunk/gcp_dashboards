/**
 * Created by frank on 2016-09-06
 */

define(function(){

    const NA_VALUE = 'N/A';
    const LONG_TEXT_CELL_RENDERER = (property) => `<div class='timeline-longtext-cell'>${property}</div>`;

    return {
        MAX_COUNT: 500,
        FILTER_NOT_EMPTY_WARNING: '"Resource" and "Service" filters cannot be empty.',
        SPLUNK_COLOR_LIST: ['#65a637', '#1e93c6', '#3863a0', '#a2cc3e', '#d6563c', '#f2b827', '#ed8440', '#cc5068', '#6a5c9e', '#11a88b'],
        CONFIG_NOTIFICATION_SERVICE: 'config',
        INSPECTOR_SERVICE: 'inspector',
        CLOUDTRAIL_SERVICE: 'cloudtrail',
        CONFIG_RULE_SERVICE: 'rules',
        PERSONAL_HEALTH_SERVICE: 'personalHeath',
        SQS_CUSTOM_EVENTS: 'sqsCustomEvents',
        SERVICE_READABLE_NAMES: {
            config: 'AWS Config Notification',
            cloudtrail: 'AWS Cloudtrail',
            inspector: 'AWS Inspector',
            rules: 'AWS Config Rules',
            personalHeath: 'AWS Personal Health',
            sqsCustomEvents: 'SQS Custom Events'
        },
        LOADING_IMAGE: '../../../static/app/splunk_app_aws/img/loading.gif',
        ICONS: {
            config: '../../../static/app/splunk_app_aws/img/config.svg',
            cloudtrail: '../../../static/app/splunk_app_aws/img/cloudtrail.svg',
            inspector: '../../../static/app/splunk_app_aws/img/inspector.svg',
            rules: '../../../static/app/splunk_app_aws/img/config.svg',
            sqsCustomEvents: '../../../static/app/splunk_app_aws/img/sqs.svg'
        },
        CHANGE_TYPE_READABLE_NAMES: {
            'UPDATE': 'Update Resource',
            'CREATE': 'Create Resource',
            'DELETE': 'Delete Resource'
        },
        CHANGE_PROPERTIES_WHITE_LIST: {
            cloudtrail: {
                eventType: {
                    label: 'Event Type'
                },
                eventSource: {
                    label: 'Event Source'
                },
                sourceIP: {
                    label: 'Source IP'
                },
                userAgent: {
                    label: 'User Agent'
                },
                requestParameters: {
                    label: 'Request Body',
                    makeText: LONG_TEXT_CELL_RENDERER
                }
            },
            config: {
                'Configuration.LaunchTime': {
                    label: 'Launch Time',
                    makeText: (property) => `${property.updatedValue}`
                },
                'Configuration.State.Name': {
                    label: 'Instance State',
                    makeText: (property) => `${property.previousValue || NA_VALUE} <span class='icon-arrow-right'></span> ${property.updatedValue || NA_VALUE}`
                },
                'Configuration.PublicDnsName': {
                    label: 'Public DNS Name',
                    makeText: (property) => `${property.previousValue || NA_VALUE} <span class='icon-arrow-right'></span> ${property.updatedValue || NA_VALUE}`
                },
                'Configuration.PublicIpAddress': {
                    label: 'Public IP Address',
                    makeText: (property) => `${property.previousValue || NA_VALUE} <span class='icon-arrow-right'></span> ${property.updatedValue || NA_VALUE}`
                }
            },
            inspector: {
                severity: {
                    label: 'Severity'
                },
                rules_package: {
                    label: 'Rules Package'
                },
                rule: {
                    label: 'Rule Name'
                },
                finding: {
                    label: 'Finding',
                    makeText: LONG_TEXT_CELL_RENDERER
                }
            },
            rules: {
                rule: {
                    label: 'Rule Name'
                }
            },
            personalHeath: {
                eventTypeCode: {
                    label: 'Code'
                },
                eventTypeCategory: {
                    label: 'Category'
                },
                timeRange: {
                    label: 'Time'
                },
                status: {
                    label: 'Status'
                },
                details: {
                    label: 'Details',
                    makeText: LONG_TEXT_CELL_RENDERER
                }
            },
            sqsCustomEvents: {
                time: {
                    label: 'Time'
                },
                description: {
                    label: 'Description',
                    makeText: (property) => `<div class='timeline-longtext-cell' style='max-height: 200px;'>${property}</div>`
                }
            }
        },
        RESOURCE_SPL_MAP: {
            'ec2_instances': '`aws-description-resource(<%=accountId%>, <%=region%>, "ec2_instances")`' +
                '| eval title=if(isnull(\'tags.Name\'), id, id + " (" + \'tags.Name\' + ")")' +
                '| sort title' +
                '| fields id, title',
            'classic_load_balancers': '`aws-description-clb(<%=accountId%>, <%=region%>)`' +
                '| eval id=uniq_id' +
                '| `aws-resource-uniqLabel`' +
                '| eval title=uniq_label' +
                '| sort title' +
                '| fields id, title',
            'application_load_balancers': '`aws-description-alb(<%=accountId%>, <%=region%>)`' +
                '| eval id=uniq_id' +
                '| `aws-resource-uniqLabel`' +
                '| eval title=uniq_label' +
                '| sort title' +
                '| fields id, title',
            'vpc_network_acls': '`aws-description-resource(<%=accountId%>, <%=region%>, "vpc_network_acls")`' +
                '| eval title=id' +
                '| sort title' +
                '| fields id, title',
            'ec2_security_groups': '`aws-description-resource(<%=accountId%>, <%=region%>, "ec2_security_groups")`' +
                '| eval title=if(isnull(\'tags.Name\'), id, id + " (" + \'tags.Name\' + ")")' +
                '| sort title' +
                '| fields id, title',
            'ec2_key_pairs': '`aws-description(<%=accountId%>, <%=region%>, "ec2_key_pairs", "fingerprint")`' +
                '|`aws-resource-uniqId`' +
                '| eval id=uniq_id' +
                '| `aws-resource-uniqLabel`' +
                '| eval title=uniq_label' +
                '| sort title' +
                '| fields id, title',
            'iam_users': '`aws-description(<%=accountId%>, "*", "iam_users", "Arn")`' +
                '| eval title=UserName + " (" + account_id + ")"' +
                '| rename Arn as id' +
                '| sort title' +
                '| fields id, title'
        },
        RESOURCE_TYPE_EC2: 'ec2_instances',
        RESOURCE_TYPE_CLB: 'classic_load_balancers',
        RESOURCE_TYPE_ALB: 'application_load_balancers',
        RESOURCE_TYPE_NACL: 'vpc_network_acls',
        RESOURCE_TYPE_SG: 'ec2_security_groups',
        RESOURCE_TYPE_KP: 'ec2_key_pairs',
        RESOURCE_TYPE_IAM_USER: 'iam_users'
    };
});