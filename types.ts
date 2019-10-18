
interface ContactableConfig {
    type: string
	id: string
	name?: string
}

interface Statement {
	text: string
}

interface Option {
	triggers: string[],
	text: string
}

interface RegisterConfig {
	stage: string
	isFacilitator: boolean
	processContext: string
	maxTime: number
	maxParticipants: number | string
}

/*
interface Reaction {
	statement
}
*/

export {
	ContactableConfig,
	Statement,
	Option,
	RegisterConfig
}