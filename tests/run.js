// Tests require PhantomJS and Casper.js

var casper = require('casper').create(),
    t = casper.test,
    baseUrl = "http://localhost:8080/";
    
// extend the tester with some custom assertions

t.assertText = function(selector, expected, message) {
    f = new Function("return $('" + selector + "').first().text().trim()")
    t.assertEvalEquals(f, expected, message);
}

t.assertVisible = function(selector, message) {
    f = new Function("return !!$('" + selector + ":visible').length")
    t.assertEval(f, message);
}

t.assertRoute = function(expected, message) {
    var getHash = function() {
        return window.location.hash.substr(1);
    };
    if (expected instanceof RegExp) {
        t.assertMatch(casper.evaluate(getHash), expected, message);
    } else {
        t.assertEvalEquals(getHash, expected, message);
    }
};

t.assertInfoWindow = function(expected, message) {
    t.assertVisible('div.infowindow', "Info window is open");
    t.assertText('div.infowindow h3', expected + ' (Zoom In)', message);
};

// bundled assertions

t.assertAtIndexView = function() {
    t.assertRoute('index', "Index route correct");
    t.assertVisible('#index-view', "Index view is visible");
}
t.assertAtBookSummaryView = function() {
    t.assertRoute(/^book\/\d+/, 'Book Summary route correct');
    t.assertVisible('#book-summary-view', "Book Summary view is visible");
}
t.assertAtBookReadingView = function() {
    t.assertRoute(/^book\/\d+\/read/, 'Book reading route correct');
    t.assertVisible('#book-view', "Book Reading view is visible");
}
t.assertAtBookPlaceView = function() {
    t.assertRoute(/^book\/\d+\/place\/\d+/, 'Place Detail route correct');
    t.assertVisible('#book-place-view', "Place Detail view is visible");
}

// set up and run suites
var fs = require('fs'),
    tests = [];

if (casper.cli.args.length) {
    tests = casper.cli.args.filter(function(path) {
        return fs.isFile(path) || fs.isDirectory(path);
    });
} else {
    casper.echo('No test path passed, exiting.', 'RED_BAR', 80);
    casper.exit(1);
}

t.on('tests.complete', function() {
    this.renderResults(true);
});

t.runSuites.apply(casper.test, tests);