// Import packages
const fs = require('fs');
const http=require('http');
const url=require('url');
const {Client} = require('pg'); //Postgres
//const monitorio = require('monitor.io'); // Monitoring each socket connection if possible, ref 'https://drewblaisdell.github.io/monitor.io/'

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
        case '/server.css':
            fs.readFile(__dirname + '/static/css/server.css', 'utf8', fsCallback);
            break;
        case '/client.css':
            fs.readFile(__dirname + '/static/css/client.css', 'utf8', fsCallback);
            break;
        case '/dev.js':
            fs.readFile(__dirname + '/static/js/dev.js', 'utf8', fsCallback);
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
                roomFunc('setOnline', room);
                // check if connection is dropped, method 1
                if (socket.disconnected) {
                    console.log(`Server side of ${room} disconnected, updating ${room} record.`);
                    roomFunc('setOffline', room);
                }
                socket.on('disconnect', function (reason) {
                    console.log(`Socket for ${room} disconnected, updating ${room} record. Reason:${reason}`);
                    roomFunc('setOffline', room);
                });
                break;
            case "keepAlive":
                roomFunc('setOnline', room);
                break;
            default:
                //Do nothing
                break;
        }
    });

    // Register "client" events sent by client ONLY
    socket.on("client", (data, room, callback) => {
        console.log(`Received request from client side.`);
        if(room === undefined|| room === '') {
            callback({serverIsOnline:'error'});
            return false;
        }
        // check for sent data
        switch (data) {
            case "check":
                console.log(`Determined request type.`);
                roomFunc('getStateOfServer', room).then(res => {
                    console.log(`Returned value for ${room}: ${res}.`);
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
        console.log(`Parsing status..`)
        socket.broadcast.to(room).emit("status", data);
    });

    // Register "join" events, requested by a connected client
    socket.on("join", function (room) {
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
        roomFunc('setOffline', room);
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

    async function roomFunc(func, val) {
        return new Promise((resolve, reject) => {
            switch (func) {
                case "setOnline":
                    try {
                        //sample command: INSERT INTO availableroom (room_id, server, client) VALUES ('abCDe12345', 'online', 'N/A');
                        client.query(`INSERT INTO public.availableroom (room_id, server, client) VALUES ('${val}', 'online', 'N/A');`, (err, res) => {
                            if (err) {
                                client.query(`UPDATE public.availableroom SET server = 'online' WHERE room_id='${val}';`, (err, res) => {
                                    if (err) return reject(console.log(err));
                                    resolve(res);
                                });
                            }
                            resolve(res);
                        });
                    } catch (err) {
                        reject(err);
                    }
                    console.log(`Record of ${val} updated to True.`);
                    break;
                case "setOffline":
                    client.query(`UPDATE public.availableroom SET server = 'offline' WHERE room_id='${val}';`, (err, res) => {
                        if (err) return reject(console.log(err));
                        resolve(res);
                    });
                    break;
                case "getStateOfServer":
                    console.log(`Querying data from postgres for room ${val}.`);
                    //sample command: SELECT server FROM public.availableroom WHERE room_id='abCDe12345';
                    client.query(`SELECT server FROM public.availableroom WHERE room_id='${val}';`, (error, result) => {
                        if (error) reject(console.log(error));
                        //console.log(`Raw result from postgres:`,result);
                        try {
                            let query = result.rows[0].server;
                            resolve(query.trim());
                        } catch(err) {
                            reject(err);
                        }
                    });
                    break;
                default:
                    console.log(`Error occurred. Data:${func}, RoomID:${val}`);
            }
        });
    }

})


console.log("InstantPhoto had started!");

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
