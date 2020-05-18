/**
 * Created by frank on 2016-02-17
 */

define(['backbone'], function(Backbone){
    return Backbone.Model.extend({
        defaults: {
            nodeData: {}, // caches nodes, contains coordinate information
            linkData: [], // caches array of links, contains coordinate information
            linkHash: {}, // determines whether the link is in the array, false or index of array
            eventList: [], // list of events
            types: {
                vpc: true,
                i: true,
                subnet: true,
                vol: false,
                sg: false,
                eni: false,
                elb: false,
                acl: false,
                rtb: false
            },
            lastModified: 0
        }
    });
});