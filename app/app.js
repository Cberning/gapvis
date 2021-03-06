/*!
 * Copyright (c) 2011, Nick Rabinowitz / Google Ancient Places Project
 * Licensed under the BSD License (see LICENSE.txt)
 */

// removed in production by uglify
if (typeof DEBUG === 'undefined') {
    DEBUG = true;
    // cache busting for development
    require.config({
        urlArgs: "bust=" +  (new Date()).getTime()
    });
}

require.config({
    baseUrl: 'app'
});

require(['gv', 'config', 'models/Books', 'models/State', 'views/AppView', 'views/Layout', 'routers/Router'], 
    function(gv, config, Books) {
    
    // change Backbone.sync to use JSON/JSONP
    var defaultSync = Backbone.sync;
    Backbone.sync = function(method, model, options) {
        options = _.extend({
            dataType: gv.settings.API_DATA_TYPE,
            cache: true
        }, options);
        defaultSync(method, model, options);
    };
    
    // initialize empty book list
    gv.books = new Books();
    
    // add parameters for permalinks
    gv.addParameter('bookid', { deserialize: parseInt });
    gv.addParameter('pageid', { deserialize: String });
    gv.addParameter('entityid', { deserialize: String });
	gv.addParameter('treeid', { deserialize: String });
    gv.addParameter('pageview');
	gv.addParameter('treeview');
	gv.addParameter('sectionid');
    gv.addParameter('barsort');
    gv.addParameter('mapzoom', { deserialize: parseInt });
    gv.addParameter('mapcenter', { 
        deserialize: function(s) {
            var params = s.split(",");
            return params.length < 2 ? null :
                new mxn.LatLonPoint(
                    parseFloat(params[0]),
                    parseFloat(params[1])
                );
        }, 
        serialize: function(value) {
            return value.lat + "," + value.lng;
        }
    });

	
    // kick things off
    $(function() {
        gv.configure(config)
            .start();
        if (DEBUG) console.log('Application initialized');
    });
    
});