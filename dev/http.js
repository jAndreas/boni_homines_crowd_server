'use strict';

const	express		= require( 'express' ),
		bodyParser	= require( 'body-parser' );

const httpServer	= express();

let HTTP = target => class extends target {
	constructor() {
		super( ...arguments );

		httpServer.use( bodyParser.json() );       // to support JSON-encoded bodies
		httpServer.use( bodyParser.urlencoded({     // to support URL-encoded bodies
			extended: true
		}));

		httpServer.get('/paypal', function(req, res){
			console.log('GET !!!');
			console.dir(req._parsedUrl);

			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end('fu');
		});

		httpServer.post('/paypal', function(req, res){
			console.log('POST !!!!');
			console.log(req.body);
			res.writeHead(200, {'Content-Type': 'text/html'});
			res.end('thanks');
		});

		httpServer.listen( 2248 );

		console.log('HTTP server listening on 2248..');
	}

	async init() {
		super.init && await super.init( ...arguments );
	}
}

module.exports = exports = HTTP;
