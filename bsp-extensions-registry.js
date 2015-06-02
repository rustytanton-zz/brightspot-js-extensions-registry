(function(globals, factory) {
    if (typeof define === 'function' && define.amd) {
        define([ 'jquery'], factory);
    } else {
        globals.bsp_ext_registry = factory(globals.jQuery);
    }
})(this, function($) {

	return {
		baseObject: null,
		checks: 10,
		checkInterval: 100,
		extensions: [],
		messages: [],
		promises: {},
		ready: null,
		
		init: function(config) {
			var map;
			var ready = new $.Deferred();
			var self = this;
			self.ready = ready.promise();
			if
				(
					typeof config === 'object' &&
					$.isArray(config.extensions) &&
					typeof config.baseObject === 'object'
				)
			{
				if (config.extensions.length) {
					$.each(config.extensions, function(i, extension) {
						var deferred = new $.Deferred();
						Object.create(extension).init(config.baseObject, deferred);
						self.register(extension.name, deferred.promise());
						$.when(deferred.promise())
							.done(function(data) {
								self.messages.push({
									code: 0,
									description: extension.name + ' loaded',
									data: data
								});
							})
							.fail(function(data) {
								self.messages.push({
									code: 1,
									description: extension.name + ' failed to load',
									data: data
								});
							});
					});
					map = $.map(self.promises, function(val) { return val; });
					$.when.apply($, map)
						.done(function() {
							ready.resolve();
						})
						.fail(function() {
							ready.reject();
						});
				}
			} else {
				throw new Error("Extensions registry: invalid config");
			}
		},
		register: function(name, promise) {
			if (typeof name === "string" && typeof promise === "object") {
				this.promises[name] = promise;
			}
		},
		extensionReady: function(name) {
			var checkCount = 0;
			var deferred = new $.Deferred();
			var interval;
			var self = this;
			if (typeof name === "string") {
				if (typeof self.promises[name] === 'object') {
					return self.promises[name];
				} else {
					interval = setInterval(function() {
						if (typeof self.promises[name] === 'object') {
							clearInterval(interval);
							$.when(self.promises[name]).then(function() {
								deferred.resolve();
							});
						} else if (checkCount >= self.checks) {
							clearInterval(interval);
							deferred.reject();
						}
						checkCount++;
					}, self.checkInterval);
				}
			} else {
				deferred.reject();	
			}
			return deferred.promise();
		}
	};

});