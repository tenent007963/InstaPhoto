// Import packages
const fs = require('fs');
const http=require('http');
const url=require('url');
const {Client} = require('pg'); //Postgres
//const monitorio = require('monitor.io'); // Monitoring each socket connection if possible, ref 'https://drewblaisdell.github.io/monitor.io/'
const { parse } = require('querystring');

const PORT = process.env.PORT || 3000;
const dbURL = process.env.DATABASE_URL;

//Init postgres connection & setup
const client = new Client({
    connectionString: dbURL
});
client.connect();
client.query('CREATE TABLE IF NOT EXISTS availableroom (room_id CHAR(11) PRIMARY KEY, server CHAR(8), client CHAR(8));', (err, res) => {
    if (err) throw err;
    //console.log(`Raw result from postgres:`,res);
});

//https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/
let server=http.createServer(function(req,res){
    let pathname=url.parse(req.url).pathname;
    let fsCallback = function(error, data) {
        if(error) throw error;

        res.writeHead(200);
        res.write(data);
        res.end();
    }
    switch(pathname){
		case '/server-dev':
            fs.readFile(__dirname + '/static/server-dev.html', 'utf8', fsCallback);
        break;
		case '/pc':
            fs.readFile(__dirname + '/static/server-source.html', 'utf8', fsCallback);
        break;
		case '/client-dev':
            fs.readFile(__dirname + '/static/client-dev.html', 'utf8', fsCallback);
        break;
		case '/phone':
            fs.readFile(__dirname + '/static/client-source.html', 'utf8', fsCallback);
        break;
		case '/pdf':
            fs.readFile(__dirname + '/static/pdf.html', 'utf8', fsCallback);
        break;
		case '/favicon':
            fs.readFile(__dirname + '/static/favicon.ico', 'utf8', fsCallback);
        break;
		case '/jquery.js':
            fs.readFile(__dirname + '/static/js/jquery-3.5.1.min.js', 'utf8', fsCallback);
        break;
		case '/bootstrap.css':
             fs.readFile(__dirname + '/static/css/bootstrap.min.css', 'utf8', fsCallback);
        break;
		case '/bootstrap.js':
            fs.readFile(__dirname + '/static/js/bootstrap.min.js', 'utf8', fsCallback);
        break;
		case '/compressor.js':
			fs.readFile(__dirname + '/node_modules/compressorjs/dist/compressor.js', 'utf8', fsCallback);
		break;
        case '/html5-qrcode.min.js':
            fs.readFile(__dirname + '/static/js/html5-qrcode.min.js', 'utf8', fsCallback);
        break;
        case '/keepalive':
            fs.readFile(__dirname + '/static/keepalive.txt', 'utf8', fsCallback);
        break;
        case '/server.js':
            fs.readFile(__dirname + '/static/js/server.js', 'utf8', fsCallback);
        break;
        case '/client.js':
            fs.readFile(__dirname + '/static/js/client.js', 'utf8', fsCallback);
        break;
        case '/server-dev.js':
            fs.readFile(__dirname + '/static/js/server-dev.js', 'utf8', fsCallback);
        break;
        case '/client-dev.js':
            fs.readFile(__dirname + '/static/js/client-dev.js', 'utf8', fsCallback);
        break;
        case '/server.css':
            fs.readFile(__dirname + '/static/css/server.css', 'utf8', fsCallback);
        break;
        case '/client.css':
            fs.readFile(__dirname + '/static/css/client.css', 'utf8', fsCallback);
        break;
        case '/server-dev.css':
            fs.readFile(__dirname + '/static/css/server-dev.css', 'utf8', fsCallback);
        break;
        case '/client-dev.css':
            fs.readFile(__dirname + '/static/css/client-dev.css', 'utf8', fsCallback);
        break;
        case '/dev.js':
            fs.readFile(__dirname + '/static/js/dev.js', 'utf8', fsCallback);
        break;
        case '/papertrail':
            collectRequestData(req, result => {
                console.log(`Response from ${result['room']} with message '${result['msg']}'`);
            });
            fsCallback(null,`Confirmation of receiving, timestamp: ${Math.floor(+new Date() / 1000)}`);
        break;
        default:
            /* doc = */ fs.readFile(__dirname + '/static/index.html', 'utf8', fsCallback);
        break;
    }
	
}).listen(PORT);

// Initialize Socket.io and its variables
const io = require('socket.io').listen(server,{pingInterval: 5000,pingTimeout: 60000,autoConnect: true});

