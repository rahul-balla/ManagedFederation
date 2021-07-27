const axios = require('axios');

async function retrieveServiceList() {
	let serviceDetails = [];
	var config = {
		method: 'get',
		url: 'http://localhost:8080/api/artifacts/',
	};
	await axios(config)
		.then((res) => {
			let availableServices = res.data;
			console.log('\nlist of services are ', availableServices, '\n');

			availableServices.map(async (service) => {
				let requestDetails = {
					method: 'get',
					url: `http://localhost:8080/api/artifacts/${service}`,
				};

				await axios(requestDetails)
					.then((response) => {
						serviceDetails.push(response.data);
						// console.log('\nservice definitions are ', serviceDetails, '\n');
					})
					.catch((error) => {
						console.log('Reason for error ', error.message);
					});
				return serviceDetails;
			});
		})
		.catch((error) => {
			console.log('sample-graph-1 error ', error.message);
			// return services;
		});

	// console.log('\nservice definitions are ', serviceDetails, '\n');
	return serviceDetails;
}

module.exports = { retrieveServiceList };
