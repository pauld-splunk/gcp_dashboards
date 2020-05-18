define([
    'jquery',
    'underscore',
    'splunkjs/mvc',
    'splunkjs/mvc/utils',
    'app/views/dashboard/MessageView'
], function($, _, mvc, utils, MessageView) {

    let page = utils.getPageInfo().page,
        app = utils.getPageInfo().app;

    let service = mvc.createService({
        owner: 'nobody',
        app: app
    });

    const INSIGHTS_MENUS = ['insights_overview', 'ec2_insights','eip_insights', 'elb_insights', 'ebs_insights', 'sg_insights', 'iam_insights'];

    return {
        disableInsights(navModel) {
            if (!_.isUndefined(sessionStorage['is_lite'])) {
                if (sessionStorage['is_lite'] === 'true') {
                    this._hideMenus(navModel);
                    this._showWarningMessage();
                }
                return;
            }

            service.request('server/info', 'GET').done((data) => {
                let productType = JSON.parse(data).entry[0].content.product_type,
                    isLite = (productType === 'lite' || productType === 'lite_free');

                if (isLite) {
                    this._hideMenus();
                    this._showWarningMessage();
                }

                sessionStorage['is_lite'] = isLite;
            });
        },

        _hideMenus(navModel) {
            // change nav model to trigger update nav bar
            if (navModel) {
                let navArray = navModel.get('nav'),
                    updatedNavArray = [],
                    viewNameChecker = (navItem) => navItem.viewName && INSIGHTS_MENUS.indexOf(navItem.viewName) === -1;

                navArray.forEach((rootNavItem) => {
                    // if it is second level, need to filter in submenu
                    if (rootNavItem.submenu) {
                        rootNavItem.submenu = _.filter(rootNavItem.submenu, viewNameChecker);
                        updatedNavArray.push(rootNavItem);
                    }
                    // if only has one level nav item, just need to check the viewName
                    else if (viewNameChecker(rootNavItem)) {
                        updatedNavArray.push(rootNavItem);
                    }
                });

                navModel.set('nav', updatedNavArray);
            }
            // directly remove them
            else {
                INSIGHTS_MENUS.forEach((page) => {
                    $(`.splunk-header a[href$='app/${app}/${page}']`).parent('li').remove();
                });
            }
        },

        _showWarningMessage() {
            if (INSIGHTS_MENUS.indexOf(page) !== -1) {
                MessageView.setMessage('insights', 'Some panels in this dashboard are not supported in Splunk Light. ');
            }
        }
    };
});