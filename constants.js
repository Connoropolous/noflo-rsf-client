module.exports = {
	VIEWS: {
		REGISTER: 'register',
		CONFIGURE_1: 'configure_1',
		CONFIGURE_2: 'configure_2'
	},
	URLS: {
		DEV: {
			REGISTER: '/dev-register',
		},
		REGISTER: '/register',
		HANDLE_REGISTER: pre => `${pre}/new-participant`,
		CONFIGURE_1: '/',
		HANDLE_CONFIGURE_1: '/handle_configure_1',
		CONFIGURE_2: '/configure/:processId'
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