// Register "connection" events to the WebSocket
io.on("connection", function(socket) {

    // Register "server" events sent by server ONLY
    socket.on("server", (data, room) => {
        // check for sent data
        switch (data) {
            case "isOnline":
                console.log(`Received "isOnline" packet, updating ${room} record on host side.`);
                // Do room check here to see if duplication exist
                rooms.setServerOnline(room);
                // check if connection is dropped, method 1
                if (socket.disconnected) {
                    console.log(`Server side of ${room} disconnected, updating ${room} record.`);
                    rooms.setServerOffline(room);
                }
                socket.on('disconnect', function (reason) {
                    console.log(`Socket for ${room} disconnected, updating ${room} record. Reason:${reason}`);
                    rooms.setServerOffline(room);
                });
                break;
            case "keepAlive":
                rooms.setServerOnline(room);
                break;
            default:
                //Do nothing
                break;
        }
    });

    // Register "client" events sent by client ONLY
    socket.on("client", (data, room, callback) => {
        room =  room.trim();
        console.log(`Received request from client side.`);
        if(room === undefined|| room === '') {
            callback({serverIsOnline:'error'});
            return false;
        }
        // check for sent data
        switch (data) {
            case "check":
                console.log(`Determined request type.`);
                rooms.getStateOfServer(room).then(res => {
                    console.log(`Returned value for ${room}: ${JSON.stringify(res)}.`);
                        if (res === 'online') {
                            console.log(`Parse request to server side of ${room}.`);
                            socket.broadcast.to(room).emit("status", data);
                            callback({serverIsOnline:'true'});
                        }
                        if (res === 'offline') {
                            console.log(`Server side ${room} offline. Return callback data.`);
                            callback({serverIsOnline:'false'});
                        }
                        if (res === 'error') {
                            console.log(`Queried ${room} doesn't exist, please check again.`);
                            callback({serverIsOnline:'error'});
                        }
                }).catch(err => {
                    console.log(`Unknown error occurred. Data: ${data}, RoomID: ${room}, ErrMsg:${err}.`);
                    callback({serverIsOnline:'error'});
                });
                break;
            default:
                break;
        }
    });

    // Handle and broadcast "status" events
    socket.on("status", (data, room) => {
        room =  room.trim();
        console.log(`Parsing status..`)
        socket.broadcast.to(room).emit("status", data);
    });

    // Register "join" events, requested by a connected client
    socket.on("join", function (room) {
        room =  room.trim();
        // join channel provided by client
        socket.room = room;
        socket.join(room);
    });

    // Register "leave" events, sent by phone side
    socket.on("leave", function (room) {
        // leave the current room
        socket.leave(room);
    });

    //Spare disconnect function to reset room status
    socket.on("disconnect", function (room) {
        console.log(`Room ${room} disconnected.`);
    })

    // Register "recvimage" events, a newer function sent by the client
    socket.on("recvimage", (data, room, callback) => {
        // Broadcast the "transimage" event to all server side in the room
        socket.broadcast.to(room).emit("transimage", data);
        // Return success msg
        console.log(`Broadcasting image to ${room}`);
        callback({isSuccess: true});
    });

    //re-writing whole structure into proper function object
    var rooms = {
        setServerOnline : async function(val) {
            try {
                //sample command: INSERT INTO availableroom (room_id, server, client) VALUES ('abCDe12345', 'online', 'N/A');
                client.query(`INSERT INTO public.availableroom (room_id, server, client) VALUES ('${val}', 'online', 'N/A');`, (err, res) => {
                    if (err) {
                        client.query(`UPDATE public.availableroom SET server = 'online' WHERE room_id='${val}';`, (err, res) => {
                        if (err) console.log(err);
                        console.log(JSON.stringify(res.rowCount));
                        });
                    }
                    console.log(JSON.stringify(res.rowCount));
                });
            } catch (err) {
                console.log(err);
            }
            console.log(`Record of ${val} updated to True.`);
        },
        setServerOffline : async function(val) {
            let query = client.query(`UPDATE public.availableroom SET server = 'offline' WHERE room_id='${val}';`);
            let result = await query;
            console.log(`Record of ${val} updated to False, result = ${JSON.stringify(result.rowCount)}`);
            return await result.rowCount;
        },
        getStateOfServer : async function(val) {
            console.log(`Querying data from postgres for room ${val}.`);
            //sample command: SELECT server FROM public.availableroom WHERE room_id='abCDe12345';
            let query = client.query(`SELECT server FROM public.availableroom WHERE room_id='${val}';`);
            let result = await query;
            return await result.rows[0].server.trim();
        }

    }

})

function collectRequestData(request, callback) {
    const CONTENT_TYPE = 'application/json';
    if(request.headers['content-type'] === CONTENT_TYPE) {
        let body = '';
        request.on('data', chunk => {
            body += chunk.toString();
        });
        request.on('end', () => {
            callback(JSON.parse(body));
        });
    }
    else {
        callback(null);
    }
}

function saveImageTrigger() {
    //To execute if triggered by socket.emit('save')
    //Once triggered, check (condition) continuously until (condition) met
}



console.log("InstantPhoto had started!");

//Set all room to offline upon exit
process.on('SIGTERM', () => {
    server.close(() => {
      console.log('Server terminated');
    })
    //Iterate over existing room_id-s
    client.query('SELECT room_id FROM availableroom;', function(err, result) {
        done(err);
  
        if(err) {
            //Will truncate all data inside table if failed to get room_id
            client.query('TRUNCATE TABLE availableroom;');
            return console.error('Error occured. Error msg:', err);
        }
  
        forEach(result.rows, (row) => {
          client.query(`UPDATE public.availableroom SET server = 'offline' WHERE room_id='${row.room_id}';`, function(err, result) {
            done(err);
  
            if(err) {
              return console.error('Unable to reset room, Error msg:', err);
            }
          });
        });
      });
    });

/*
//required only if running on local machine
var os = require( 'os' );
var networkInterfaces = os.networkInterfaces( );
var arr = networkInterfaces['Ethernet']
var ip = arr[1].address;
console.log("Server IP:",ip);
*/
//var opn = require('opn');
// specify the app to open in 
//opn('http://localhost/pc', {app: 'chrome'});
