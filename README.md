# brightspot-js-extensions-registry

Most Brightspot Javascript plug-ins are small enough that a single JS file (perhaps depending on other requirejs modules) is sufficient. In some rare cases, it may be beneficial to break up a plugin into a main file which loads multiple extensions. This is more flexible than just writing another plug-in and extending a singleton, but also comes with some overhead.

## The singleton + Object.create way

    define('main', function() {
      return {
        init: function() {
          console.log('init'); return this;
        }
      };  
    });
    define('ext1', function() {
      return {
        ext1: function() {
          console.log('ext1'); return this;
        }
      };
    });
    define('ext2', function() {
      return {
        ext2: function() {
          console.log('ext2'); return this;
        }
      };
    });
    require(['main','ext1','ext2'], function(main, ext1, ext2) {
      var extended = $.extend(true, {}, main, ext1, ext2);
      Object.create(extended).init().ext1().ext2();
    });
    
    /** result in console: init, ext1, ext2 */
  
This works fine most of the time, but managing changes to the init code manually every time there is a change to an extension can get complicated quickly with a large codebase.

## The extension registry way

    define(['jquery','bsp-extensions-registry'], 'main', function($, registry) {
      return {
        init: function(extensions) {
          this.extensions = Object.create(registry).init({
            baseObject: this,
            extensions: extensions
          });
          $.when(this.extensions.ready).then(function() {
            console.log('ready');
          });
          console.log('init');
        }
      };
    });
    define('ext1', function() {
      return {
        name: 'ext1',
        init: function(obj, deferred) {
          console.log('ext1'); deferred.resolve();
        }
      };
    });
    define('ext2', function() {
      return {
        name: 'ext2',
        init: function(obj, deferred) {
          console.log('ext2'); deferred.resolve();
        }
      };
    });
    require(['main','ext1','ext2'], function(main, ext1, ext2) {
      Object.create(main).init([ext1, ext2]);
    });
    
    /** result in console: init, ext1, ext2, ready */

If you wanted to change ext1 to execute asynchronously, you don't have to make any changes to the main file or other extensions. You can just modify ext1:

    define('ext1', function() {
      return {
        name: 'ext1',
        init: function(obj, deferred) {
          setTimeout(function() {
            console.log('ext1'); deferred.resolve();
          }, 1000);
        }
      };
    });
    
    /** result in console: init, ext2, ext1, ready */

You can also make extensions dependent on other extensions:

  define('ext1', function() {
    return {
      name: 'ext1',
      init: function(obj, deferred) {
        console.log('ext1');
        $.when( obj.extensions.extensionReady('ext2') ).then(function() {
          console.log(obj.setByExt2); deferred.resolve();
        });
      }
    };
  });
  
  define('ext2', function() {
    return {
      name: 'ext2',
      init: function(obj, deferred) {
        console.log('ext2');
        obj.setByExt2 = 'setByExt2'; deferred.resolve();
      }
    };
  });
  
  /** result in console: init, ext1, ext2, setByExt2, ready */
  
You can chain multiple registries together to allow groups of extensions to be executed after other groups of extensions are loaded:

  define(['jquery','bsp-extensions-registry'], 'main', function($, registry) {
    return {
      init: function(extensions1, extensions2) {
        var self = this;
        this.extensions1 = Object.create(registry).init({
          baseObject: this,
          extensions: extensions1
        });
        this.extensions2 = Object.create(registry);
        $.when(this.extensions1.ready).then(function() {
          self.extensions2.init({
            baseObject: self,
            extensions: extensions2
          });
          $.when(self.extensions2.ready).then(function() {
            console.log('ready');
          });
        });
        console.log('init');
      }
    };
  });
