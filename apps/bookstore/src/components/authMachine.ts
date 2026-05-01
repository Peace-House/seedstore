import { createMachine, assign } from 'xstate'

interface AuthContext {
  email: string
  phcode: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  countryOfResidence: string
  stateOfResidence: string
  gender: string
  dateOfBirth: string
  error?: string
  phCodeFromSignup?: string
}

type AuthEvent =
  | { type: 'SWITCH_TO_LOGIN' }
  | { type: 'SWITCH_TO_SIGNUP' }
  | { type: 'UPDATE_FIELD'; field: string; value: string }
  | { type: 'SUBMIT' }
  | { type: 'SUCCESS'; phcode?: string }
  | { type: 'FAIL'; error: string }

export const authMachine = createMachine(
  {
    id: 'auth',

    types: {} as {
      context: AuthContext
      events: AuthEvent
    },

    initial: 'login',

    context: {
      email: '',
      phcode: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      countryOfResidence: '162',
      stateOfResidence: '',
      gender: '',
      dateOfBirth: '',
    },

    states: {
      login: {
        on: {
          SWITCH_TO_SIGNUP: { target: 'signup' },
          UPDATE_FIELD: { actions: 'updateField' },
          SUBMIT: { target: 'loggingIn' },
        },
      },

      signup: {
        on: {
          SWITCH_TO_LOGIN: { target: 'login' },
          UPDATE_FIELD: { actions: 'updateField' },
          SUBMIT: { target: 'registering' },
        },
      },

      loggingIn: {
        invoke: {
          src: 'loginUser',
          onDone: { target: 'successLogin' },
          onError: {
            target: 'login',
            actions: 'setError',
          },
        },
      },

      registering: {
        invoke: {
          src: 'registerUser',
          onDone: {
            target: 'successSignup',
            actions: 'setSignupPhcode',
          },
          onError: {
            target: 'signup',
            actions: 'setError',
          },
        },
      },

      successSignup: {
        on: {
          SWITCH_TO_LOGIN: { target: 'login' },
        },
      },

      successLogin: {
        type: 'final',
      },
    },
  },
  {
    actions: {
      updateField: assign({
        ...(ctx, event) => ({
          // @ts-ignore (dynamic key assignment)
          [event.field]: event.value,
        }),
      }),

      setError: assign({
        error: (_, event: any) =>
          event?.error?.message || 'Something went wrong',
      }),

      setSignupPhcode: assign({
        phCodeFromSignup: (_, event: any) => event.output?.user?.phcode || '',
      }),
    },
  },
)
