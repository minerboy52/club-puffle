var express = require('express');
var app = express();
var serv = require('http').Server(app);

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');

var adapter = new FileSync('db.json');
var db = low(adapter);

db.read();
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(3000);
console.log("Server started.");
 
var SOCKET_LIST = {};

db.defaults({accounts: []}).write(); 
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    socket.x = 300;
    socket.y = 300;
    socket.number = "" + Math.floor(10 * Math.random());
    socket.loggedIn = false;
    SOCKET_LIST[socket.id] = socket;
	socket.army = undefined;
	socket.username = undefined;
	socket.color = undefined;
	socket.item = undefined;
	socket.server = undefined;
	socket.place = undefined;
	socket.message = "";
    io.sockets.emit('addPlayer', {
        id: socket.id,
        x: socket.x,
        y: socket.y, 
    });
 
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
    });
   
    socket.on('keyPress', function(data) {
        if(data.keyLeft) socket.x -= 8;
        if(data.keyRight) socket.x += 8;
        if(data.keyDown) socket.y += 8;
        if(data.keyUp) socket.y -= 8;
    });
	
	socket.on('requestLogin', function(data) {
		var user = data.username;
		var pass = data.passwd;
		var ide = data.id;
		
		var s = db.get('accounts').find({username: user, passwd: pass}).value();
		
		if(s != undefined)
		if(s.username == user && s.passwd == pass) {
			socket.emit('permitLogin', {id: ide, username: user, passwd: pass});
			socket.loggedIn = true;
			socket.username = user;
			socket.army = s.army;
			socket.color = s.color;
			socket.item = s.item;
			socket.server = s.server;
			socket.place = s.place;
		}
	});
	
	socket.on('message', function(data) {
		socket.message = data.value;
		console.log(data.id + " said " + data.value);
	});
});
 
setInterval(function(){
    var pack = [];
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
		
		if(socket.x < 0) socket.x = 0;
		if(socket.y < 0) socket.y = 0;
		if(socket.x > 500 - 32) socket.x = 500 - 32;
		if(socket.y > 500 - 32) socket.y = 500 - 32;
		
        pack.push({
            x:socket.x,
            y:socket.y,
            number:socket.number,
            id:socket.id,
            loggedIn:socket.loggedIn,
			username:socket.username,
			army:socket.army,
			color:socket.color,
			item:socket.item,
			server:socket.server,
			place:socket.place,
			message:socket.message,
        });    
    }
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
},1000/25);