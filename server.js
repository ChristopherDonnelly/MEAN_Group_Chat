var express = require( "express");
var path = require( "path");

// Create the express app.
var app = express();

// Define the static folder.
app.use(express.static(path.join(__dirname, "./static")));

// Setup ejs templating and define the views folder.
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

// Root route to render the index.ejs view.
app.get('/', function(req, res) {
    res.render("index");
});

var server = app.listen(8000, function() {
    console.log("listening on port 8000");
});

//var io = require('socket.io').listen(server);
var io = require('socket.io', { 
    rememberTransport: false, 
    transports: ['WebSocket', 'Flash Socket', 'AJAX long-polling'] 
}).listen(server);

var users = [];
var global_messages = [];

function findUser(socket_id){
    return users.find( user => user.id === socket_id );
}

function createPrivateId(id1, id2){
    let privateId = id1.substring(0, (id1.length/2)) + id2.substring((id2.length/2), id2.length);
    return privateId;
}

io.sockets.on('connection', function(socket) {
    console.log("Client/socket is connected!");
    console.log("Client/socket id is: ", socket.id);

    socket.on("enter_chat", function(user){
        
        console.log(user.name + ' entered chat!')
        
        socket.emit("successful_login", { name: user.name });
        
        socket.emit("load_all_users", { users: users });

        socket.emit("global_message", { message: `<span class="green">*** <strong><em>System<em></strong>: You have entered Global chat as ${user.name}! ***</span>` });

        socket.emit("load_all_messages", { messages: global_messages });

        socket.broadcast.emit("global_message", { message: `<span class="green">*** <strong><em>System<em></strong>: ${user.name} entered chat! ***</span>` });

        let user_obj = {
            id: socket.id,
            name: user.name,

        }
        users.push(user_obj);

        socket.broadcast.emit("user_joined", user_obj);
    });

    socket.on("init_private", function(data){
        let user = findUser(data.id);
        let privateId = createPrivateId(data.id, socket.id);

        console.log("Init private chat with: "+user.name);
        console.log('Private ID: ' + privateId)

        if(io.sockets.connected[data.id]) {
            io.sockets.connected[data.id].emit('request_private_join', { join_id: socket.id });
        }
    });

    socket.on("reset_users", function(){
        users.length = 0;
    });

    socket.on("submit_global_message", function(data){
        let user = findUser(socket.id);

        console.log(user.name+' sent message: '+data.message);

        global_messages.push('<strong>' + user.name + '</strong>: '+ data.message);

        console.log(global_messages)

        io.emit("global_message", { message: '<strong>' + user.name + '</strong>: '+ data.message} );

    });

    socket.on('disconnect', function() {
        let result = findUser(socket.id); //users.find( user => user.id === socket.id );

        result = (result)?result:'';

        for(var i=0; i<users.length; i++){
            if(users[i].id === socket.id) users.splice(i, 1);
        }

        if(result!='') console.log(result.name + ' got disconnect!');

        // console.log(users);

        socket.broadcast.emit("global_message", { message: `<span class="red">*** <strong><em>System</em></strong>: ${result.name} left chat! ***</span>` });

        socket.broadcast.emit('remove_user', result);
     });

});