module.exports = {
	VIEWS: {
		REGISTER: 'register'
	},
	URLS: {
		DEV: {
			REGISTER: '/dev-register'
		},
		REGISTER: '/register',
		HANDLE_REGISTER: pre => `${pre}/new-participant`,
		RUN_GRAPH: '/handle'
	},
	EVENTS: {
		RECEIVE: {
			PARTICIPANT_REGISTER: 'participant_register'
		},
		SEND: {
			PARTICIPANT_REGISTER_URL: 'participant_register_url',
			PARTICIPANT_REGISTER_RESULTS: 'participant_register_results'
		}
	}
}