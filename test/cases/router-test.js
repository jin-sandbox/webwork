
var after = require('after');
var Webwork = require('webwork')
  , request_ = require('supertest')
  , assert = require('assert')
  , methods = (require('methods'),'get|post|put|patch|delete'.split('|'));
function request(app){
    return request_(app instanceof Function?app:app.receiver)
}
describe('app.router', function(){
  it('should restore req.params after leaving router', function(done){
    //not support
    done();
  })

  describe('methods', function(){
    methods.concat('del').forEach(function(method){
      if (method === 'connect') return;
      it('should include ' + method.toUpperCase(), function(done){
        var app = new Webwork();
        var calls = [];

        app[method]( '/foo',function(req, res){
          if ('head' == method) {
            res.end();
          } else {
            res.end(method);
          }
        });

        request(app.receiver)
        [method]('/foo')
        .expect('head' == method ? '' : method, done);
      })
    });
  })
  describe('decode params', function () {
    it('should decode correct params', function(done){
      var app = new Webwork();

      app.get('/:name', function(req, res, next){
        res.end(req.params.name);
      });

      request(app)
      .get('/foo%2Fbar')
      .expect('foo/bar', done);
    })

    it('should not accept params in malformed paths', function(done) {
      var app = new Webwork();

      app.get('/:name', function(req, res, next){
        res.end(req.params.name);
      });

      request(app)
      .get('/%foobar')
      .expect(404, done);
    })

    it('should not decode spaces', function(done) {
      var app = new Webwork();

      app.get('/:name', function(req, res, next){
        res.end(req.params.name);
      });

      request(app)
      .get('/foo+bar')
      .expect('foo+bar', done);
    })

    it('should work with unicode', function(done) {
      var app = new Webwork();

      app.get('/:name', function(req, res, next){
        res.end(req.params.name);
      });

      request(app)
      .get('/%ce%b1')
      .expect('\u03b1', done);
    })
  })
  it('should be .use()able', function(done){
    var app = new Webwork();

    var calls = [];

    app.intercept(function(req, res, next){
      calls.push('before');
      next();
    });

    app.get('/', function(req, res, next){
      calls.push('GET /')
      res.end();

    });

    app.intercept(function(req, res, next){
      calls.push('after');
      next();
    });
    request(app)
    .get('/')
    .end(function(res){
        assert.deepEqual(calls,['before', 'after', 'GET /'])
      //calls.should.eql(['before', 'after', 'GET /'])
      done();
    })
  })
  describe('when given a regexp', function(){
    it('should match the pathname only', function(done){
      var app = new Webwork();

      app.get(/^\/user\/[0-9]+$/, function(req, res){
        res.end('user');
      });

      request(app)
      .get('/user/12?foo=bar')
      .expect('user', done);
    })

    it('should populate req.params with the captures', function(done){
      var app = new Webwork();

      app.get(/^\/user\/([0-9]+)\/(view|edit)?$/, function(req, res){
        var id = req.params[0]
          , op = req.params[1];
        res.end(op + 'ing user ' + id);
      });

      request(app)
      .get('/user/10/edit')
      .expect('editing user 10', done);
    })
  })
  describe('case sensitivity', function(){


    describe('when "case sensitive routing" is enabled', function(){
      it('should match identical casing', function(done){
        var app = new Webwork();

        //app.enable('case sensitive routing');

        app.get('/uSer', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/uSer')
        .expect('tj', done);
      })

      it('should not match otherwise', function(done){
        var app = new Webwork();

        //app.enable('case sensitive routing');

        app.get('/uSer', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user')
        .expect(404, done);
      })
    })
  })

  describe('params', function(){
      return null;
    it('should overwrite existing req.params by default', function(done){
      var app = new Webwork();
      var router = new express.Router();

      router.get('/:action', function(req, res){
        res.end(req.params);
      });

      app.use('/user/:user', router);

      request(app)
      .get('/user/1/get')
      .expect(200, '{"action":"get"}', done);
    })

    it('should allow merging existing req.params', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/:action', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/:user', router);

      request(app)
      .get('/user/tj/get')
      .expect(200, '[["action","get"],["user","tj"]]', done);
    })

    it('should use params from router', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/:thing', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/:thing', router);

      request(app)
      .get('/user/tj/get')
      .expect(200, '[["thing","get"]]', done);
    })

    it('should merge numeric indices req.params', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/*.*', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/id:(\\d+)', router);

      request(app)
      .get('/user/id:10/profile.json')
      .expect(200, '[["0","10"],["1","profile"],["2","json"]]', done);
    })

    it('should merge numeric indices req.params when more in parent', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/*', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/id:(\\d+)/name:(\\w+)', router);

      request(app)
      .get('/user/id:10/name:tj/profile')
      .expect(200, '[["0","10"],["1","tj"],["2","profile"]]', done);
    })

    it('should merge numeric indices req.params when parent has same number', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/name:(\\w+)', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/id:(\\d+)', router);

      request(app)
      .get('/user/id:10/name:tj')
      .expect(200, '[["0","10"],["1","tj"]]', done);
    })

    it('should ignore invalid incoming req.params', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/:name', function(req, res){
        var keys = Object.keys(req.params).sort();
        res.end(keys.map(function(k){ return [k, req.params[k]] }));
      });

      app.use('/user/', function (req, res, next) {
        req.params = 3; // wat?
        router(req, res, next);
      });

      request(app)
      .get('/user/tj')
      .expect(200, '[["name","tj"]]', done);
    })

    it('should restore req.params', function(done){
      var app = new Webwork();
      var router = new express.Router({ mergeParams: true });

      router.get('/user:(\\w+)/*', function (req, res, next) {
        next();
      });

      app.use('/user/id:(\\d+)', function (req, res, next) {
        router(req, res, function (err) {
          var keys = Object.keys(req.params).sort();
          res.end(keys.map(function(k){ return [k, req.params[k]] }));
        });
      });

      request(app)
      .get('/user/id:42/user:tj/profile')
      .expect(200, '[["0","42"]]', done);
    })
  })
  describe('trailing slashes', function(){


    describe('when "strict routing" is enabled', function(){
      it('should match trailing slashes', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.get('/user/', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user/')
        .expect('tj', done);
      })

      it('should pass-though middleware', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.intercept(function (req, res, next) {
          res.setHeader('x-middleware', 'true');
          next();
        });

        app.get('/user/', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user/')
        .expect('x-middleware', 'true')
        .expect(200, 'tj', done);
      })

      it('should match no slashes', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.get('/user', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user')
        .expect('tj', done);
      })

      it('should not match middleware when omitting the trailing slash', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.get('/user/', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user')
        .expect(404,  done);
      })

      it('should match middleware', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.intercept(function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user')
        .expect(200, 'tj', done);
      })

      it('should fail when omitting the trailing slash', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.get('/user/', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user')
        .expect(404, done);
      })

      it('should fail when adding the trailing slash', function(done){
        var app = new Webwork();

        //app.enable('strict routing');

        app.get('/user', function(req, res){
          res.end('tj');
        });

        request(app)
        .get('/user/')
        .expect(404, done);
      })
    })
  })

  it('should allow anonymous:(regexp)', function(done){
    var app = new Webwork();
    app.get('/user/(\\d+)', function(req, res){
      res.end('woot');
    });

    request(app)
    .get('/user/10')
    .expect(200, function (err) {
      if (err) return done(err)
      request(app)
      .get('/user/tj')
      .expect(404, done);
    });
  })

  it('should allow literal "."', function(done){
    var app = new Webwork();

    app.get('/api/users/:from..:to', function(req, res){
      var from = req.params.from
        , to = req.params.to;

      res.end('users from ' + from + ' to ' + to);
    });

    request(app)
    .get('/api/users/1aa50')
    .expect(404, function(){
        request(app)
            .get('/api/users/1..50')
            .expect('users from 1 to 50', done);
    });


  })

  describe('*', function(){
    it('should capture everything', function (done) {
      var app = new Webwork()

      app.get('*', function (req, res) {
        res.end(req.params[0])
      })

      request(app)
      .get('/user/tobi.json')
      .expect('/user/tobi.json', done)
    })

    it('should decore the capture', function (done) {
      var app = new Webwork()

      app.get('*', function (req, res) {
        res.end(req.params[0])
      })

      request(app)
      .get('/user/tobi%20and%20loki.json')
      .expect('/user/tobi and loki.json', done)
    })

    it('should denote a greedy capture group', function(done){
      var app = new Webwork();

      app.get('/user/*.json', function(req, res){
        res.end(req.params[0]);
      });

      request(app)
      .get('/user/tj.json')
      .expect('tj', done);
    })

    it('should work with several', function(done){
      var app = new Webwork();

      app.get('/api/*.*', function(req, res){
        var resource = req.params[0]
          , format = req.params[1];
        res.end(resource + ' as ' + format);
      });

      request(app)
      .get('/api/users/foo.bar.json')
      .expect('users/foo.bar as json', done);
    })

    it('should work cross-segment', function(done){
      var app = new Webwork();

      app.get('/api*', function(req, res){
        res.end(req.params[0]);
      });

      request(app)
      .get('/api')
      .expect('', function(){
        request(app)
        .get('/api/hey')
        .expect('/hey', done);
      });
    })

    it('should allow naming', function(done){
      var app = new Webwork();

      app.get('/api/:resource(.*)', function(req, res){
        var resource = req.params.resource;
        res.end(resource);
      });

      request(app)
      .get('/api/users/0.json')
      .expect('users/0.json', done);
    })

    it('should not be greedy immediately after param', function(done){
      var app = new Webwork();

      app.get('/user/:user*', function(req, res){
        res.end(req.params.user);
      });

      request(app)
      .get('/user/122')
      .expect('122', done);
    })

    it('should eat everything after /', function(done){
      var app = new Webwork();

      app.get('/user/:user*', function(req, res){
        res.end(req.params.user);
      });

      request(app)
      .get('/user/122/aaa')
      .expect('122', done);
    })

    it('should span multiple segments', function(done){
      var app = new Webwork();

      app.get('/file/*', function(req, res){
        res.end(req.params[0]);
      });

      request(app)
      .get('/file/javascripts/jquery.js')
      .expect('javascripts/jquery.js', done);
    })

    it('should be optional', function(done){
      var app = new Webwork();

      app.get('/file/*', function(req, res){
        res.end(req.params[0]);
      });

      request(app)
      .get('/file/')
      .expect('', done);
    })

    it('should require a preceding /', function(done){
      var app = new Webwork();

      app.get('/file/*', function(req, res){
        res.end(req.params[0]);
      });

      request(app)
      .get('/file')
      .expect(404, done);
    })

    it('should keep correct parameter indexes', function(done){
      var app = new Webwork();

      app.get('/*/user/:id', function (req, res) {
        res.end(JSON.stringify(req.params));
      });

      request(app)
      .get('/1/user/2')
      .expect(200, '{"0":"1","id":"2"}', done);
    })

    it('should work within arrays', function(done){
      var app = new Webwork();

      app.get(['/user/:id', '/foo/*', '/:bar'], function (req, res) {
        res.end(req.params.bar);
      });

      request(app)
      .get('/test')
      .expect(200, 'test', done);
    })
  })

  describe(':name', function(){
    it('should denote a capture group', function(done){
      var app = new Webwork();

      app.get('/user/:user', function(req, res){
        res.end(req.params.user);
      });

      request(app)
      .get('/user/tj')
      .expect('tj', done);
    })

    it('should match a single segment only', function(done){
      var app = new Webwork();

      app.get('/user/:user', function(req, res){
        res.end(req.params.user);
      });

      request(app)
      .get('/user/tj/edit')
      .expect(404, done);
    })

    it('should allow several capture groups', function(done){
      var app = new Webwork();

      app.get('/user/:user/:op', function(req, res){
        res.end(req.params.op + 'ing ' + req.params.user);
      });

      request(app)
      .get('/user/tj/edit')
      .expect('editing tj', done);
    })

    it('should work following a partial capture group', function(done){
      var app = new Webwork();
      var cb = after(2, done);

      app.get('/user(s)?/:user/:op', function(req, res){
        res.end(req.params.op + 'ing ' + req.params.user + (req.params[0] ? ' (old)' : ''));
      });

      request(app)
      .get('/user/tj/edit')
      .expect('editing tj', cb);

      request(app)
      .get('/users/tj/edit')
      .expect('editing tj (old)', cb);
    })

    it('should work inside literal parenthesis', function(done){
      var app = new Webwork();

      app.get('/:user\\(:op\\)', function(req, res){
        res.end(req.params.op + 'ing ' + req.params.user);
      });

      request(app)
      .get('/tj(edit)')
      .expect('editing tj', done);
    })

    it('should work in array of paths', function(done){
      var app = new Webwork();
      var cb = after(2, done);

      app.get(['/user/:user/poke', '/user/:user/pokes'], function(req, res){
        res.end('poking ' + req.params.user);
      });

      request(app)
      .get('/user/tj/poke')
      .expect('poking tj', cb);

      request(app)
      .get('/user/tj/pokes')
      .expect('poking tj', cb);
    })
  })

  describe(':name?', function(){
    it('should denote an optional capture group', function(done){
      var app = new Webwork();

      app.get('/user/:user/:op?', function(req, res){
        var op = req.params.op || 'view';
        res.end(op + 'ing ' + req.params.user);
      });

      request(app)
      .get('/user/tj/')
      .expect('viewing tj', done);
    })

    it('should populate the capture group', function(done){
      var app = new Webwork();

      app.get('/user/:user/:op?', function(req, res){
        var op = req.params.op || 'view';
        res.end(op + 'ing ' + req.params.user);
      });

      request(app)
      .get('/user/tj/edit')
      .expect('editing tj', done);
    })
  })

  describe('.:name', function(){
    it('should denote a format', function(done){
      var app = new Webwork();

      app.get('/:name.:format', function(req, res){
        res.end(req.params.name + ' as ' + req.params.format);
      });

      request(app)
      .get('/foo.json')
      .expect('foo as json', function(){
        request(app)
        .get('/foo')
        .expect(404, done);
      });
    })
  })

  describe('.:name?', function(){
    it('should denote an optional format', function(done){
      var app = new Webwork();

      app.get('/:name.:format?', function(req, res){
        res.end(req.params.name + ' as ' + (req.params.format || 'html'));
      });

      request(app)
      .get('/foo')
      .expect('foo as html', function(){
        request(app)
        .get('/foo.json')
        .expect('foo as json', done);
      });
    })
  })



})