'use strict';

const	ClientConnection	= require( './clientconnection' ),
		CouchConnection		= require( './couch.js' ),
		MailService			= require( './mailservice.js' ),
		Crypto				= require( './crypto.js' ),
		Static				= require( './static.js' ),
		stripHTML			= require( 'sanitize-html' ),
		path				= require( 'path' );

const	{ Seconds, Minutes, Hours, timeout, extend, Composition, readFile, writeFile, mkdirSync, log } = require( './toolkit.js' );


const	DEVMODE	= process.argv[ 2 ] === 'dev';


class Server extends Composition( CouchConnection, MailService, ClientConnection, Crypto, Static ) {
	constructor( input = { } ) {
		super( ...arguments );

		extend( this ).with( input ).and({
			DEVMODE:				DEVMODE,
			name:					'Boni Homines Crowd Funding Server',
			uri:					DEVMODE ? 'https://dev.bonihomines.de' : 'https://www.bonihomines.de',
			baseRootPath:			DEVMODE ? '/var/www/html/dev.bonihomines.de' : '/var/www/html/bonihomines.de',
			imageRootPath:			DEVMODE ? '/var/www/html/dev.bonihomines.de/images' : '/var/www/html/bonihomines.de/images',
			staticRootPath:			DEVMODE ? '/var/www/html/dev.bonihomines.de/static' : '/var/www/html/bonihomines.de/static'
		});

		//this.ignoredPackets.set( '???', true );

		return this.init();
	}

	async init() {
		super.init && await super.init( ...arguments );

		log( `\nServer ${ this.name } is listening on port ${ this.port }.`, 'green' );
		log( `Server is ready and waiting for incoming connections...\n---------------\n`, 'green' );

		process.on( 'SIGINT', this.onProcessExit.bind( this ) );
		process.on( 'uncaughtException', this.onProcessExit.bind( this ) );
		process.on( 'SIGTERM', this.onProcessExit.bind( this ) );
	}

	async adminNotification( subject = `admin notification [${ this.uri }]`, content = '' ) {
		let mailStatus = await this.sendMail({
			toList:		'support@bonihomines.de',
			subject:	subject,
			text:		stripHTML( content, { allowedTags: [ ] } ),
			html:		content.replace( /\n/g, '<br/>' )
		});

		console.log( 'Admin Notification: ', subject, content );
	}

	//////////////////////////////////////////////////

	async onProcessExit() {
		this.DEVMODE && log( 'Processing & storing in-memory data while exiting server process...', 'yellow' );

		this.DEVMODE && log( 'done.', 'green' );
		process.exit();
	}
}

if( DEVMODE ) {
	log( 'DEV MODE SERVER', 'yellow' );
	new Server({ name: 'EXAMPLE', port: 2246 });
} else {
	log( 'PROD MODE SERVER, WE ARE LIVE BOYS', 'red' );
	new Server({ name: 'EXAMPLE', port: 2244 });
}
