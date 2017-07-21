import React from 'react'
import {graphql, gql, withApollo, compose} from 'react-apollo'
import cookie from 'cookie'

import {homeRoutes} from '../../utils/routes/routes-definitions'

import withData from '../../utils/apollo/with-data'
import MainLayout from '../../components/layouts/main'
import redirect from '../../utils/apollo/redirect'
import checkLoggedIn from '../../utils/apollo/check-logged-in'
import SignUpContent from '../../src/auth/sign-up'

class CreateAccount extends React.Component {
  static async getInitialProps(context, apolloClient) {
    const {loggedInUser} = await checkLoggedIn(context, apolloClient)

    if (loggedInUser.user) {
      // Already signed in? No need to continue.
      // Throw them back to the main page
      redirect(context, homeRoutes.home)
    }

    return {}
  }

  render() {
    return (
      <MainLayout>
        <SignUpContent {...this.props} />
      </MainLayout>
    )
  }
}

export default compose(
  // withData gives us server-side graphql queries before rendering
  withData,
  // withApollo exposes `this.props.client` used when logging out
  withApollo,
  graphql(
    // The `createUser` & `signinUser` mutations are provided by graph.cool by
    // default.
    // Multiple mutations are executed by graphql sequentially
    gql`
      mutation Create($name: String!, $email: String!, $password: String!) {
        createUser(name: $name, authProvider: { email: { email: $email, password: $password }}) {
          id
        }
        signinUser(email: { email: $email, password: $password }) {
          token
        }
      }
    `,
    {
      // Use an unambiguous name for use in the `props` section below
      name: 'createWithEmail',
      // Apollo's way of injecting new props which are passed to the component
      props: ({
        createWithEmail,
        // `client` is provided by the `withApollo` HOC
        ownProps: {client}
      }) => ({
        // `create` is the name of the prop passed to the component
        create: (event) => {
          /* global FormData */
          const data = new FormData(event.target)

          event.preventDefault()
          event.stopPropagation()

          createWithEmail({
            variables: {
              email: data.get('email'),
              password: data.get('password'),
              name: data.get('name')
            }
          }).then(({data: {signinUser: {token}}}) => {
            // Store the token in cookie
            document.cookie = cookie.serialize('token', token, {
              maxAge: 30 * 24 * 60 * 60 // 30 days
            })

            // Force a reload of all the current queries now that the user is
            // logged in
            client.resetStore().then(() => {
              // Now redirect to the homepage
              redirect({}, homeRoutes.home)
            })
          })
            .catch((error) => {
              // Something went wrong, such as incorrect password, or no network
              // available, etc.
              console.error(error)
            })
        }
      })
    }
  )
)(CreateAccount)
