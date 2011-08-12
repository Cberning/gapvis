/*!
 * Copyright (c) 2011, Nick Rabinowitz / Google Ancient Places Project
 * Licensed under the BSD License (see LICENSE.txt)
 */

/**
 * @namespace
 * Top-level namespace for the GapVis application
 */
var gv = (function(window) {
    var API_ROOT = 'stub_api';

    // namespace within the anonymous function
    var gv = {},
        Backbone = window.Backbone,
        ctrl;
        
    //---------------------------------------
    // Models
    //---------------------------------------
    
    // set up default model
    var Model = Backbone.Model.extend({
        
            // add .json to url
            url: function() {
                return Backbone.Model.prototype.url.call(this) + '.json'
            },
            
            // remove save/destroy
            save: $.noop,
            destroy: $.noop
            
        }),
        Collection = Backbone.Collection,
        Place, PlaceList, Page, PageList, Book, BookList;
        
    // Model: Place
    Place = Model.extend({
        defaults: {
            title: "Untitled Place"
        },
    });
    
    // Model: Page
    Page = Model.extend({
        initialize: function() {
            this.set({
                title:'Page ' + this.id
            });
            // XXX: should I map place ids to real Places?
        }
    });
    
    // Model: Book
    Book = Model.extend({
        defaults: {
            title: "Untitled Book"
        },
        
        url: function() {
            return API_ROOT + '/book/' + this.id + '/full.json';
        },
        
        initialize: function() {
            var book = this,
                // create collections
                places = book.places = new PlaceList(),
                pages = book.pages = new PageList();
            places.book = book;
            book.pages.book = book;
        },
        
        // reset collections with current data
        initCollections: function() {
            this.places.reset(this.get('places'));
            this.pages.reset(this.get('pages'));
        },
        
        // array of page labels for timemap
        labels: function() {
            return this.pages.map(function(p) { return p.id });
        },
        
        // array of items for timemap
        timemapItems: function() {
            var book = this,
                items = [];
            this.pages.each(function(page) {
                var places = page.get('places') || [];
                places.forEach(function(placeId) {
                    var place = book.places.get(placeId),
                        ll = place.get('ll');
                    items.push({
                        title: place.get('title'),
                        point: {
                            lat: ll[0],
                            lon: ll[1]
                        },
                        page: page.id,
                        options: {
                            place: place
                        }
                    });
                });
            });
            return items;
        }
    });
    
    // Collection: PlaceList
    PlaceList = Collection.extend({
        model: Place,
        url: API_ROOT + '/place'
    });
    
    // Collection: PageList
    PageList = Collection.extend({
        model: Page,
        url: function() {
            return API_ROOT +  '/book/' + this.book.id + '/page';
        }
    });
    
    // Collection: BookList
    BookList = Collection.extend({
        model: Book,
        url: API_ROOT +  '/books.json'
    });
    
    //---------------------------------------
    // Views
    //---------------------------------------
    
    // default view
    var View = Backbone.View.extend({
            open: function() {
                $(this.el).show();
            },
            close: function() {
                $(this.el).hide();
            }
        }),
        BookListView, IndexView, 
        BookView, BookTitleView, TimemapView;
    
    // View: BookListView (item in book index)
    BookListView = View.extend({
        tagName: 'li',
        
        events: {
            "click": "open"
        },
        
        render: function() {
            $(this.el).html(this.model.get('title'));
            return this;
        },
        
        open: function() {
            ctrl.navigate('book/' + this.model.id, true);
        }
    });
    
    // View: IndexView (index page)
    IndexView = View.extend({
        el: '#index-view',
        
        initialize: function() {
            var books = this.model;
            books.bind('reset', this.addList, this);
        },
        
        addList: function() {
            this.model.forEach(function(book) {
                var view = new BookListView({ model:book });
                this.$("#book-list").append(view.render().el);
            })
        }
    });
    
    // View: BookView (master view for the book screen)
    BookView = View.extend({
        el: '#book-view',
        
        initialize: function() {
            var view = this,
                book = this.model;
            book.fetch({ 
                success: function() {
                    book.initCollections();
                    view.initViews();
                }
                // XXX: error
            });
        },
        
        initViews: function() {
            var $el = $(this.el);
            this.views = {
                title: new BookTitleView({ model: this.model }),
                timemap: new TimemapView({ model: this.model })
            };
            _(this.views).each(function(view) {
                $el.append(view.render().el);
            });
            this.views.timemap.initTimemap();
        },
        
        clear: function() {
            $(this.el).empty();
        }
    });
    
    // View: BookTitleView (title and metadata)
    BookTitleView = View.extend({
        tagName: 'div',
        id: 'book-title-view',
        
        initialize: function() {
            this.template = _.template($('#book-title-template').html())
        },
        
        render: function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
        }
    });
    
    // View: TimemapView
    TimemapView = View.extend({
        tagName: 'div',
        id: 'timemap-view',
        
        initialize: function() {
            this.template = $('#timemap-template').html();
        },
        
        render: function() {
            $(this.el).html(this.template);
            return this;
        },
        
        initTimemap: function() {
            var book = this.model,
                // create band info
                bandInfo = [
                    Timeline.createBandInfo({
                        width:          "88%", 
                        intervalUnit:   Timeline.DateTime.YEAR, 
                        intervalPixels: 110,
                        eventSource:    false
                    }),
                    Timeline.createBandInfo({
                        width:          "12%", 
                        intervalUnit:   Timeline.DateTime.DECADE, 
                        intervalPixels: 200,
                        overview:       true,
                        eventSource:    false
                    })
                ],
                // add custom labeller
                labelUtils = new LabelUtils(bandInfo, book.labels(), function() { return false; });
            
            this.tm = TimeMap.init({
                mapId: "map",
                timelineId: "timeline",
                options: {
                    eventIconPath: "images/"
                },
                datasets: [
                    {
                        theme: "blue",
                        type: "basic",
                        options: {
                            items: book.timemapItems(),
                            transformFunction: function(item) {
                                item.start = labelUtils.getLabelIndex(item.page) + ' AD';
                                return item;
                            }
                        }
                    }
                ],
                bands: bandInfo
            });
        }
    });
    
    //---------------------------------------
    // Controller
    //---------------------------------------
    
    var Ctrl = Backbone.Router.extend({
    
        initialize: function() {
            // we'll always need the list of books
            this.books = new BookList();
            this.books.fetch();
        },

        routes: {
            "":            "index",
            "book/:bid":   "book",
        },
        
        index: function() {
            // index is cached
            if (!this.indexView) {
                this.indexView = new IndexView({ model: this.books });
            }
            this.open(this.indexView);
        },
        
        book: function(bid) {
            bid = parseInt(bid);
            if (bid != this.currentBookId) {
                this.currentBookId = bid;
                var book = new Book({ id: bid });
                this.bookView = new BookView({ model:book });
            }
            this.open(this.bookView);
        },
        
        // close the current view and open a new one
        open: function(view) {
            if (view) {
                var oldview = this.currentView;
                if (oldview && oldview != view) {
                    oldview.close();
                }
                this.currentView = view;
                view.open();
            }
        }

    });
    
    gv.init = function() {
        ctrl = gv.ctrl = new Ctrl();
        Backbone.history.start();
    }
    
    return gv;
}(window));

// kick things off
$(gv.init);

// Throws an annoying error otherwise
SimileAjax.History.enabled = false;