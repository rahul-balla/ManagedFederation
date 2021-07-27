const express = require('express');
const bodyParser = require('body-parser');
const { buildFederatedSchema } = require('@apollo/federation');
const axios = require('axios');
const { ApolloServer } = require('apollo-server-express');
const CustomGateway = require('./custom_gateway');

const app = express();
app.use(bodyParser.json());

const gateway = new CustomGateway({
	serviceList: [],
	debug: true,
	// experimental_pollInterval: 10000,
});

const server = new ApolloServer({
	gateway,
	subscriptions: false,
	debug: true,
});

server.applyMiddleware({ app });

app.get('/reload-schema', async () => {
	console.log('\nStart reloading GraphQL schema...\n');
	await gateway.load();
	console.log('\nCompleted reloading GraphQL schema\n');
});

app.post('/send-event', (req, res) => {
	console.log('\nEvent sent-- ', req.body);
	// res.send(req);
});

app.listen(5000, () => {
	console.log('Gateway is running at port 5000');
});
