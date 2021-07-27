const { buildFederatedSchema } = require('@apollo/federation');
const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const axios = require('axios');

const app = express();
const serviceName = 'sample-graphql-2';
const hostedURL = 'http://localhost:3000/graphql';

const typeDefs = gql`
	type Query {
		world: String
	}
`;

typeDefs.toString = function () {
	return this.loc.source.body;
};

const resolvers = {
	Query: {
		world: () => 'World!',
	},
};

const server = new ApolloServer({
	schema: buildFederatedSchema({ typeDefs, resolvers }),
});

server.applyMiddleware({ app });

app.listen({ port: 3000 }, () => {
	console.log(`Server 2 is ready at http://localhost:3000`);
});

(async () => {
	try {
		var data = {
			name: serviceName,
			url: hostedURL,
			schema: typeDefs.toString(),
		};

		// GET request to see if the service exists in the schema registry
		var config = {
			method: 'get',
			url: `http://localhost:8080/api/search/artifacts?search=${serviceName}`,
			headers: {
				'Content-type': 'application/json; artifactType=GRAPHQL',
				'X-Registry-ArtifactId': `${serviceName}`,
			},
		};

		axios(config)
			.then(function (response) {
				console.log('count value is ', response.data.count);

				// The count variable says how many services of this name are present in the schema registry.
				// count = 0 if the service HAS NOT been registered
				// count = 1 if the service HAS been registered

				let count = response.data.count;

				// POST request to register a new service with the schema registry
				if (count === 0) {
					console.log('inside new service condition');
					var config = {
						method: 'post',
						url: 'http://localhost:8080/api/artifacts/',
						headers: {
							'Content-type': 'application/json; artifactType=GRAPHQL',
							'X-Registry-ArtifactId': `${serviceName}`,
						},
						data: data,
					};

					axios(config)
						.then((res) => {
							console.log('\nNew Service schema stored!!!\n');
						})
						.catch((error) => {
							console.log('Schema creation problem: ', error.message);
						});
				}

				// PUT request to update the schema if the service already exists
				else {
					var config = {
						method: 'put',
						url: `http://localhost:8080/api/artifacts/${serviceName}`,
						headers: {
							'Content-type': 'application/json; artifactType=GRAPHQL',
							'X-Registry-ArtifactId': `${serviceName}`,
						},
						data: data,
					};

					axios(config)
						.then((res) => {
							if (res.status === 200) {
								console.log('\nsending signal to gateway\n');
								var reloadGatewayConfig = {
									method: 'get',
									url: 'http://localhost:5000/reload-schema',
								};
								axios(reloadGatewayConfig)
									.then((res) => {
										console.log('\nreturned response from gateway\n');
									})
									.catch((error) => {
										console.log(error.message);
									});
								console.log('\nSchema has been updated!!!\n');
							}
						})
						.catch((error) => {
							console.log('Schema creation problem: ', error.message);
						});
				}
			})
			.catch(function (error) {
				console.log(error);
			});
	} catch (err) {
		console.error(`Schema registration failed: ${err.message}`);
	}
})();
