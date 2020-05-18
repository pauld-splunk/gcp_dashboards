require([
        'app/routers/ConfigureRouter',
        'util/router_utils',
        'app/models/Config',
        'appcss/pages/configure/bootstrap.pcss'
    ],
    function (
         Router,
         Router_utils,
         Config
    ) {
        // load config context data
        Config.loadContext().done(function(){
            new Router();
            Router_utils.start_backbone_history();
        });
    });