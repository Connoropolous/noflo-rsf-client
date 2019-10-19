
const VIEWS = {
  INDEX: 'index',
  REGISTER: 'register',
  TEMPLATE: 'template',
  PROCESS: 'process'
}

const URLS = {
  DEV: {
    REGISTER: '/dev-register',
  },
  INDEX: '/',
  REGISTER: '/register',
  HANDLE_REGISTER: pre => `${pre}/new-participant`,
  TEMPLATE: '/template/:templateId',
  HANDLE_TEMPLATE: '/handle_template',
  PROCESS: '/process/:processId'
}

const EVENTS = {
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

export {
  VIEWS,
  URLS,
  EVENTS
}