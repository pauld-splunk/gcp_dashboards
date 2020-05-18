/**
 * Created by frank on 2016-03-21
 */

define(['backbone'], function(Backbone){
    var Locker = Backbone.Model.extend({
        defaults: {
            locked: false,
            context: null // cache the lock context, to enable re-entrance function
        },

        canLock: function(context){
            return !this.get('locked') || context === this.get('context');
        },

        // returns whether get lock successfully
        lock: function(context){
            var canLock = this.canLock(context);

            if(canLock){
                this.set('locked', true);
                this.set('context', context);
            }

            return canLock;
        },

        // releases lock
        release: function(){
            this.set('locked', false);
        },

        lockPreemptively: function(context){
            this.set('locked', true);
            this.set('context', context);
        }
    });

    return new Locker();
});