module.exports = {
	VIEWS: {
		REGISTER: 'register',
		RUN_GRAPH: 'run_graph'
	},
	URLS: {
		DEV: {
			REGISTER: '/dev-register'
		},
		REGISTER: '/register',
		HANDLE_REGISTER: pre => `${pre}/new-participant`,
		RUN_GRAPH: '/',
		HANDLE_RUN_GRAPH: '/handle' // TODO: change this
	},
	EVENTS: {
		RECEIVE: {
			PARTICIPANT_REGISTER: 'participant_register'
		},
		SEND: {
			// registration endpoint
			PARTICIPANT_REGISTER_URL: 'participant_register_url',
			// final / sum
			PARTICIPANT_REGISTER_RESULTS: 'participant_register_results',
			// each individual
			PARTICIPANT_REGISTER_RESULT: 'participant_register_result'
		}
	}
}