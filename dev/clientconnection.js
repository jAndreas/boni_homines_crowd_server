'use strict';

const	socketio	= require( 'socket.io' )(),
		stripHTML	= require( 'sanitize-html' );

const	{ extend, Seconds, log }	= require( './toolkit.js' );

const	defaultPort		= 2000;

let ClientConnection = target => class extends target {
	constructor( input = { } ) {
		super( ...arguments );

		extend( this ).with({
			socket:	socketio.listen( input.port || defaultPort, {
						pingTimeout:		Seconds( 10 ),
						pingInterval:		Seconds( 30 ),
						transports:			[ 'websocket', 'polling' ]
					})
		}).and( input );
	}

	async init() {
		super.init && await super.init( ...arguments );

		this.socket.on( 'connection', this.newConnection.bind( this ) );
	}

	newConnection( client ) {
		client.clientIPAddress		= client.request.headers[ 'x-forwarded-for' ] || client.conn.transport.socket._socket.remoteAddress;

		log( `New Client Connection from: ${ client.clientIPAddress }`, 'green' );

		client.use( this.dataHook.bind( this, client ) );
		client.on( 'disconnect', this.closeConnection.bind( this, client ) );
		client.on( 'paymentInfo', this.paymentInfo.bind( this, client ) );
		client.on( 'paymentInfoDebug', this.paymentInfoDebug.bind( this, client ) );
		client.on( 'getFundingStatus', this.getFundingStatus.bind( this, client ) );
		client.on( 'userMessage', this.userMessage.bind( this, client ) );
	}

	async closeConnection( client, reason ) {
		log( `Closed connection from: ${ client.clientIPAddress } (${ client.id }), reason: ${ reason }`, 'red' );

		client = null;
	}

	async dataHook( client, [ name, data, answer ], next ) {
		console.log( client.clientIPAddress, ' - Incoming: ', name );

		next();
	}

	async paymentInfo( client, payload, answer ) {
		try {
			payload.payment.message = stripHTML(payload.payment.message, {
				allowedTags: [ ]
			});
			payload.payment.message = payload.payment.message.replace( /\n/g, ' ' );

			let status = await this.newPayer( payload.payment );
			log( `New payment stored, status: ${ status }`, 'purple' );

			this.socket.emit( 'globalPaymentUpdate', {
				name:		`${ payload.payment.payerFirstName } ${ payload.payment.payerLastName.slice( 0, 1 ) }.`,
				amount:		parseFloat( payload.payment.amount ),
				time:		payload.payment.time,
				message:	payload.payment.message
			});

			answer( status );
		} catch( ex ) {
			log( `paymentInfo: ${ ex.message }`, 'red' );

			answer(this.message({
				error:	'Es ist ein unbekannter Fehler aufgetreten (paymentInfo).',
				code:	0xa2
			}));
		}
	}

	async paymentInfoDebug( client, payload, answer ) {
		try {
			if( this.createHash( payload.payment.pw || '', 'DEBUGMODE' || '' ).hashedpass === '3f9a336844e672ff5c879cdfb3fabf3856205ea2dd353b604f14c671e3361dd4ef2fd745ae3b1902b2af8b5ac5c7812f59f2d371b5ea75cdd40c9d9f2d70eb85' ) {
				payload.payment.message = stripHTML(payload.payment.message, {
					allowedTags: [ ]
				});
				payload.payment.message 	= payload.payment.message.replace( /\n/g, ' ' );
				payload.payment.time		= new Date().toISOString();
				payload.payment.method		= 'paypal';
				payload.payment.payerStatus	= 'VERIFIED';
				payload.payment.payerEmail	= 'debug@debug.com';
				payload.payment.address		= {};
				payload.payment.state		= 'approved';
				delete payload.payment.pw;

				let status = await this.newDebugPayer( payload.payment );
				log( `New DEBUG payment stored, status: ${ status }`, 'yellow' );

				this.socket.emit( 'globalPaymentUpdate', {
					name:		`${ payload.payment.payerFirstName } ${ payload.payment.payerLastName.slice( 0, 1 ) }.`,
					amount:		parseFloat( payload.payment.amount ),
					time:		payload.payment.time,
					message:	payload.payment.message
				});

				answer( status );
			} else {
				console.log( 'Illegal debug password' );
			}
		} catch( ex ) {
			log( `paymentInfo: ${ ex.message }`, 'red' );

			answer(this.message({
				error:	'Es ist ein unbekannter Fehler aufgetreten (paymentInfo).',
				code:	0xa2
			}));
		}
	}

	async getFundingStatus( client, payload, answer ) {
		try {
			let couchData	= await super.getFundingStatus(),
				res			= Object.create( null );

			res.goal		= 15000;
			res.amount		= 0;
			res.units		= [ ];

			for( let doc of couchData.docs ) {
				res.units.push({
					name:		`${ doc.payerFirstName } ${ doc.payerLastName.slice( 0, 1 ) }.`,
					amount:		doc.amount || '???',
					message:	doc.message || '',
					time:		doc.time
				});

				res.amount += parseFloat( doc.amount ) || 0;
			}

			answer( res );
		} catch( ex ) {
			log( `getFundingStatus: ${ ex.message }`, 'red' );

			answer(this.message({
				error:	'Es ist ein unbekannter Fehler aufgetreten (getFundingStatus).',
				code:	0xa2
			}));
		}
	}

	async userMessage( client, payload, answer ) {
		try {
			this.adminNotification( 'Neue Nachricht (Boni Homines)', `Von: ${ payload.data.name }\nE-Mail: ${ payload.data.email }\nFrage: ${ payload.data.question }\nProblem: ${ payload.data.problem }\n\n${ payload.data.content }` );
		} catch( ex ) {
			log( `userMessage: ${ ex.message }`, 'red' );

			answer(this.message({
				error:	'Es ist ein unbekannter Fehler aufgetreten (userMessage).',
				code:	0xa2
			}));
		}
	}

	message( info ) {
		return Object.assign({
			data:		{ },
			msg:		'',
			error:		'',
			errorCode:	0,
			warning:	''
		}, info );
	}
};

module.exports = exports = ClientConnection;
