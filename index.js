const express = require('express');  
const fs = require('fs');  
const path = require('path');  
const cors = require('cors');  

const app = express();  
app.use(express.json());  
app.use(cors());  
app.use(express.static('public')); // Serve static files  

const commandsPath = path.join(__dirname, 'api');  
const commands = [];  

// Load all commands automatically  
fs.readdirSync(commandsPath).forEach(file => {  
    if (file.endsWith('.js')) {  
        try {  
            const command = require(`./api/${file}`);  

            if (!command.name || !command.handler) {  
                throw new Error(`Missing required properties in ${file}`);  
            }  

            const route = command.route || `/${command.name}`;  
            const method = command.method?.toLowerCase() || 'get';  

            app[method](route, command.handler);  

            commands.push({  
                name: command.name,  
                category: command.category || "uncategorized",  
                route: route,  
                method: method.toUpperCase(),  
                usage: command.usage || "No usage information provided."  
            });  

            console.log(`✅ Loaded command: ${command.name} (Route: ${route}, Method: ${method.toUpperCase()})`);  
        } catch (error) {  
            console.error(`❌ Error loading ${file}: ${error.message}`);  
        }  
    }  
});  

// Serve `index.html` for root `/`
app.get('/', (req, res) => {  
    res.sendFile(path.join(__dirname, 'public', 'index.html'));  
});

app.get('/shoti', (req, res) => {  
    res.sendFile(path.join(__dirname, 'public', 'shoti.html'));  
});

// API to get the list of all commands  
app.get('/api/list', (req, res) => {  
    res.json(commands);  
});  

// Export the app for Vercel  
module.exports = app;