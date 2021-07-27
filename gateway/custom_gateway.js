const { ApolloGateway } = require('@apollo/gateway');
const { parse } = require('graphql');
const { retrieveServiceList } = require('./poll-registry');
const { gql } = require('apollo-server-express');
const { composeAndValidate } = require('@apollo/federation');
const { default: axios } = require('axios');

class CustomGateway extends ApolloGateway {
	constructor(...args) {
		super(...args);

		// console.log('service list retrieved is ', retrieveServiceList());

		this.serviceDefinitionsCache = [
			{
				name: 'Internal Error',
				url: 'Internal Error',
				typeDefs: parse(`type InternalError { message: String! } extend type Query { internalError: InternalError}`),
			},
		];
	}

	async loadServiceDefinitions() {
		try {
			let schemasRetrieved = await this.getServiceSchemas();
			// console.log('schemas retrieved ', schemasRetrieved.serviceDefinitions.typeDefs);
			return schemasRetrieved;
		} catch (error) {
			console.log(`Polling schema failed because ${error.message}`);
		}
	}

	async getServiceSchemas() {
		let isNewSchema = false;

		const availableServices = await this.getAvailableServices();
		// console.log('\navailable services are ', availableServices, '\n');
		const schemaList = await this.getSchemas(availableServices);
		console.log('\nfirst service schema ', schemaList, '\n');

		this.config.serviceList = [];
		schemaList.map((currentSchema) => {
			let obj = {
				name: currentSchema.name,
				url: currentSchema.url,
				typeDefs: currentSchema.schema,
			};
			console.log('\ncurrentSchema is ', obj.typeDefs, '\n');
			this.config.serviceList.push(obj);
		});

		console.log('\nconfig.serviceList is ', this.config.serviceList, '\n');

		// console.log('service list is ', this.config.serviceList);

		const serviceDefinitions = this.config.serviceList.map((service) => {
			// console.log('current service is ', service);
			const previousDefinition = this.serviceSdlCache.get(service.name);
			if (previousDefinition !== service.typeDefs) {
				isNewSchema = true;
			}

			this.serviceSdlCache.set(service.name, service.typeDefs);

			return {
				...service,
				typeDefs: parse(service.typeDefs),
			};
		});

		if (validateSchema(serviceDefinitions)) {
			this.serviceDefinitionsCache = serviceDefinitions;
		}

		return {
			// serviceDefinitions: this.serviceDefinitionsCache,
			serviceDefinitions: serviceDefinitions,
			isNewSchema,
		};
	}

	async getAvailableServices() {
		let availableServices = [];
		var config = {
			method: 'get',
			url: 'http://localhost:8080/api/artifacts/',
		};

		await axios(config)
			.then((res) => {
				availableServices = res.data;
			})
			.catch((error) => {
				console.log('\nError message is ', error.message, '\n');
			});

		return availableServices;
	}

	async getSchemas(listOfServices) {
		let schemaDetails = [];

		for (const service of listOfServices) {
			let requestDetails = {
				method: 'get',
				url: `http://localhost:8080/api/artifacts/${service}`,
			};

			await axios(requestDetails)
				.then((response) => {
					schemaDetails.push(response.data);
					// console.log('\nservice definitions are ', schemaDetails, '\n');
				})
				.catch((error) => {
					console.log('Reason for error ', error.message);
				});
		}
		return schemaDetails;
	}
}

function validateSchema(serviceList) {
	let schema, errors;

	try {
		({ schema, errors } = composeAndValidate(serviceList));
		// console.log('validate schema ', schema);
	} catch (error) {
		errors = [error];
	}

	if (errors && errors.length) {
		console.error('Schema validation failed, falling back to previous schema', {
			errors: JSON.stringify(errors),
			serviceList,
		});

		return null;
	}

	return schema;
}

module.exports = CustomGateway;
