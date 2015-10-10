var Clock = function(clockFaceSvg, id, parentSelector) {
	var self = this;
	this.id = id || 'clock-' + Clock.count++;
	this.parentSelector = parentSelector;

	Clock.xhr.sendRequest({
		url : clockFaceSvg,
		headers : {
			'Content-Type' : 'image/svg+xml'
		}
	}, function(request) {
		return self.onLoad.apply(self, arguments);
	});
}

Clock.count = 0;
Clock.digitPattern = [
	[ 1, 0, 1, 1, 0, 1, 1, 1, 1, 1 ], 
	[ 1, 0, 0, 0, 1, 1, 1, 0, 1, 1 ], 
	[ 1, 1, 1, 1, 1, 0, 0, 1, 1, 1 ], 
	[ 0, 0, 1, 1, 1, 1, 1, 0, 1, 1 ], 
	[ 1, 0, 1, 0, 0, 0, 1, 0, 1, 0 ], 
	[ 1, 1, 0, 1, 1, 1, 1, 1, 1, 1 ], 
	[ 1, 0, 1, 1, 0, 1, 1, 0, 1, 1 ]
];

Clock.prototype.onLoad = function(request) {
	this.load(request.responseXML.documentElement);
	this.setup();
	this.run();
};

Clock.prototype.load = function(xml) {
	var svg = Clock.svg.cloneToDoc(xml);

	d3.select(this.parentSelector || 'body')
		.append('div')
			.attr('id', this.id)
			.classed('clock-wrapper', true)
			.append(function() {
				return document.importNode(svg, true);
			});
}

Clock.prototype.setup = function() {
	var wrapperSelector = '#' + this.id;
	var targetSelector = wrapperSelector + ' svg';
	var svgUnderlay = d3.select(targetSelector),
		svgOverlay = d3.select(wrapperSelector).append(function() {
			return svgUnderlay.node().cloneNode(true);
		}),
		svg = d3.selectAll(targetSelector);

	svgUnderlay.attr('class', 'underlay');
	svgOverlay.attr('class', 'overlay');

	this.digit = svg.selectAll('.digit');
	this.separator = svg.selectAll('.separator circle');
	this.digitCount = Clock.countChildren(svgUnderlay, '.digit');
}

Clock.prototype.run = function() {
	var self = this;
	
	(function() {
		self.tick(self);
	})();
}

Clock.prototype.tick = function(self) {
	var now = new Date,
		hours = now.getHours(),
		minutes = now.getMinutes(),
		seconds = now.getSeconds();

	var digit = self.digit.data([
		hours   / 10 | 0, hours   % 10,
		minutes / 10 | 0, minutes % 10,
		seconds / 10 | 0, seconds % 10
	]);

	for (var i = 0; i <= self.digitCount; i++) {
		digit.select('path:nth-child(' + (i + 1) + ')').classed('lit', function(d) {
			return Clock.digitPattern[i][d];
		});
	}

	self.separator.classed('lit', seconds & 1);

	setTimeout(self.tick, 1000 - now % 1000, self);
}

Clock.countChildren = function(node, selector) {
	return node.selectAll(selector)[0].length;
}

Clock.xhr = Clock.xhr || {};

Clock.xhr.XMLHttpFactories = [
	function () { return new XMLHttpRequest(); },
	function () { return new ActiveXObject('Msxml3.XMLHTTP'); },
	function () { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); },
	function () { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); },
	function () { return new ActiveXObject('Msxml2.XMLHTTP'); },
	function () { return new ActiveXObject('Microsoft.XMLHTTP'); },
];

// http://stackoverflow.com/a/2557268
Clock.xhr.sendRequest = function(config, callback) {
	config = config || {};
	
	var url = config.url;
	var jsonData = config.data;
	var headers = config.headers;

	var xhr = Clock.xhr.createXMLHTTPObject();
	
	if (!xhr) {
		return;
	}
	
	var method = jsonData != null ? 'POST' : 'GET';
	xhr.open(method, url, true);

	if (jsonData != null) {
		xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
	}
	
	if (headers != null) {
		for (var header in headers) {
			xhr.setRequestHeader(header, headers[header]);
		}
	}
	
	xhr.onreadystatechange = function () {
		if (xhr.readyState != 4) {
			return;
		}
		if (xhr.status != 200 && xhr.status != 304) {
			return;
		}
		callback(xhr);
	}
	
	if (xhr.readyState == 4) {
		return;
	}
	
	xhr.send(jsonData);
}

Clock.xhr.createXMLHTTPObject = function() {
    for (var i = 0; i < Clock.xhr.XMLHttpFactories.length; i++) {
        try {
            return Clock.xhr.XMLHttpFactories[i]();
        } catch (e) {
            continue;
        }
    }
    return null;
}

Clock.svg = Clock.svg || {};

// http://stackoverflow.com/a/7986519
Clock.svg.cloneToDoc = function(node, doc) {
	if (!doc) {
		doc = document;
	}

	var clone = doc.createElementNS(node.namespaceURI, node.nodeName);

	for (var i = 0, len = node.attributes.length; i < len; ++i) {
		var attr = node.attributes[i];

		if (/^xmlns\b/.test(attr.nodeName)) {
			continue; // IE can't create these
		}

		clone.setAttributeNS(attr.namespaceURI, attr.nodeName, attr.nodeValue);
	}

	for (var i = 0, len = node.childNodes.length; i < len; ++i) {
		var child = node.childNodes[i];

		clone.insertBefore(
			child.nodeType == 1
				? Clock.svg.cloneToDoc(child, doc)
				: doc.createTextNode(child.nodeValue),
			null
		);
	}

	return clone;
}
