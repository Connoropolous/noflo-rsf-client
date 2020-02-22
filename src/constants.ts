const VIEWS = {
  REGISTER: 'register',
  REGISTERED: 'registered'
}

const URLS = {
  DEV: {
    REGISTER: '/dev-register',
    HANDLE_REGISTER: '/handle-dev-register'
  },
  REGISTER: (id: string) => `/register/${id}`,
  HANDLE_REGISTER: (pre: string) => `${pre}/new-participant`,
  REGISTERED: '/registered'
}

const EVENTS = {
  /* INBOUND */
  //  initial creation
  PARTICIPANT_REGISTER: 'participant_register',
  // commence/open
  OPEN_REGISTER: 'open_register',
  /* OUTBOUND */
  // error
  NO_REGISTER_WITH_ID: 'no_register_with_id',
  // final / sum
  PARTICIPANT_REGISTER_RESULTS: 'participant_register_results',
  // each individual
  PARTICIPANT_REGISTER_RESULT: 'participant_register_result'
}

export { VIEWS, URLS, EVENTS }
