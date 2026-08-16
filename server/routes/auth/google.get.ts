export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    if (!isAllowedEmail(user.email)) {
      return sendRedirect(event, '/?error=unauthorized')
    }
    await setUserSession(event, {
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        avatar: user.picture,
      },
    })
    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/')
  },
})
