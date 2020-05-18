define([
    'underscore',
    'jquery',
    'backbone',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'splunkjs/mvc/savedsearchmanager',
    'views/shared/controls/CheckboxGroup',
    'app/utils/SearchUtil',
    'views/shared/Modal',
    'app/utils/Util',
    'util/splunkd_utils',
    'app/utils/HelpLinks'
], (_, $, Backbone, mvc, utils, SavedSearchManager, CheckboxGroup, SearchUtil, Modal, AppUtil, splunkd_utils, HelpLinks) => {
    'use strict';

    const appName = utils.getPageInfo().app;

    const BUTTON_SAVE = `<a href="#" id="tag-save" class="btn pull-right btn-primary">${_('Save').t()}</a>`;
    const BUTTON_CANCEL = `<a href="#" id="tag-cancel" class="btn pull-left">${_('Cancel').t()}</a>`;

    let TagModal = Modal.extend({
        events: {
            'click #tag-save': 'onSave',
            'click #tag-cancel': 'onCancel'
        },

        constructor: function(options) {
            options || (options = {});
            _.extend(options, {
                keyboard: false,
                backdrop: 'static'
            });
            Modal.call(this, options);
        },

        initialize: function() {
            Modal.prototype.initialize.apply(this, arguments);

            this.checkBoxTemplate = '\
                <div class="tag-key"><input type="checkbox" value="<%-tag%>" <%-checked%>/><%-tag%></div>\
            ';

            this.warningTemplate = '\
                <p>You can filter and group data in your Capacity Planner and Historical \
                Detailed Billing dashboards using your own custom tags. Select the tags \
                you would like to use on these dashboards from the list below. <b>For best \
                performance, select only the tags you need.</b></p> \
                <div class="tag-warning alert alert-warning"> \
                    <p>All changes on this screen cause your Capacity Planner and Historical \
                    Detailed Billing dashboards to be unavailable while their underlying data \
                    models are rebuilt. The time required depends on the volume of your \
                    billing data.</p> \
                    ' + AppUtil.buildLinkNode(HelpLinks.AWS_BILLING_TAGS) + ' </div>';

            this.noTagTemplate = '\
                <div class="alert alert-warning"> \
                    <i class="icon-alert"></i> \
                    No custom tags found. Please check "Billing: Billing Reports S3Key Generator" is scheduled.\
                </div> \
            ';

            if (!this.model) {
                this.model = new Backbone.Model();
            }

            this.model.set({
                'loaded': false,
                'tags': [],
                'modelTags': [],
                'state': 'Loading reports...'
            });


            const reg = /user:(.*?),/g;
            const keyReg = /user:(.*?)=/;

            let searchId = _.uniqueId('tags');

            SearchUtil.search(
                `
                    | inputlookup billing_report_s3key | search eventtype=aws_billing_detail_report | fields source
                    | map search="| search \`aws-billing-details("*")\` source="$source$" | head 1 | fields _raw"
                `,
                {
                    id: searchId
                }
                ).then((sources) => {
                    if (!sources || sources.length === 0) {
                        return;
                    }

                    sources.forEach(data => {
                        let prevTags = this.model.get('tags') || [];
                        try {
                            let spl = data._raw;
                            let matches = spl.match(reg);
                            if (!matches) {
                                return;
                            }
                            let tags = matches.map(key => {
                                let match = key.match(keyReg);
                                if (match && match[1]) {
                                    return match[1];
                                }
                            });

                            tags = prevTags.concat(tags);
                            tags = _.uniq(tags);

                            this.model.set('tags', tags);
                        } catch (err) {
                            console.log(err);
                            this.model.set('tags', prevTags);
                        }
                    });
                }).always(() => {
                    this.model.set('loaded', true);
                });

            // Update progress
            let sm = mvc.Components.get(searchId);
            if (sm) {
                sm.on('search:progress', (properties) => {
                    this.model.set('state', `Loading reports... ${Math.round(properties.content.doneProgress * 100)}%`);
                });
            }

            SearchUtil.search('| `aws-billing-datamodel-tags` | fields title | search title=*')
                .then((data) => {
                    if (data.length === 0) {
                        return;
                    }

                    this.model.set('modelTags', data.map(row => row.title));
                });

            this.listenTo(this.model, 'change:loaded', this.reRenderBody);
        },

        reRenderBody() {
            let tags = this.model.get('tags') || [];
            let modelTags = this.model.get('modelTags') || [];
            let $tagList = this.$(Modal.BODY_SELECTOR).find('#tag-list');

            tags = tags.concat(modelTags.filter((i) => tags.indexOf(i) === -1));

            if (!tags || tags.length === 0) {
                $tagList.html(_.template(this.noTagTemplate));
                this.$el.find('#tag-save').hide();
                return;
            }

            // A potential "bug" here.
            // If the user deletes the billing data, then tags will still be popup
            // However, this is the only way for the user to unselect a tag.
            let items = tags.map(tag => {
                return {
                    label: tag,
                    value: tag
                };
            });

            if (this.children.tagsCheckbox) {
                this.children.tagsCheckbox.remove();
            }

            this.children.tagsCheckbox = new CheckboxGroup({
                model: this.model,
                modelAttribute: 'modelTags',
                items: items
            });

            $tagList
                .empty()
                .append(this.children.tagsCheckbox.render().el);
        },

        render() {
            this.$el.html(Modal.TEMPLATE);
            this.$(Modal.HEADER_TITLE_SELECTOR).html('Select Billing Tags');
            this.$(Modal.BODY_SELECTOR).append(Modal.FORM_HORIZONTAL);
            this.$(Modal.BODY_SELECTOR).append(_.template(this.warningTemplate));
            this.$(Modal.BODY_SELECTOR).append('<div id="tag-list"></div>');
            this.$(Modal.FOOTER_SELECTOR).append(BUTTON_CANCEL);
            this.$(Modal.FOOTER_SELECTOR).append(BUTTON_SAVE);
        },

        onSave() {
            let newTags = this.model.get('modelTags');

            let url = splunkd_utils.fullpath("saas-aws/splunk_app_aws_data_model", {
                app: appName,
                sharing: 'app'
            });

            $.ajax({
                url: `${url}?output_mode=json`,
                type: 'post',
                dataType: 'json',
                data: {
                    'name': 'datamodel',
                    'tags': newTags.join('|')
                },
                success: () => {
                    this.onCancel();
                },
                error: () => {
                }
            });
        },

        onCancel() {
            this.hide();
        }
    });

    return TagModal;
});