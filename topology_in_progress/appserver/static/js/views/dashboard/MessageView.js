define([
    'underscore',
    'jquery',
    'models/Base',
    'views/Base',
    'app/utils/Util',
    'splunkjs/mvc',
    'util/splunkd_utils',
    'splunkjs/mvc/utils',
    'app/utils/HelpLinks'
], function (_, $, BaseModel, BaseView, AppUtil, mvc, splunkd_utils, utils, HelpLinks) {
    'use strict';

    var appName = utils.getPageInfo().app,
        pageName = utils.getPageInfo().page;

    // Show warning message on dashboard.
    // Usage: call MessageView.setMessage(source, body, helpLink)
    var MessageView = BaseView.extend({
        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.model = new BaseModel({
                messages: {}
            });

            this.listenTo(this.model, 'change', this.render);
        },

        events: {
            'click .hide-messages': 'hideMessages'
        },

        // @param 
        //        source {String} the id of message
        // @param 
        //        body {String} the warning message body in plain text
        // @param 
        //        helpLink {String} the Splunk help location string. Leave it empty if there is no help page available.
        setMessage: function (source, body, helpLink, type) {
            if (typeof source === 'string' && source.length > 0) {
                let messages = _.clone(this.model.get('messages'));
                messages[source] = {
                    body: body,
                    helpLink: helpLink,
                    type: type || 'warning'
                };
                this.model.set('messages', messages);
            }
        },

        unsetMessage: function (source) {
            if (typeof source === 'string' && source.length > 0) {
                let messages = _.clone(this.model.get('messages'));
                delete messages[source];
                this.model.set('messages', messages);
            }
            else if (Object.prototype.toString.call(source) === '[object Array]') {
                let messages = _.clone(this.model.get('messages'));
                for (let i = 0; i < source.length; i++) {
                    let item = source[i];
                    delete messages[item];
                }
                this.model.set('messages', messages);
            }
        },

        clearAllMessages: function (type) {
            let messages = _.clone(this.model.get('messages'));
            Object.keys(messages).forEach(key => {
                if(messages[key].type === type) {
                    delete messages[key];
                }
            });
            this.model.set('messages', messages);
        },

        render: function () {
            var messages = this.model.get('messages');
            var containWarning = false;
            if (Object.keys(messages).length > 0) {
                var html = '';
                for (let key in messages) {
                    if (!messages.hasOwnProperty(key)) {
                        continue;
                    }
                    var message = messages[key];
                    containWarning |= message.type === 'warning'? true: false;
                    var helpLink = '';
                    if (message.helpLink) {
                        helpLink = AppUtil.buildLinkNode(message.helpLink);
                    }
                    var className = message.type === 'warning'? 'alert-warning' : (message.type === 'info'?'alert-info':'alert-error');
                    var template = _.template(this.template, {
                        warningClassName: className,
                        messageBody: message.body,
                        helpLink: helpLink
                    });

                    html += template;
                }

                if (html !== '' && containWarning)
                    html += `<a class="hide-messages">Hide Messages</a>`;

                this.$el.html(html);
            } else {
                this.$el.html('');
            }

            return this;
        },

        hideMessages: function () {
            var url = splunkd_utils.fullpath('saas-aws/splunk_app_aws_warning_message', {
                app: appName,
                sharing: 'app'
            });

            $.ajax({
                url: `${url}/${pageName}?output_mode=json`,
                type: 'delete',
                success: () => {
                    this.clearAllMessages('warning');
                }
            });
        },

        template: '\
            <div class="sourcetype-checker alert <%=warningClassName %>">\
                <i class="icon-alert" /><%= messageBody %></span> \
                <%= helpLink %> \
            </div> \
        '
    });

    var $fieldset = $('.dashboard-body .fieldset:eq(0)'),
        $messageDiv = $(`<div id="message-view"></div>`);

    $messageDiv.insertAfter($fieldset);

    var messageView = new MessageView({
        el: $messageDiv
    });

    return messageView;
});
